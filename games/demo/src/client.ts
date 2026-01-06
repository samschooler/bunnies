// games/demo/src/client.ts
// Client-only exports for browser bundles
import type { GameDefinition } from '@party-game/shared-types';
import { DemoScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'demo',
  name: 'Demo',
  maxPlayers: 12,
  createServer: () => { throw new Error('Server not available in browser'); },
  scenes: [DemoScene],
  entryScene: 'DemoScene',
  assetPath: '/games/demo/assets'
};

export { DemoScene } from './display/index.js';
