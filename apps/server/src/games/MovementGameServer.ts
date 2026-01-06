import { GameServer, BaseGameState } from '@party-game/game-framework/server';
import { MovementGameState } from './MovementGameState.js';
import { MovementPlayer } from './MovementPlayer.js';
import { Server, Socket } from 'socket.io';

export class MovementGameServer extends GameServer {
  constructor(io: Server, serverIp?: string) {
    super(io, serverIp);
    this.setupCustomEventHandlers();
  }

  private setupCustomEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      socket.on('player:purchase', (upgradeType: string) => {
        this.handlePurchase(socket, upgradeType);
      });

      socket.on('player:placeObject', (data: { itemId: string, x: number, y: number, mapId: string }) => {
        this.handlePlaceObject(socket, data);
      });
    });
  }

  private handlePurchase(socket: Socket, upgradeType: string): void {
    const playerId = (socket as any).playerId;
    const roomId = (socket as any).roomId;

    if (!playerId || !roomId) return;

    const gameState = this.gameStates.get(roomId);
    if (!gameState) return;

    const player = gameState.getPlayer(playerId) as MovementPlayer;
    if (!player) return;

    const success = player.purchaseUpgrade(upgradeType);
    if (success) {
      console.log(`Player ${playerId} purchased ${upgradeType}`);
      // State will be synced in the next update loop
    }
  }

  private handlePlaceObject(
    socket: Socket,
    data: { itemId: string, x: number, y: number, mapId: string }
  ): void {
    const playerId = (socket as any).playerId;
    const roomId = (socket as any).roomId;

    if (!playerId || !roomId) {
      console.error('Missing playerId or roomId');
      return;
    }

    const gameState = this.gameStates.get(roomId);
    if (!gameState) {
      console.error(`Game state not found for room ${roomId}`);
      return;
    }

    const result = (gameState as MovementGameState).placeObject(
      playerId,
      data.itemId,
      data.x,
      data.y,
      data.mapId
    );

    if (result) {
      console.log(`Successfully placed object ${result.id}`);
      // State will sync automatically in next update loop
    } else {
      console.error('Failed to place object');
    }
  }

  createGameState(roomId: string): BaseGameState {
    return new MovementGameState();
  }

  async createRoomViaAPI(): Promise<string> {
    // Access protected members from base class to create a room
    const room = (this as any).roomManager.createRoom('api-display');
    const gameState = this.createGameState(room.roomId);
    (this as any).gameStates.set(room.roomId, gameState);

    // Call the parent's private startGameLoop method
    (this as any).startGameLoop(room.roomId);

    console.log(`Room created via API: ${room.roomCode} (${room.roomId})`);
    return room.roomCode;
  }
}
