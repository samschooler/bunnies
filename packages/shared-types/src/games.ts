// packages/shared-types/src/games.ts
import { registry, type GameDefinition } from './game-registry.js';

// Client-side initialization - imports full game code with Phaser scenes
// Server has its own initialization to avoid bundling Phaser code

let gamesInitialized = false;

export async function initializeGames(): Promise<void> {
  if (gamesInitialized) return;

  // Games are registered in order - first gets 'A', second gets 'B', etc.
  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: demoGame } = await import('@games/demo');
    registry.register(demoGame);
  } catch (e) {
    console.warn('Demo game not available:', e);
  }

  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: sproutLandGame } = await import('@games/sprout-land');
    registry.register(sproutLandGame);
  } catch (e) {
    console.warn('Sprout Land game not available:', e);
  }

  gamesInitialized = true;
}

export { registry };
