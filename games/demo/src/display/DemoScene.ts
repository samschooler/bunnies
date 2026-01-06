// games/demo/src/display/DemoScene.ts
import Phaser from 'phaser';

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerData {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  connected: boolean;
}

interface GameState {
  players: Record<string, PlayerData>;
  gameData: { walls: Wall[] };
  timestamp: number;
}

export class DemoScene extends Phaser.Scene {
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private wallGraphics: Phaser.GameObjects.Graphics | null = null;
  private walls: Wall[] = [];

  constructor() {
    super({ key: 'DemoScene' });
  }

  create(): void {
    // Draw background grid
    this.drawBackground();

    // Wall graphics will be drawn when we receive state
    this.wallGraphics = this.add.graphics();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();

    // Background
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, 800, 600);

    // Grid lines
    graphics.lineStyle(1, 0x2a2a4e, 0.3);
    for (let x = 0; x <= 800; x += 40) {
      graphics.lineBetween(x, 0, x, 600);
    }
    for (let y = 0; y <= 600; y += 40) {
      graphics.lineBetween(0, y, 800, y);
    }

    // Border
    graphics.lineStyle(3, 0x4a4a6e, 1);
    graphics.strokeRect(10, 10, 780, 580);
  }

  private drawWalls(): void {
    if (!this.wallGraphics) return;

    this.wallGraphics.clear();

    for (const wall of this.walls) {
      // Shadow
      this.wallGraphics.fillStyle(0x000000, 0.3);
      this.wallGraphics.fillRoundedRect(wall.x + 4, wall.y + 4, wall.width, wall.height, 8);

      // Wall body
      this.wallGraphics.fillStyle(0x4a4a6e, 1);
      this.wallGraphics.fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 8);

      // Highlight
      this.wallGraphics.fillStyle(0x6a6a8e, 1);
      this.wallGraphics.fillRoundedRect(wall.x + 4, wall.y + 4, wall.width - 8, wall.height / 3, 4);
    }
  }

  updateState(state: GameState): void {
    // Update walls if provided
    if (state.gameData?.walls) {
      this.walls = state.gameData.walls;
      this.drawWalls();
    }

    // Update players
    const currentPlayers = new Set(Object.keys(state.players));

    // Remove disconnected players
    for (const [id, sprite] of this.playerSprites) {
      if (!currentPlayers.has(id) || !state.players[id].connected) {
        sprite.destroy();
        this.playerSprites.delete(id);
      }
    }

    // Update or create players
    for (const [id, playerData] of Object.entries(state.players)) {
      if (!playerData.connected) continue;

      let container = this.playerSprites.get(id);

      if (!container) {
        container = this.createPlayerSprite(playerData);
        this.playerSprites.set(id, container);
      }

      // Smooth interpolation
      const targetX = playerData.x;
      const targetY = playerData.y;
      container.x += (targetX - container.x) * 0.3;
      container.y += (targetY - container.y) * 0.3;
    }
  }

  private createPlayerSprite(playerData: PlayerData): Phaser.GameObjects.Container {
    const container = this.add.container(playerData.x, playerData.y);

    const color = parseInt(playerData.color.replace('#', ''), 16);

    // Shadow
    const shadow = this.add.circle(2, 2, 15, 0x000000, 0.3);
    container.add(shadow);

    // Body (gradient effect using multiple circles)
    const bodyOuter = this.add.circle(0, 0, 15, color, 1);
    const bodyInner = this.add.circle(-3, -3, 8, 0xffffff, 0.3);
    container.add(bodyOuter);
    container.add(bodyInner);

    // Direction indicator
    const indicator = this.add.triangle(10, 0, 0, -4, 8, 0, 0, 4, color);
    container.add(indicator);

    // Name label
    const nameText = this.add.text(0, -25, playerData.name, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(nameText);

    return container;
  }
}
