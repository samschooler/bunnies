// games/sprout-land/src/client.ts
// Client-only exports for browser bundles
import type { GameDefinition } from '@party-game/shared-types';
import { MainScene, InteriorScene, FieldScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'sprout-land',
  name: 'Sprout Land',
  maxPlayers: 12,
  createServer: () => { throw new Error('Server not available in browser'); },
  scenes: [MainScene, InteriorScene, FieldScene],
  entryScene: 'MainScene',
  assetPath: '/games/sprout-land/assets'
};

export { MainScene, InteriorScene, FieldScene } from './display/index.js';
