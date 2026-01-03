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
    currentMapId: string;
  };
}

interface PlayerContainer {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  currentDirection: string;
}

export class InteriorScene extends Phaser.Scene {
  private playerSprites: Map<string, PlayerContainer> = new Map();

  constructor() {
    super({ key: 'InteriorScene' });
  }

  preload() {
    this.load.spritesheet('character',
      '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load tilemap
    this.load.tilemapTiledJSON('interiorMap', '/assets/sprout-land/tilemaps/house-interior.json');

    // Load tilesets
    this.load.image('tilled-dirt', '/assets/sprout-land/Tilesets/Tilled_Dirt.png');
    this.load.image('wooden-house-walls', '/assets/sprout-land/Tilesets/Wooden_House_Walls_Tilset.png');
    this.load.image('basic-furniture', '/assets/sprout-land/Objects/Basic_Furniture.png');

    // Set pixel-perfect filter after load
    this.load.on('complete', () => {
      this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('tilled-dirt').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-walls').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-furniture').setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }

  create() {
    // Create tilemap
    const map = this.make.tilemap({ key: 'interiorMap' });

    // Add tilesets (names must match JSON)
    const dirtTileset = map.addTilesetImage('Tilled_Dirt', 'tilled-dirt');
    const wallsTileset = map.addTilesetImage('Wooden_House_Walls_Tilset', 'wooden-house-walls');
    const furnitureTileset = map.addTilesetImage('Basic_Furniture', 'basic-furniture');

    // Create layers (bottom to top) - pass all tilesets to each layer
    const allTilesets = [dirtTileset!, wallsTileset!, furnitureTileset!];
    const floorLayer = map.createLayer('Floor', allTilesets, 0, 0);
    const wallsLayer = map.createLayer('Walls', allTilesets, 0, 0);
    const furnitureLayer = map.createLayer('Furniture', allTilesets, 0, 0);

    // Scale layers to 4x
    floorLayer?.setScale(4);
    wallsLayer?.setScale(4);
    furnitureLayer?.setScale(4);

    // Set world bounds to match scaled map
    const worldWidth = 576;  // 15 tiles * 16 * 4
    const worldHeight = 640; // 10 tiles * 16 * 4
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Setup camera
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Create sprite animations
    this.createAnimations();

    // Listen for state updates
    this.events.on('state-update', this.handleStateUpdate, this);
  }

  private createAnimations(): void {
    // Idle animations
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

    // Walk animations
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

    // Only show players in interior (not on main map)
    const interiorPlayers = Object.values(players).filter(
      p => p.customData.currentMapId && p.customData.currentMapId !== 'main'
    );

    // Update existing and create new
    interiorPlayers.forEach(player => {
      if (!this.playerSprites.has(player.id)) {
        this.createPlayerSprite(player);
      } else {
        this.updatePlayerSprite(player);
      }
    });

    // Remove players who left interior or disconnected
    this.playerSprites.forEach((playerData, playerId) => {
      const stillInInterior = interiorPlayers.find(p => p.id === playerId);
      if (!stillInInterior) {
        playerData.container.destroy();
        this.playerSprites.delete(playerId);
      }
    });

    // Update depth sorting for all sprites
    this.updateDepthSorting();
  }

  private createPlayerSprite(player: MovementPlayerData): void {
    const container = this.add.container(
      player.customData.x,
      player.customData.y
    );

    // Create animated sprite
    const sprite = this.add.sprite(0, 0, 'character');
    sprite.setScale(4.0);
    sprite.setOrigin(0.5, 0.5);
    sprite.play('idle-down');

    // Calculate sprite dimensions for text positioning
    const spriteHeight = sprite.displayHeight;

    // Add name text above sprite
    const nameText = this.add.text(0, -spriteHeight / 2 - 20, player.name, {
      fontSize: '16px',
      color: player.color,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial'
    });
    nameText.setOrigin(0.5, 1);

    // Add to container
    container.add([sprite, nameText]);
    container.setDepth(1000); // Make sure it's on top

    this.playerSprites.set(player.id, {
      container,
      sprite,
      nameText,
      currentDirection: 'down'
    });
  }

  private updatePlayerSprite(player: MovementPlayerData): void {
    const playerData = this.playerSprites.get(player.id);
    if (!playerData) return;

    // Update position
    playerData.container.x = player.customData.x;
    playerData.container.y = player.customData.y;

    // Update animation based on velocity
    const vx = player.customData.vx;
    const vy = player.customData.vy;

    const isMoving = Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01;

    if (isMoving) {
      // Determine primary direction
      let newDirection = playerData.currentDirection;

      if (Math.abs(vx) > Math.abs(vy)) {
        newDirection = vx > 0 ? 'right' : 'left';
      } else {
        newDirection = vy > 0 ? 'down' : 'up';
      }

      // Update animation if direction changed
      if (newDirection !== playerData.currentDirection) {
        playerData.currentDirection = newDirection;
        playerData.sprite.play(`walk-${newDirection}`, true);
      } else if (!playerData.sprite.anims.isPlaying) {
        playerData.sprite.play(`walk-${newDirection}`, true);
      }
    } else {
      // Play idle animation for current direction
      const idleAnim = `idle-${playerData.currentDirection}`;
      if (playerData.sprite.anims.currentAnim?.key !== idleAnim) {
        playerData.sprite.play(idleAnim, true);
      }
    }
  }

  private updateDepthSorting(): void {
    // Sort player sprites by Y position for proper depth
    const sortedPlayers = Array.from(this.playerSprites.values()).sort(
      (a, b) => a.container.y - b.container.y
    );

    sortedPlayers.forEach((playerData, index) => {
      playerData.container.setDepth(index);
    });
  }
}
