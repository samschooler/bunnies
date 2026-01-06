// games/demo/src/server/DemoServer.ts
import { GameServer, BaseGameState } from '@party-game/game-framework/server';
import { DemoGameState } from './DemoGameState.js';

export class DemoServer extends GameServer {
  createGameState(roomId: string): BaseGameState {
    return new DemoGameState();
  }
}
