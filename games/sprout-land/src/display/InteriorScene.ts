import Phaser from 'phaser';
import { GameState, STORE_CONFIG } from '@party-game/shared-types';
import { StateBuffer } from '@party-game/game-framework';

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
  private placedObjectSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private stateBuffer: StateBuffer | null = null;
  private latestState: GameState | null = null;

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

    // Load object spritesheets for placed objects
    this.load.spritesheet('grass-biom-sprites', '/assets/sprout-land/Objects/Basic_Grass_Biom_things.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('basic-furniture-sprites', '/assets/sprout-land/Objects/Basic_Furniture.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // Set pixel-perfect filter after load
    this.load.on('complete', () => {
      this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('tilled-dirt').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-walls').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-furniture').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('grass-biom-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-furniture-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    this.events.on('state-update', (state: GameState) => {
      this.latestState = state;
      this.handleStateUpdate(state);
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
        this.renderPlayerPositions(interpolated.state);
      }
    } else if (this.latestState) {
      // Fallback to latest state if no buffer available
      this.renderPlayerPositions(this.latestState);
    }
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

    // Create new players and update non-position state
    interiorPlayers.forEach(player => {
      if (!this.playerSprites.has(player.id)) {
        this.createPlayerSprite(player);
      }
      // Update animation and other non-position state
      this.updatePlayerState(player);
    });

    // Remove players who left interior or disconnected
    this.playerSprites.forEach((playerData, playerId) => {
      const stillInInterior = interiorPlayers.find(p => p.id === playerId);
      if (!stillInInterior) {
        playerData.container.destroy();
        this.playerSprites.delete(playerId);
      }
    });

    // Update placed objects
    const placedObjects = (state.gameData?.placedObjects || []) as Array<any>;

    // Filter for interior objects only (not main map)
    const interiorObjects = placedObjects.filter(
      (obj: any) => obj.mapId !== 'main' && obj.mapId.startsWith('interior-')
    );

    // Create new placed object sprites
    interiorObjects.forEach((obj: any) => {
      if (!this.placedObjectSprites.has(obj.id)) {
        this.createPlacedObjectSprite(obj);
      }
    });

    // Remove placed objects no longer in state
    const objectIds = new Set(interiorObjects.map((o: any) => o.id));
    this.placedObjectSprites.forEach((sprite, objId) => {
      if (!objectIds.has(objId)) {
        sprite.destroy();
        this.placedObjectSprites.delete(objId);
      }
    });
    // Note: updateDepthSorting is now called in renderPlayerPositions (every frame)
  }

  private createPlacedObjectSprite(obj: any): void {
    // Get item definition from store config
    const item = STORE_CONFIG.placeableItems.find(i => i.id === obj.itemId);
    if (!item) {
      console.error(`Unknown item: ${obj.itemId}`);
      return;
    }

    // Calculate frame: use column/row if provided, otherwise use frame directly
    let frameIndex: number;
    if (item.column !== undefined && item.row !== undefined && item.columns !== undefined) {
      frameIndex = item.row * item.columns + item.column;
    } else if (item.frame !== undefined) {
      frameIndex = item.frame;
    } else {
      console.error(`Item ${item.id} missing both frame and column/row configuration`);
      return;
    }

    // Create sprite using item's spritesheet and calculated frame
    const sprite = this.add.sprite(obj.x, obj.y, item.spritesheet, frameIndex);
    sprite.setScale(4); // Match tilemap scale

    // Apply color tint if specified
    if (item.color) {
      sprite.setTint(parseInt(item.color.replace('#', '0x')));
    }

    // Store placed object data on sprite for depth sorting
    (sprite as any).__placedObjectData = obj;

    this.placedObjectSprites.set(obj.id, sprite);
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

  /** Update non-position state (animations, etc.) - called on state updates */
  private updatePlayerState(player: MovementPlayerData): void {
    const playerData = this.playerSprites.get(player.id);
    if (!playerData) return;

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

  /** Render player positions from interpolated state - called every frame */
  private renderPlayerPositions(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Only render players in interior
    for (const [id, player] of Object.entries(players)) {
      if (player.customData?.currentMapId && player.customData.currentMapId !== 'main') {
        const playerData = this.playerSprites.get(id);
        if (playerData) {
          // Update position from interpolated state
          playerData.container.x = player.customData.x;
          playerData.container.y = player.customData.y;
        }
      }
    }

    // Update depth sorting after position changes
    this.updateDepthSorting();
  }

  private updateDepthSorting(): void {
    // Separate placed objects into two groups
    const underPlayerObjects: Phaser.GameObjects.Sprite[] = [];
    const depthSortedObjects: Phaser.GameObjects.Sprite[] = [];

    this.placedObjectSprites.forEach((sprite) => {
      // Get the placed object data from game state to check its item config
      const placedObj = (sprite as any).__placedObjectData;
      if (placedObj) {
        const item = STORE_CONFIG.placeableItems.find(i => i.id === placedObj.itemId);
        if (item?.alwaysUnderPlayer) {
          underPlayerObjects.push(sprite);
        } else {
          depthSortedObjects.push(sprite);
        }
      } else {
        // Default to depth sorting if no data found
        depthSortedObjects.push(sprite);
      }
    });

    // Set fixed depth for objects that should always be under players
    underPlayerObjects.forEach((sprite, index) => {
      sprite.setDepth(index);
    });

    const baseDepth = underPlayerObjects.length;

    // Sort players and depth-sorted placed objects by Y position
    const allSprites: Array<{ obj: any; y: number }> = [];

    // Add players
    this.playerSprites.forEach(playerData => {
      allSprites.push({
        obj: playerData.container,
        y: playerData.container.y
      });
    });

    // Add placed objects that depth-sort with players
    depthSortedObjects.forEach(sprite => {
      allSprites.push({
        obj: sprite,
        y: sprite.y
      });
    });

    // Sort by Y position
    allSprites.sort((a, b) => a.y - b.y);

    // Update depths for sorted sprites (offset by baseDepth)
    allSprites.forEach((item, index) => {
      item.obj.setDepth(baseDepth + index);
    });
  }
}
