// packages/shared-types/src/game-registry.ts
import type { Server } from 'socket.io';

export interface GameDefinition {
  id: string;
  name: string;
  maxPlayers: number;
  createServer: (io: Server, roomCode: string) => any;
  scenes: any[];
  entryScene: string;
  assetPath: string;
  controllerComponent?: any;
}

export class GameRegistry {
  private games = new Map<string, GameDefinition>();
  private prefixToGame = new Map<string, string>();
  private gameToPrefix = new Map<string, string>();

  register(game: GameDefinition): void {
    const prefix = String.fromCharCode(65 + this.games.size);
    this.games.set(game.id, game);
    this.prefixToGame.set(prefix, game.id);
    this.gameToPrefix.set(game.id, prefix);
  }

  getGame(id: string): GameDefinition | undefined {
    return this.games.get(id);
  }

  getGameByPrefix(prefix: string): GameDefinition | undefined {
    const gameId = this.prefixToGame.get(prefix);
    return gameId ? this.games.get(gameId) : undefined;
  }

  getPrefix(gameId: string): string | undefined {
    return this.gameToPrefix.get(gameId);
  }

  generateRoomCode(gameId: string): string | null {
    const prefix = this.gameToPrefix.get(gameId);
    if (!prefix) return null;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${code}`;
  }

  parseRoomCode(code: string): { gameId: string; roomCode: string } | null {
    if (!code || code.length < 2) return null;
    const prefix = code[0].toUpperCase();
    const gameId = this.prefixToGame.get(prefix);
    if (!gameId) return null;
    return { gameId, roomCode: code.toUpperCase() };
  }

  getAllGames(): GameDefinition[] {
    return Array.from(this.games.values());
  }

  getGameIds(): string[] {
    return Array.from(this.games.keys());
  }
}

export const registry = new GameRegistry();
