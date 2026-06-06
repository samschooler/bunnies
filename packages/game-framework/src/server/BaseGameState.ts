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

    // Deep copy gameData to create a true snapshot
    const gameData = this.getGameData();
    const gameDataSnapshot = JSON.parse(JSON.stringify(gameData));

    return {
      players,
      gameData: gameDataSnapshot,
      timestamp: Date.now()
    };
  }

  getDelta(): StateDelta | null {
    const delta: StateDelta = {
      timestamp: Date.now()
    };

    // Calculate player deltas using dirty flags
    const playerDeltas: Partial<Record<string, Partial<PlayerData>>> = {};
    let hasPlayerChanges = false;

    this.players.forEach((player, playerId) => {
      if (player.isDirty()) {
        playerDeltas[playerId] = player.getState();
        hasPlayerChanges = true;
        player.clearDirty();
      }
    });

    if (hasPlayerChanges) {
      delta.players = playerDeltas;
    }

    // Calculate game data deltas (keep JSON comparison for now, less frequent)
    const currentGameData = this.getGameData();
    const gameDataDeltas: Partial<Record<string, any>> = {};
    let hasGameDataChanges = false;

    if (!this.previousState) {
      this.previousState = this.getFullState();
    }

    Object.keys(currentGameData).forEach(key => {
      if (JSON.stringify(currentGameData[key]) !== JSON.stringify(this.previousState!.gameData[key])) {
        gameDataDeltas[key] = currentGameData[key];
        hasGameDataChanges = true;
      }
    });

    if (hasGameDataChanges) {
      delta.gameData = gameDataDeltas;
      // Update previousState gameData for next comparison
      this.previousState = this.getFullState();
    }

    // Return null if no changes
    return (hasPlayerChanges || hasGameDataChanges) ? delta : null;
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
