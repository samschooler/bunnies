// games/demo/src/index.ts
import type { GameDefinition } from '@party-game/shared-types';
import { DemoServer } from './server/index.js';
import { DemoScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'demo',
  name: 'Demo',
  maxPlayers: 12,
  createServer: (io, roomCode) => new DemoServer(io),
  scenes: [DemoScene],
  entryScene: 'DemoScene',
  assetPath: '/games/demo/assets'
};

export { DemoServer } from './server/index.js';
export { DemoScene } from './display/index.js';
