# Jitter Fix Design

## Problem

Both games (demo and sprout-land) exhibit jittery movement caused by:
1. Variable deltaTime in server game loop
2. JSON.stringify overhead every frame for state diffing
3. No client-side interpolation (positions jump on receive)
4. Network/render phase mismatch

## Solution Overview

- **50ms interpolation buffer** - smooth visuals without perceptible input lag
- **Fixed timestep physics** - deterministic position updates
- **Dirty flag tracking** - eliminate serialization overhead
- **Frame-aligned rendering** - interpolate every render frame

## Server Changes

### Fixed Timestep (GameServer.ts)

```typescript
private fixedDeltaTime = 1000 / 60;  // Always 16.67ms
private accumulator = 0;

// In game loop:
const now = Date.now();
const frameTime = now - lastUpdate;
lastUpdate = now;
accumulator += frameTime;

while (accumulator >= this.fixedDeltaTime) {
  gameState.update(this.fixedDeltaTime);  // Always consistent
  accumulator -= this.fixedDeltaTime;
}
// Then send state:delta
```

### Dirty Flag Tracking (BasePlayer.ts)

```typescript
export abstract class BasePlayer {
  protected _dirty = true;

  set x(val: number) {
    if (this._x !== val) { this._x = val; this._dirty = true; }
  }

  isDirty(): boolean { return this._dirty; }
  clearDirty(): void { this._dirty = false; }
}
```

### Optimized getDelta (BaseGameState.ts)

```typescript
getDelta(): StateDelta | null {
  const playerDeltas: Record<string, PlayerData> = {};
  let hasChanges = false;

  this.players.forEach((player, id) => {
    if (player.isDirty()) {
      playerDeltas[id] = player.getState();
      player.clearDirty();
      hasChanges = true;
    }
  });

  return hasChanges ? { players: playerDeltas, timestamp: Date.now() } : null;
}
```

## Client Changes

### StateBuffer (new file: packages/game-framework/src/client/StateBuffer.ts)

```typescript
interface BufferedState {
  state: GameState;
  serverTime: number;
  receivedAt: number;
}

export class StateBuffer {
  private buffer: BufferedState[] = [];
  private renderDelay = 50;  // ms behind server

  push(state: GameState): void {
    this.buffer.push({
      state,
      serverTime: state.timestamp,
      receivedAt: Date.now()
    });
    if (this.buffer.length > 5) this.buffer.shift();
  }

  getInterpolatedState(renderTime: number): GameState | null {
    const targetTime = renderTime - this.renderDelay;
    // Find two states to interpolate between
    // Return lerped positions based on targetTime
  }
}
```

### Scene Integration

Both DemoScene and MainScene update pattern:

```typescript
update(time: number, delta: number): void {
  const interpolated = this.stateBuffer.getInterpolatedState(Date.now());
  if (interpolated) {
    this.renderPlayers(interpolated);
  }
}
```

## File Changes

| File | Change |
|------|--------|
| `GameServer.ts` | Fixed timestep accumulator loop |
| `BasePlayer.ts` | Add dirty flag tracking with setters |
| `BaseGameState.ts` | Use dirty flags instead of JSON.stringify |
| `StateBuffer.ts` | New file - interpolation buffer |
| `DemoScene.ts` | Use StateBuffer, interpolate in update() |
| `MainScene.ts` | Use StateBuffer, interpolate in update() |
| `BaseGameDisplay.ts` | Push states to buffer instead of immediate dispatch |

## Implementation Order

1. Server changes (timestep + dirty flags) - independent
2. StateBuffer class
3. Update both game displays - depend on StateBuffer

## Conflict Notes

- Dirty flag must persist until after state:delta sent (not cleared between physics sub-steps)
- Buffer primed with state:full on room join (don't wait for 3 deltas)
- Both games share StateBuffer from game-framework package
