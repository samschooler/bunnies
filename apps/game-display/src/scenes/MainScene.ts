import Phaser from 'phaser';
import { GameState } from '@party-game/shared-types';

interface MovementPlayerData {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  joinedAt: number;
  customData: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    coins: number;
    size: number;
    speed: number;
  };
}

interface PlayerContainer {
  container: Phaser.GameObjects.Container;
  particles: Phaser.GameObjects.Particles.ParticleEmitter;
  nameText: Phaser.GameObjects.Text;
  coinText: Phaser.GameObjects.Text;
  circle: Phaser.GameObjects.Arc;
}

export class MainScene extends Phaser.Scene {
  private playerSprites: Map<string, PlayerContainer> = new Map();
  private coinSprites: Map<string, Phaser.GameObjects.Arc> = new Map();

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.spritesheet('character',
      '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Set pixel-perfect filter after load
    this.load.on('complete', () => {
      this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }

  create() {
    // Create particle texture
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    graphics.destroy();

    // Add background
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x1a1a2e
    );

    // Add grid for visual reference
    this.createGrid();

    // Listen for state updates
    this.events.on('state-update', this.handleStateUpdate, this);
  }

  private createGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2d2d44, 0.3);

    const gridSize = 50;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  private handleStateUpdate(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Update existing players and create new ones
    Object.values(players).forEach(player => {
      if (!this.playerSprites.has(player.id)) {
        this.createPlayerSprite(player);
      } else {
        this.updatePlayerSprite(player);
      }
    });

    // Remove players that are no longer in the state
    this.playerSprites.forEach((playerData, playerId) => {
      if (!players[playerId]) {
        playerData.container.destroy();
        playerData.particles.destroy();
        this.playerSprites.delete(playerId);
      }
    });

    // Update coins
    const coins = (state.gameData?.coins || []) as Array<{id: string, x: number, y: number}>;

    // Create new coins
    coins.forEach(coin => {
      if (!this.coinSprites.has(coin.id)) {
        this.createCoin(coin);
      }
    });

    // Remove coins that are no longer in the state
    const coinIds = new Set(coins.map(c => c.id));
    this.coinSprites.forEach((sprite, coinId) => {
      if (!coinIds.has(coinId)) {
        sprite.destroy();
        this.coinSprites.delete(coinId);
      }
    });
  }

  private createCoin(coin: {id: string, x: number, y: number}): void {
    const circle = this.add.circle(coin.x, coin.y, 10, 0xFFD700);
    this.coinSprites.set(coin.id, circle);
  }

  private createPlayerSprite(player: MovementPlayerData): void {
    const container = this.add.container(
      player.customData.x,
      player.customData.y
    );

    const baseRadius = 20;
    const radius = baseRadius * player.customData.size;

    // Circle sprite
    const circle = this.add.circle(0, 0, radius, Phaser.Display.Color.HexStringToColor(player.color).color);

    // Name text (positioned below the circle)
    const nameY = radius + 10;
    const nameText = this.add.text(0, nameY, player.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    nameText.setOrigin(0.5);

    // Coin counter text
    const coinY = nameY + 16;
    const coinText = this.add.text(0, coinY, `Coins: ${player.customData.coins}`, {
      fontSize: '12px',
      color: '#FFD700',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    coinText.setOrigin(0.5);

    container.add([circle, nameText, coinText]);

    // Create particle emitter for movement trail
    const particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 50 },
      scale: { start: 0.5 * player.customData.size, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      tint: Phaser.Display.Color.HexStringToColor(player.color).color,
      frequency: 30,
      emitting: false
    });

    this.playerSprites.set(player.id, { container, particles, nameText, coinText, circle });
  }

  private updatePlayerSprite(player: MovementPlayerData): void {
    const playerData = this.playerSprites.get(player.id);
    if (!playerData) return;

    const { container, particles, coinText, nameText, circle } = playerData;

    // Smooth movement using tweens
    this.tweens.add({
      targets: container,
      x: player.customData.x,
      y: player.customData.y,
      duration: 100,
      ease: 'Linear'
    });

    // Update particle position to follow player
    particles.setPosition(player.customData.x, player.customData.y);

    // Enable particles if moving, disable if not
    const isMoving = Math.abs(player.customData.vx) > 1 || Math.abs(player.customData.vy) > 1;
    particles.emitting = isMoving;

    // Update player size
    const baseRadius = 20;
    const radius = baseRadius * player.customData.size;
    circle.setRadius(radius);

    // Update text positions based on size
    const nameY = radius + 10;
    nameText.setY(nameY);
    coinText.setY(nameY + 16);

    // Update player color
    circle.setFillStyle(Phaser.Display.Color.HexStringToColor(player.color).color);
    particles.particleTint = Phaser.Display.Color.HexStringToColor(player.color).color;

    // Update coin counter
    coinText.setText(`Coins: ${player.customData.coins}`);

    // Update opacity based on connection status
    container.setAlpha(player.connected ? 1 : 0.5);
  }
}
