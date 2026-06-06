import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToDisplayEvents,
  GameState,
  StateDelta
} from '@party-game/shared-types';
import { StateBuffer } from './StateBuffer.js';

export abstract class BaseGameDisplay {
  protected socket: Socket<ServerToDisplayEvents, ClientToServerEvents>;
  protected roomCode: string | null = null;
  protected currentState: GameState | null = null;
  protected serverNetworkIp: string | null = null;
  protected stateBuffer: StateBuffer = new StateBuffer(50);

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);
    this.setupEventHandlers();
  }

  abstract onRoomCreated(roomCode: string): void;
  abstract onStateUpdate(state: GameState): void;
  abstract onPlayerJoined(player: any): void;
  abstract onPlayerLeft(playerId: string): void;

  private setupEventHandlers(): void {
    this.socket.on('room:created', (data) => {
      this.roomCode = data.roomCode;
      this.serverNetworkIp = data.serverIp || null;
    });

    this.socket.on('room:code', (roomCode) => {
      this.onRoomCreated(roomCode);
    });

    this.socket.on('room:joined', (data) => {
      this.roomCode = data.roomCode || this.roomCode;
      // When a display joins an existing room, trigger onRoomCreated with the room code
      if (this.roomCode) {
        this.onRoomCreated(this.roomCode);
      }
    });

    this.socket.on('room:error', (error) => {
      console.error('Room error:', error.message);
      alert(`Room error: ${error.message}`);
    });

    this.socket.on('state:full', (state) => {
      this.currentState = state;
      // Deep copy for buffer - state object may be mutated by delta
      this.stateBuffer.push(JSON.parse(JSON.stringify(state)));
      this.onStateUpdate(state);
    });

    this.socket.on('state:delta', (delta) => {
      if (this.currentState) {
        this.applyDelta(delta);
        // Deep copy for buffer - state object will be mutated by next delta
        this.stateBuffer.push(JSON.parse(JSON.stringify(this.currentState)));
        this.onStateUpdate(this.currentState);
      }
    });

    this.socket.on('player:joined', (player) => {
      this.onPlayerJoined(player);
    });

    this.socket.on('player:left', (playerId) => {
      this.onPlayerLeft(playerId);
    });
  }

  createRoom(): void {
    this.socket.emit('room:create');
  }

  joinRoom(roomCode: string): void {
    this.roomCode = roomCode;
    // Join as a display (observer) using a special display name
    this.socket.emit('room:join', roomCode, `__DISPLAY__${Date.now()}`);
  }

  private applyDelta(delta: StateDelta): void {
    if (!this.currentState) return;

    if (delta.players) {
      Object.keys(delta.players).forEach(playerId => {
        const playerDelta = delta.players![playerId];
        if (this.currentState!.players[playerId]) {
          this.currentState!.players[playerId] = {
            ...this.currentState!.players[playerId],
            ...playerDelta
          };
        } else {
          this.currentState!.players[playerId] = playerDelta as any;
        }
      });
    }

    if (delta.gameData) {
      this.currentState.gameData = {
        ...this.currentState.gameData,
        ...delta.gameData
      };
    }

    this.currentState.timestamp = delta.timestamp;
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  getStateBuffer(): StateBuffer {
    return this.stateBuffer;
  }
}
