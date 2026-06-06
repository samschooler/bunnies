// games/demo/src/server/DemoServer.ts
import { GameServer, BaseGameState, GameServerOptions } from '@party-game/game-framework/server';
import { Server } from 'socket.io';
import { DemoGameState } from './DemoGameState.js';

export class DemoServer extends GameServer {
  constructor(io: Server, options?: GameServerOptions) {
    super(io, options);
  }

  createGameState(roomId: string): BaseGameState {
    return new DemoGameState();
  }
}
