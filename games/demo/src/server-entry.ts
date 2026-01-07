// Server-only entry point - no Phaser imports
import type { GameDefinition } from '@party-game/shared-types';
import { DemoServer } from './server/index.js';

export const game: GameDefinition = {
  id: 'demo',
  name: 'Demo',
  maxPlayers: 12,
  createServer: (io, roomCode) => new DemoServer(io, { skipEventHandlers: true }),
  scenes: [], // Scenes loaded client-side only
  entryScene: 'DemoScene',
  assetPath: '/games/demo/assets'
};

export { DemoServer } from './server/index.js';
