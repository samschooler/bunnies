// games/sprout-land/src/index.ts
import type { GameDefinition } from '@party-game/shared-types';
import { SproutLandServer } from './server/index.js';
import { MainScene, InteriorScene, FieldScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'sprout-land',
  name: 'Sprout Land',
  maxPlayers: 12,
  createServer: (io, roomCode) => new SproutLandServer(io),
  scenes: [MainScene, InteriorScene, FieldScene],
  entryScene: 'MainScene',
  assetPath: '/games/sprout-land/assets'
};

export { SproutLandServer } from './server/index.js';
export { MainScene, InteriorScene, FieldScene } from './display/index.js';
