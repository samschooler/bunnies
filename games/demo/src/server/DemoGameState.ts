// games/demo/src/server/DemoGameState.ts
import { BaseGameState } from '@party-game/game-framework/server';
import { DemoPlayer } from './DemoPlayer.js';

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DemoGameData {
  walls: Wall[];
}

// Player colors for the demo
const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

export class DemoGameState extends BaseGameState {
  private walls: Wall[] = [];
  private colorIndex: number = 0;

  constructor() {
    super();
    this.initializeWalls();
  }

  private initializeWalls(): void {
    // Simple geometric walls for the demo
    this.walls = [
      // Top-left obstacle
      { x: 100, y: 100, width: 80, height: 80 },
      // Top-right obstacle
      { x: 620, y: 100, width: 80, height: 80 },
      // Center obstacle
      { x: 360, y: 250, width: 80, height: 100 },
      // Bottom-left obstacle
      { x: 100, y: 420, width: 80, height: 80 },
      // Bottom-right obstacle
      { x: 620, y: 420, width: 80, height: 80 },
    ];
  }

  createPlayer(id: string, name: string): DemoPlayer {
    const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    this.colorIndex++;
    return new DemoPlayer(id, name, color);
  }

  getGameData(): DemoGameData {
    return { walls: this.walls };
  }

  update(deltaTime: number): void {
    for (const player of this.players.values()) {
      if (player.connected) {
        const demoPlayer = player as DemoPlayer;
        const prevX = demoPlayer.x;
        const prevY = demoPlayer.y;

        demoPlayer.update(deltaTime);

        // Check wall collisions
        for (const wall of this.walls) {
          if (this.checkCollision(demoPlayer, wall)) {
            demoPlayer.x = prevX;
            demoPlayer.y = prevY;
            break;
          }
        }
      }
    }
  }

  private checkCollision(player: DemoPlayer, wall: Wall): boolean {
    const playerRadius = 15;
    const closestX = Math.max(wall.x, Math.min(player.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(player.y, wall.y + wall.height));
    const distanceX = player.x - closestX;
    const distanceY = player.y - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (playerRadius * playerRadius);
  }
}
