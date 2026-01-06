// packages/shared-types/src/games.ts
import { registry, type GameDefinition } from './game-registry.js';

// Import games - these will be registered at startup
// In production, this could be dynamic loading

let gamesInitialized = false;

export async function initializeGames(): Promise<void> {
  if (gamesInitialized) return;

  // Games are registered in order - first gets 'A', second gets 'B', etc.
  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: demoGame } = await import('@games/demo');
    registry.register(demoGame);
  } catch (e) {
    console.warn('Demo game not available');
  }

  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: sproutLandGame } = await import('@games/sprout-land');
    registry.register(sproutLandGame);
  } catch (e) {
    console.warn('Sprout Land game not available');
  }

  gamesInitialized = true;
}

export { registry };
