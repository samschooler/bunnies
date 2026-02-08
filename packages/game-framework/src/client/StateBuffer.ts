import { GameState } from '@party-game/shared-types';

interface BufferedState {
  state: GameState;
  serverTime: number;
  receivedAt: number;
}

export class StateBuffer {
  private buffer: BufferedState[] = [];
  private renderDelay: number;

  constructor(renderDelayMs: number = 50) {
    this.renderDelay = renderDelayMs;
  }

  push(state: GameState): void {
    this.buffer.push({
      state,
      serverTime: state.timestamp,
      receivedAt: Date.now()
    });
    // Keep last 5 states
    while (this.buffer.length > 5) {
      this.buffer.shift();
    }
  }

  getInterpolatedState(renderTime: number): { state: GameState; alpha: number } | null {
    if (this.buffer.length < 2) {
      // Not enough states to interpolate, return latest
      return this.buffer.length > 0
        ? { state: this.buffer[this.buffer.length - 1].state, alpha: 1 }
        : null;
    }

    const targetTime = renderTime - this.renderDelay;

    // Find two states to interpolate between
    let older: BufferedState | null = null;
    let newer: BufferedState | null = null;

    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].receivedAt <= targetTime &&
          this.buffer[i + 1].receivedAt >= targetTime) {
        older = this.buffer[i];
        newer = this.buffer[i + 1];
        break;
      }
    }

    // If target time is beyond our buffer, use latest two
    if (!older || !newer) {
      older = this.buffer[this.buffer.length - 2];
      newer = this.buffer[this.buffer.length - 1];
    }

    // Calculate interpolation alpha (0-1)
    const timeBetween = newer.receivedAt - older.receivedAt;
    const alpha = timeBetween > 0
      ? Math.min(1, Math.max(0, (targetTime - older.receivedAt) / timeBetween))
      : 1;

    return { state: this.interpolateStates(older.state, newer.state, alpha), alpha };
  }

  private interpolateStates(older: GameState, newer: GameState, alpha: number): GameState {
    const interpolatedPlayers: Record<string, any> = {};

    // Interpolate each player's position
    for (const [id, newerPlayer] of Object.entries(newer.players)) {
      const olderPlayer = older.players[id];
      const newerAny = newerPlayer as any;
      const olderAny = olderPlayer as any;

      if (olderPlayer && newerAny.x !== undefined && olderAny.x !== undefined) {
        // Demo format: x/y directly on player
        interpolatedPlayers[id] = {
          ...newerPlayer,
          x: olderAny.x + (newerAny.x - olderAny.x) * alpha,
          y: olderAny.y + (newerAny.y - olderAny.y) * alpha,
        };
      } else if (olderPlayer && newerPlayer.customData?.x !== undefined && olderPlayer.customData?.x !== undefined) {
        // Sprout-land format: x/y in customData
        interpolatedPlayers[id] = {
          ...newerPlayer,
          customData: {
            ...newerPlayer.customData,
            x: olderPlayer.customData.x + (newerPlayer.customData.x - olderPlayer.customData.x) * alpha,
            y: olderPlayer.customData.y + (newerPlayer.customData.y - olderPlayer.customData.y) * alpha
          }
        };
      } else {
        interpolatedPlayers[id] = newerPlayer;
      }
    }

    return {
      ...newer,
      players: interpolatedPlayers
    };
  }

  clear(): void {
    this.buffer = [];
  }
}
