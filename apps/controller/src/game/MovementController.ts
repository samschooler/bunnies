import { BaseController } from '@party-game/game-framework/client';
import { GameState } from '@party-game/shared-types';

interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
  currentMapId?: string;
  x?: number;
  y?: number;
}

interface MovementControllerCallbacks {
  onJoined: (playerId: string) => void;
  onSessionRestored: (playerId: string, playerName: string) => void;
  onError: (error: string) => void;
  onStateUpdate?: (playerState: PlayerState) => void;
}

export class MovementController extends BaseController {
  private callbacks: MovementControllerCallbacks;
  private playerState: PlayerState = { coins: 0, size: 1, speed: 1, color: '#ffffff', currentMapId: 'main' };

  constructor(serverUrl: string, roomCode: string, callbacks: MovementControllerCallbacks) {
    super(serverUrl, roomCode);
    this.callbacks = callbacks;
    this.setupStateListener();
  }

  private setupStateListener(): void {
    this.socket.on('state:full', (state: GameState) => {
      this.updatePlayerState(state);
    });
  }

  private updatePlayerState(state: GameState): void {
    if (!this.playerId) return;

    const playerData = state.players[this.playerId];
    if (playerData && playerData.customData) {
      this.playerState = {
        coins: playerData.customData.coins || 0,
        size: playerData.customData.size || 1,
        speed: playerData.customData.speed || 1,
        color: playerData.color,
        currentMapId: playerData.customData.currentMapId,
        x: playerData.customData.x,
        y: playerData.customData.y
      };

      if (this.callbacks.onStateUpdate) {
        this.callbacks.onStateUpdate(this.playerState);
      }
    }
  }

  getPlayerState(): PlayerState {
    return this.playerState;
  }

  purchaseUpgrade(upgradeType: string): void {
    this.socket.emit('player:purchase' as any, upgradeType);
  }

  placeObject(itemId: string): void {
    if (!this.playerState.x || !this.playerState.y) {
      console.error('Player position not available');
      return;
    }

    this.socket.emit('player:placeObject' as any, {
      itemId,
      x: this.playerState.x,
      y: this.playerState.y,
      mapId: this.playerState.currentMapId || 'main'
    });
  }

  onJoined(playerId: string, playerData: any): void {
    this.callbacks.onJoined(playerId);
  }

  onSessionRestored(playerId: string, playerData: any): void {
    this.callbacks.onSessionRestored(playerId, playerData?.name || 'Player');
  }

  onError(error: string): void {
    this.callbacks.onError(error);
  }
}
