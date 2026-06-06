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

export class FieldScene extends Phaser.Scene {
  private playerSprites: Map<string, PlayerContainer> = new Map();
  private placedObjectSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private followingPlayerId: string | null = null;
  private stateBuffer: StateBuffer | null = null;
  private latestState: GameState | null = null;

  constructor() {
    super({ key: 'FieldScene' });
  }

  preload() {
    this.load.spritesheet('character',
      '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load field tilemap
    this.load.tilemapTiledJSON('fieldMap', '/assets/sprout-land/tilemaps/field-interior.json');

    // Load tilesets
    this.load.image('tilled-dirt', '/assets/sprout-land/Tilesets/Tilled_Dirt.png');
    this.load.image('grass', '/assets/sprout-land/Tilesets/Grass.png');
    this.load.image('water', '/assets/sprout-land/Tilesets/Water.png');

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
      this.textures.get('grass').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('water').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('grass-biom-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-furniture-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }

  create() {
    // Create tilemap
    const map = this.make.tilemap({ key: 'fieldMap' });

    // Add tilesets (names must match JSON)
    const dirtTileset = map.addTilesetImage('Tilled_Dirt', 'tilled-dirt');
    const grassTileset = map.addTilesetImage('Grass', 'grass');
    const waterTileset = map.addTilesetImage('Water', 'water');

    // Create layers (bottom to top) - pass all tilesets to each layer
    const allTilesets = [dirtTileset!, grassTileset!, waterTileset!];
    const groundLayer = map.createLayer('Ground', allTilesets, 0, 0);
    const terrainLayer = map.createLayer('Terrain', allTilesets, 0, 0);
    const decorationsLayer = map.createLayer('Decorations', allTilesets, 0, 0);

    // Scale layers to 4x
    groundLayer?.setScale(4);
    terrainLayer?.setScale(4);
    decorationsLayer?.setScale(4);

    // Set world bounds to match scaled map (12 tiles wide x 40 tiles tall)
    const worldWidth = 768;   // 12 tiles * 16 * 4
    const worldHeight = 2560; // 40 tiles * 16 * 4
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Setup camera
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Camera will follow the player when they're created
    // Deadzone keeps player in center area while allowing some movement
    this.cameras.main.setDeadzone(200, 150);

    // Create animations
    this.createAnimations();

    // Setup state update listener
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

    // Walking animations
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

    // Filter to only show players in field (currentMapId starts with "field-")
    const fieldPlayers = Object.values(players).filter(
      p => p.customData.currentMapId && p.customData.currentMapId.startsWith('field-')
    );

    // Create new players and update non-position state
    fieldPlayers.forEach(player => {
      if (!this.playerSprites.has(player.id)) {
        this.createPlayerSprite(player);
      }
      // Update animation state
      this.updatePlayerState(player);
    });

    // Remove players who left the field
    this.playerSprites.forEach((playerData, playerId) => {
      const stillInField = fieldPlayers.find(p => p.id === playerId);
      if (!stillInField) {
        playerData.container.destroy();
        this.playerSprites.delete(playerId);

        // If this was the player we were following, stop following
        if (this.followingPlayerId === playerId) {
          this.followingPlayerId = null;
        }
      }
    });

    // Make camera follow the first player in the field
    if (fieldPlayers.length > 0 && !this.followingPlayerId) {
      const firstPlayer = fieldPlayers[0];
      const playerSprite = this.playerSprites.get(firstPlayer.id);
      if (playerSprite) {
        // Instantly center camera on player first time (no smooth transition)
        this.cameras.main.centerOn(playerSprite.container.x, playerSprite.container.y);

        // Then start smooth following for subsequent movement
        this.cameras.main.startFollow(playerSprite.container, true, 0.1, 0.1);
        this.followingPlayerId = firstPlayer.id;
      }
    }

    // Handle placed objects in field
    const placedObjects = ((state.gameData as any)?.placedObjects || []).filter(
      (obj: any) => obj.mapId && obj.mapId.startsWith('field-')
    );

    placedObjects.forEach((obj: any) => {
      if (!this.placedObjectSprites.has(obj.id)) {
        this.createPlacedObjectSprite(obj);
      }
    });

    const objectIds = new Set(placedObjects.map((obj: any) => obj.id));
    this.placedObjectSprites.forEach((sprite, id) => {
      if (!objectIds.has(id)) {
        sprite.destroy();
        this.placedObjectSprites.delete(id);
      }
    });
    // Note: updateDepthSorting is now called in renderPlayerPositions (every frame)
  }

  private createPlacedObjectSprite(obj: any): void {
    const item = STORE_CONFIG.placeableItems.find(i => i.id === obj.itemId);
    if (!item) {
      console.error(`Unknown item: ${obj.itemId}`);
      return;
    }

    let frame: number;
    if (item.column !== undefined && item.row !== undefined && item.columns !== undefined) {
      frame = item.row * item.columns + item.column;
    } else if (item.frame !== undefined) {
      frame = item.frame;
    } else {
      console.error(`Item ${item.id} missing both frame and column/row configuration`);
      return;
    }

    const sprite = this.add.sprite(obj.x, obj.y, item.spritesheet, frame);
    sprite.setScale(4);

    if (item.color) {
      sprite.setTint(parseInt(item.color.replace('#', '0x')));
    }

    (sprite as any).__placedObjectData = obj;
    this.placedObjectSprites.set(obj.id, sprite);
  }

  private createPlayerSprite(player: MovementPlayerData): void {
    const container = this.add.container(player.customData.x, player.customData.y);

    const sprite = this.add.sprite(0, 0, 'character');
    sprite.setScale(4);
    sprite.setOrigin(0.5, 0.5);
    sprite.play('idle-down');

    const spriteHeight = sprite.displayHeight;
    const nameText = this.add.text(0, -spriteHeight / 2 - 20, player.name, {
      fontSize: '16px',
      color: player.color,
      stroke: '#000000',
      strokeThickness: 3,
      fontFamily: 'Arial'
    });
    nameText.setOrigin(0.5, 1);

    container.add([sprite, nameText]);
    container.setDepth(1000);

    this.playerSprites.set(player.id, {
      container,
      sprite,
      nameText,
      currentDirection: 'down'
    });
  }

  /** Update non-position state (animations, etc.) - called on state updates */
  private updatePlayerState(player: MovementPlayerData): void {
    const playerSprite = this.playerSprites.get(player.id);
    if (!playerSprite) return;

    const vx = player.customData.vx;
    const vy = player.customData.vy;

    if (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
      // Moving - update direction and play walk animation
      let direction = playerSprite.currentDirection;

      if (Math.abs(vx) > Math.abs(vy)) {
        direction = vx > 0 ? 'right' : 'left';
      } else {
        direction = vy > 0 ? 'down' : 'up';
      }

      if (direction !== playerSprite.currentDirection) {
        playerSprite.currentDirection = direction;
        playerSprite.sprite.play(`walk-${direction}`, true);
      } else if (!playerSprite.sprite.anims.isPlaying) {
        playerSprite.sprite.play(`walk-${direction}`, true);
      }
    } else {
      // Idle
      const idleAnim = `idle-${playerSprite.currentDirection}`;
      if (playerSprite.sprite.anims.currentAnim?.key !== idleAnim) {
        playerSprite.sprite.play(idleAnim, true);
      }
    }
  }

  /** Render player positions from interpolated state - called every frame */
  private renderPlayerPositions(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Only render players in field
    for (const [id, player] of Object.entries(players)) {
      if (player.customData?.currentMapId?.startsWith('field-')) {
        const playerSprite = this.playerSprites.get(id);
        if (playerSprite) {
          // Update position from interpolated state
          playerSprite.container.x = player.customData.x;
          playerSprite.container.y = player.customData.y;
        }
      }
    }

    // Update depth sorting after position changes
    this.updateDepthSorting();
  }

  private updateDepthSorting(): void {
    const underObjects: Phaser.GameObjects.Sprite[] = [];
    const normalObjects: Phaser.GameObjects.Sprite[] = [];

    this.placedObjectSprites.forEach(sprite => {
      const data = (sprite as any).__placedObjectData;
      if (data) {
        const item = STORE_CONFIG.placeableItems.find(i => i.id === data.itemId);
        if (item?.alwaysUnderPlayer) {
          underObjects.push(sprite);
        } else {
          normalObjects.push(sprite);
        }
      } else {
        normalObjects.push(sprite);
      }
    });

    underObjects.forEach((sprite, index) => {
      sprite.setDepth(index);
    });

    const baseDepth = underObjects.length;
    const sortableObjects: { obj: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite, y: number }[] = [];

    this.playerSprites.forEach(player => {
      sortableObjects.push({ obj: player.container, y: player.container.y });
    });

    normalObjects.forEach(sprite => {
      sortableObjects.push({ obj: sprite, y: sprite.y });
    });

    sortableObjects.sort((a, b) => a.y - b.y);

    sortableObjects.forEach((item, index) => {
      item.obj.setDepth(baseDepth + index);
    });
  }
}
