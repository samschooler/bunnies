import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ServerToDisplayEvents,
  PlayerInput
} from '@party-game/shared-types';
import { RoomManager } from './RoomManager.js';
import { SessionManager } from './SessionManager.js';
import { BaseGameState } from './BaseGameState.js';

export abstract class GameServer {
  protected io: Server<ClientToServerEvents, ServerToClientEvents>;
  protected roomManager: RoomManager;
  protected sessionManager: SessionManager;
  protected gameStates: Map<string, BaseGameState> = new Map();
  protected updateInterval: number = 1000 / 60; // 60fps
  protected updateLoops: Map<string, NodeJS.Timeout> = new Map();
  protected serverIp: string | null = null;

  constructor(io: Server, serverIp?: string) {
    this.io = io;
    this.serverIp = serverIp || null;
    this.roomManager = new RoomManager();
    this.sessionManager = new SessionManager();
    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  abstract createGameState(roomId: string): BaseGameState;

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on('room:create', () => this.handleRoomCreate(socket));
      socket.on('room:join', (roomCode, playerName) =>
        this.handleRoomJoin(socket, roomCode, playerName)
      );
      socket.on('session:validate', (sessionToken) =>
        this.handleSessionValidate(socket, sessionToken)
      );
      socket.on('input:update', (input) =>
        this.handleInputUpdate(socket, input)
      );
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  private handleRoomCreate(socket: Socket): void {
    const room = this.roomManager.createRoom(socket.id);
    const gameState = this.createGameState(room.roomId);
    this.gameStates.set(room.roomId, gameState);

    socket.join(room.roomId);
    socket.emit('room:created', {
      roomCode: room.roomCode,
      roomId: room.roomId,
      serverIp: this.serverIp || undefined
    });
    socket.emit('room:code', room.roomCode);

    this.startGameLoop(room.roomId);
    console.log(`Room created: ${room.roomCode} (${room.roomId})`);
  }

  private handleRoomJoin(socket: Socket, roomCode: string, playerName: string): void {
    const room = this.roomManager.getRoomByCode(roomCode);

    if (!room) {
      socket.emit('room:error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found'
      });
      return;
    }

    const gameState = this.gameStates.get(room.roomId);
    if (!gameState) {
      socket.emit('room:error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Game state not found'
      });
      return;
    }

    // Check if this is a display joining (not a player)
    const isDisplay = playerName.startsWith('__DISPLAY__');

    if (isDisplay) {
      // Display joining - don't create a player, just join the room as observer
      socket.join(room.roomId);
      (socket as any).roomId = room.roomId;
      (socket as any).isDisplay = true;

      socket.emit('room:joined', {
        playerId: '', // No player ID for displays
        sessionToken: '',
        playerData: null,
        roomCode: roomCode
      });

      socket.emit('room:code', roomCode);
      console.log(`Display joined room ${roomCode}`);
    } else {
      // Regular player joining
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const player = gameState.addPlayer(playerId, playerName);
      const session = this.sessionManager.createSession(playerId, roomCode);

      socket.join(room.roomId);
      (socket as any).playerId = playerId;
      (socket as any).roomId = room.roomId;

      this.roomManager.incrementPlayerCount(room.roomId);

      socket.emit('room:joined', {
        playerId,
        sessionToken: session.sessionToken,
        playerData: player.getState()
      });

      this.io.to(room.roomId).emit('player:joined', player.getState());
      console.log(`Player ${playerName} joined room ${roomCode}`);
    }
  }

  private handleSessionValidate(socket: Socket, sessionToken: string): void {
    // Extract room code from query params or handshake
    const roomCode = socket.handshake.query.roomCode as string;

    if (!roomCode) {
      socket.emit('session:invalid');
      return;
    }

    const result = this.sessionManager.validateSession(sessionToken, roomCode);

    if (!result.valid || !result.session) {
      socket.emit('session:invalid');
      return;
    }

    const room = this.roomManager.getRoomByCode(roomCode);
    const gameState = room ? this.gameStates.get(room.roomId) : null;

    if (!room || !gameState) {
      socket.emit('session:invalid');
      return;
    }

    const player = gameState.getPlayer(result.session.playerId);
    if (!player) {
      socket.emit('session:invalid');
      return;
    }

    socket.join(room.roomId);
    (socket as any).playerId = result.session.playerId;
    (socket as any).roomId = room.roomId;

    player.reconnect();

    socket.emit('session:validated', {
      playerId: result.session.playerId,
      playerData: player.getState()
    });

    console.log(`Session validated for player ${result.session.playerId}`);
  }

  private handleInputUpdate(socket: Socket, input: PlayerInput): void {
    const playerId = (socket as any).playerId;
    const roomId = (socket as any).roomId;

    if (!playerId || !roomId) return;

    const gameState = this.gameStates.get(roomId);
    if (gameState) {
      gameState.handleInput(playerId, input.data);
    }
  }

  private handleDisconnect(socket: Socket): void {
    const playerId = (socket as any).playerId;
    const roomId = (socket as any).roomId;

    if (playerId && roomId) {
      const gameState = this.gameStates.get(roomId);
      if (gameState) {
        const player = gameState.getPlayer(playerId);
        if (player) {
          player.disconnect();
          this.io.to(roomId).emit('player:left', playerId);
        }
      }
    }

    console.log(`Socket disconnected: ${socket.id}`);
  }

  private startGameLoop(roomId: string): void {
    let lastUpdate = Date.now();

    const loop = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdate;
      lastUpdate = now;

      const gameState = this.gameStates.get(roomId);
      if (!gameState) {
        clearInterval(loop);
        this.updateLoops.delete(roomId);
        return;
      }

      gameState.update(deltaTime);

      // Send delta updates (60fps)
      const delta = gameState.getDelta();
      if (delta) {
        this.io.to(roomId).emit('state:delta', delta);
      }

      // Send full state sync (1-2Hz)
      if (gameState.shouldSendFullSync()) {
        const fullState = gameState.getFullState();
        this.io.to(roomId).emit('state:full', fullState);
      }
    }, this.updateInterval);

    this.updateLoops.set(roomId, loop);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.roomManager.cleanupInactiveRooms();
      this.sessionManager.cleanupExpiredSessions();
    }, 60000); // Every minute
  }
}
