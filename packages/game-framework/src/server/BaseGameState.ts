import { GameState, StateDelta, PlayerData } from '@party-game/shared-types';
import { BasePlayer } from './BasePlayer.js';

export abstract class BaseGameState {
  protected players: Map<string, BasePlayer> = new Map();
  protected lastFullSync: number = 0;
  protected fullSyncInterval: number = 1000; // 1 second
  protected previousState: GameState | null = null;

  abstract createPlayer(id: string, name: string): BasePlayer;
  abstract getGameData(): Record<string, any>;
  abstract update(deltaTime: number): void;

  addPlayer(id: string, name: string): BasePlayer {
    const player = this.createPlayer(id, name);
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  getPlayer(id: string): BasePlayer | undefined {
    return this.players.get(id);
  }

  handleInput(playerId: string, input: Record<string, any>): void {
    const player = this.players.get(playerId);
    if (player) {
      player.handleInput(input);
    }
  }

  getFullState(): GameState {
    const players: Record<string, PlayerData> = {};
    this.players.forEach((player, id) => {
      players[id] = player.getState();
    });

    return {
      players,
      gameData: this.getGameData(),
      timestamp: Date.now()
    };
  }

  getDelta(): StateDelta | null {
    const currentState = this.getFullState();

    if (!this.previousState) {
      this.previousState = currentState;
      return null;
    }

    const delta: StateDelta = {
      timestamp: currentState.timestamp
    };

    // Calculate player deltas
    const playerDeltas: Partial<Record<string, Partial<PlayerData>>> = {};
    let hasPlayerChanges = false;

    Object.keys(currentState.players).forEach(playerId => {
      const current = currentState.players[playerId];
      const previous = this.previousState!.players[playerId];

      if (!previous || this.hasPlayerChanged(current, previous)) {
        playerDeltas[playerId] = current;
        hasPlayerChanges = true;
      }
    });

    if (hasPlayerChanges) {
      delta.players = playerDeltas;
    }

    // Calculate game data deltas (shallow comparison)
    const gameDataDeltas: Partial<Record<string, any>> = {};
    let hasGameDataChanges = false;

    Object.keys(currentState.gameData).forEach(key => {
      if (currentState.gameData[key] !== this.previousState!.gameData[key]) {
        gameDataDeltas[key] = currentState.gameData[key];
        hasGameDataChanges = true;
      }
    });

    if (hasGameDataChanges) {
      delta.gameData = gameDataDeltas;
    }

    this.previousState = currentState;

    // Return null if no changes
    return (hasPlayerChanges || hasGameDataChanges) ? delta : null;
  }

  private hasPlayerChanged(current: PlayerData, previous: PlayerData): boolean {
    return JSON.stringify(current) !== JSON.stringify(previous);
  }

  shouldSendFullSync(): boolean {
    const now = Date.now();
    if (now - this.lastFullSync >= this.fullSyncInterval) {
      this.lastFullSync = now;
      return true;
    }
    return false;
  }
}
