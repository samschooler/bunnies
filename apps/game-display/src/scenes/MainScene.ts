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
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  coinText: Phaser.GameObjects.Text;
  currentDirection: string;
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

    // Create sprite animations
    this.createAnimations();

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

  private createAnimations(): void {
    // Idle animations (frames 0-1 of each row)
    this.anims.create({
      key: 'idle-down',
      frames: this.anims.generateFrameNumbers('character', { start: 0, end: 1 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'idle-up',
      frames: this.anims.generateFrameNumbers('character', { start: 4, end: 5 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'idle-left',
      frames: this.anims.generateFrameNumbers('character', { start: 8, end: 9 }),
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'idle-right',
      frames: this.anims.generateFrameNumbers('character', { start: 12, end: 13 }),
      frameRate: 4,
      repeat: -1
    });

    // Walk animations (frames 2-3 of each row)
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('character', { start: 2, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('character', { start: 6, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('character', { start: 10, end: 11 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('character', { start: 14, end: 15 }),
      frameRate: 8,
      repeat: -1
    });
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

    // Create animated sprite
    const sprite = this.add.sprite(0, 0, 'character');
    sprite.setScale(2.0); // 2x scale for pixel art
    sprite.setOrigin(0.5, 0.5);
    sprite.play('idle-down'); // Default animation

    // Calculate sprite dimensions for text positioning
    const spriteHeight = sprite.displayHeight;

    // Name text (positioned above the sprite)
    const nameY = -(spriteHeight / 2) - 8;
    const nameText = this.add.text(0, nameY, player.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    nameText.setOrigin(0.5, 1); // Bottom-center origin

    // Coin counter text (above name text)
    const coinY = nameY - 16;
    const coinText = this.add.text(0, coinY, `Coins: ${player.customData.coins}`, {
      fontSize: '12px',
      color: '#FFD700',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    coinText.setOrigin(0.5, 1); // Bottom-center origin

    container.add([sprite, nameText, coinText]);

    this.playerSprites.set(player.id, {
      container,
      sprite,
      nameText,
      coinText,
      currentDirection: 'down'
    });
  }

  private updatePlayerSprite(player: MovementPlayerData): void {
    const playerData = this.playerSprites.get(player.id);
    if (!playerData) return;

    const { container, coinText, nameText } = playerData;

    // Smooth movement using tweens
    this.tweens.add({
      targets: container,
      x: player.customData.x,
      y: player.customData.y,
      duration: 100,
      ease: 'Linear'
    });

    // Update coin counter
    coinText.setText(`Coins: ${player.customData.coins}`);

    // Update opacity based on connection status
    container.setAlpha(player.connected ? 1 : 0.5);
  }
}
