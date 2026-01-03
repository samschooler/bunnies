import { BaseController } from '@party-game/game-framework/client';
import { GameState } from '@party-game/shared-types';

interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
  currentMapId?: string;
}

interface MovementControllerCallbacks {
  onJoined: (playerId: string) => void;
  onSessionRestored: (playerId: string) => void;
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
        currentMapId: playerData.customData.currentMapId
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

  onJoined(playerId: string, playerData: any): void {
    this.callbacks.onJoined(playerId);
  }

  onSessionRestored(playerId: string, playerData: any): void {
    this.callbacks.onSessionRestored(playerId);
  }

  onError(error: string): void {
    this.callbacks.onError(error);
  }
}
