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
