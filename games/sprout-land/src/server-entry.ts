// Server-only entry point - no Phaser imports
import type { GameDefinition } from '@party-game/shared-types';
import { SproutLandServer } from './server/index.js';

export const game: GameDefinition = {
  id: 'sprout-land',
  name: 'Sprout Land',
  maxPlayers: 12,
  createServer: (io, roomCode) => new SproutLandServer(io),
  scenes: [], // Scenes loaded client-side only
  entryScene: 'MainScene',
  assetPath: '/games/sprout-land/assets'
};

export { SproutLandServer } from './server/index.js';
