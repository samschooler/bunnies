// games/demo/src/display/DemoScene.ts
import Phaser from 'phaser';
import { StateBuffer } from '@party-game/game-framework';

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
  private stateBuffer: StateBuffer | null = null;
  private latestState: GameState | null = null;

  constructor() {
    super({ key: 'DemoScene' });
  }

  create(): void {
    // Draw background grid
    this.drawBackground();

    // Wall graphics will be drawn when we receive state
    this.wallGraphics = this.add.graphics();

    // Listen for state updates from GameDisplay
    this.events.on('state-update', (state: GameState) => {
      this.latestState = state;
      this.onStateUpdate(state);
    });

    // Listen for state buffer reference
    this.events.on('state-buffer', (buffer: StateBuffer) => {
      this.stateBuffer = buffer;
    });
  }

  update(_time: number, _delta: number): void {
    // Use interpolated state for smooth rendering
    if (this.stateBuffer) {
      const interpolated = this.stateBuffer.getInterpolatedState(Date.now());
      if (interpolated) {
        this.onRenderPlayers(interpolated.state as unknown as GameState);
      }
    } else if (this.latestState) {
      // Fallback to latest state if no buffer available
      this.onRenderPlayers(this.latestState);
    }
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

  /** Handle non-position state updates (walls, player add/remove) */
  private onStateUpdate(state: GameState): void {
    // Update walls if provided
    if (state.gameData?.walls) {
      this.walls = state.gameData.walls;
      this.drawWalls();
    }

    // Handle player add/remove
    const currentPlayers = new Set(Object.keys(state.players));

    // Remove disconnected players
    for (const [id, sprite] of this.playerSprites) {
      if (!currentPlayers.has(id) || !state.players[id].connected) {
        sprite.destroy();
        this.playerSprites.delete(id);
      }
    }

    // Create new players (but don't update positions here)
    for (const [id, playerData] of Object.entries(state.players)) {
      if (!playerData.connected) continue;

      if (!this.playerSprites.has(id)) {
        const container = this.createPlayerSprite(playerData);
        this.playerSprites.set(id, container);
      }
    }
  }

  /** Render player positions from interpolated state - called every frame */
  private onRenderPlayers(state: GameState): void {
    for (const [id, playerData] of Object.entries(state.players)) {
      if (!playerData.connected) continue;

      const container = this.playerSprites.get(id);
      if (container) {
        // Direct position update from interpolated state
        container.x = playerData.x;
        container.y = playerData.y;
      }
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
