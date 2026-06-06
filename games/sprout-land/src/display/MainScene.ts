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
  coinText: Phaser.GameObjects.Text;
  currentDirection: string;
}

export class MainScene extends Phaser.Scene {
  private playerSprites: Map<string, PlayerContainer> = new Map();
  private coinSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private staticObjectSprites: Phaser.GameObjects.Sprite[] = [];
  private aboveSprites: Phaser.GameObjects.Sprite[] = []; // Sprites that render above players
  private placedObjectSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private showDebug: boolean = false; // Toggle to show/hide collision boxes
  private stateBuffer: StateBuffer | null = null;
  private latestState: GameState | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    this.load.spritesheet('character',
      '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load tilemap
    this.load.tilemapTiledJSON('farmMap', '/assets/sprout-land/tilemaps/farm-tilemap.json');

    // Load tilesets
    this.load.image('grass', '/assets/sprout-land/Tilesets/Grass.png');
    this.load.image('tilled-dirt', '/assets/sprout-land/Tilesets/Tilled_Dirt.png');
    this.load.image('water', '/assets/sprout-land/Tilesets/Water.png');
    this.load.image('decorations', '/assets/sprout-land/Tilesets/Fences.png');
    this.load.image('wooden-house', '/assets/sprout-land/Tilesets/Wooden House.png');
    this.load.image('wooden-house-roof', '/assets/sprout-land/Tilesets/Wooden_House_Roof_Tilset.png');
    this.load.image('wooden-house-walls', '/assets/sprout-land/Tilesets/Wooden_House_Walls_Tilset.png');

    // Load object tilesets as images for tilemap layers
    this.load.image('paths', '/assets/sprout-land/Objects/Paths.png');
    this.load.image('grass-biom-things', '/assets/sprout-land/Objects/Basic_Grass_Biom_things.png');
    this.load.image('basic-plants', '/assets/sprout-land/Objects/Basic_Plants.png');
    this.load.image('wood-bridge', '/assets/sprout-land/Objects/Wood_Bridge.png');

    // Load object tilesets as spritesheets for static objects
    this.load.spritesheet('decorations-sprites', '/assets/sprout-land/Tilesets/Fences.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('paths-sprites', '/assets/sprout-land/Objects/Paths.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('grass-biom-sprites', '/assets/sprout-land/Objects/Basic_Grass_Biom_things.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('basic-plants-sprites', '/assets/sprout-land/Objects/Basic_Plants.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('wood-bridge-sprites', '/assets/sprout-land/Objects/Wood_Bridge.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('wooden-house-sprites', '/assets/sprout-land/Tilesets/Wooden House.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('wooden-house-roof-sprites', '/assets/sprout-land/Tilesets/Wooden_House_Roof_Tilset.png', {
      frameWidth: 16,
      frameHeight: 16
    });
    this.load.spritesheet('wooden-house-walls-sprites', '/assets/sprout-land/Tilesets/Wooden_House_Walls_Tilset.png', {
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
      // Apply to tilesets
      this.textures.get('grass').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('tilled-dirt').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('water').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('decorations').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-roof').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-walls').setFilter(Phaser.Textures.FilterMode.NEAREST);
      // Apply to object tileset images
      this.textures.get('paths').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('grass-biom-things').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-plants').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wood-bridge').setFilter(Phaser.Textures.FilterMode.NEAREST);
      // Apply to object tileset spritesheets
      this.textures.get('decorations-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('paths-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('grass-biom-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-plants-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wood-bridge-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-roof-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('wooden-house-walls-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.textures.get('basic-furniture-sprites').setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }

  create() {
    // Create tilemap
    const map = this.make.tilemap({ key: 'farmMap' });

    // Add tilesets (names must match JSON)
    const grassTileset = map.addTilesetImage('Grass', 'grass');
    const dirtTileset = map.addTilesetImage('Tilled_Dirt', 'tilled-dirt');
    const waterTileset = map.addTilesetImage('Water', 'water');
    const decorationsTileset = map.addTilesetImage('Fences', 'decorations');
    const pathsTileset = map.addTilesetImage('Paths', 'paths');
    const grassBiomTileset = map.addTilesetImage('Basic_Grass_Biom_things', 'grass-biom-things');
    const basicPlantsTileset = map.addTilesetImage('Basic_Plants', 'basic-plants');
    const woodBridgeTileset = map.addTilesetImage('Wood_Bridge', 'wood-bridge');
    const woodenHouseTileset = map.addTilesetImage('Wooden House', 'wooden-house');
    const woodenHouseRoofTileset = map.addTilesetImage('Wooden_House_Roof_Tilset', 'wooden-house-roof');
    const woodenHouseWallsTileset = map.addTilesetImage('Wooden_House_Walls_Tilset', 'wooden-house-walls');

    // Create layers (bottom to top)
    const waterLayer = map.createLayer('Water', [waterTileset!], 0, 0);
    const groundLayer = map.createLayer('Ground', [grassTileset!], 0, 0);
    const terrainLayer = map.createLayer('Terrain', [
      grassTileset!,
      dirtTileset!,
      pathsTileset!,
      grassBiomTileset!,
      basicPlantsTileset!,
      woodBridgeTileset!,
      woodenHouseTileset!,
      woodenHouseRoofTileset!,
      woodenHouseWallsTileset!
    ], 0, 0);
    const decorationsLayer = map.createLayer('Decorations', [
      decorationsTileset!,
      woodenHouseTileset!,
      woodenHouseRoofTileset!,
      woodenHouseWallsTileset!
    ], 0, 0);
    const aboveLayer = map.createLayer('Above', [
      decorationsTileset!,
      pathsTileset!,
      grassBiomTileset!,
      basicPlantsTileset!,
      woodBridgeTileset!,
      woodenHouseTileset!,
      woodenHouseRoofTileset!,
      woodenHouseWallsTileset!
    ], 0, 0);

    // Scale to 4x (16px tiles → 64px)
    waterLayer?.setScale(4);
    groundLayer?.setScale(4);
    terrainLayer?.setScale(4);
    decorationsLayer?.setScale(4);
    aboveLayer?.setScale(4);

    // Make decoration tile layers invisible - we'll create individual sprites for depth sorting
    decorationsLayer?.setVisible(false);
    aboveLayer?.setVisible(false);

    // Create static object sprites from Decorations layer for rendering with depth
    this.createStaticObjectSprites(map, decorationsLayer || undefined);

    // Create sprites from Above layer (always render above players)
    this.createAboveSprites(map, aboveLayer || undefined);

    // Create debug visualization
    if (this.showDebug) {
      this.debugGraphics = this.add.graphics();
      this.drawDebugCollisionBoxes();
    }

    // Add grid for visual reference
    this.createGrid();

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
        this.onRenderPlayerPositions(interpolated.state);
      }
    } else if (this.latestState) {
      // Fallback to latest state if no buffer available
      this.onRenderPlayerPositions(this.latestState);
    }
  }

  /** Render player positions from interpolated state - called every frame */
  private onRenderPlayerPositions(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Only render players on main map
    const mainMapPlayers = Object.values(players).filter(
      p => !p.customData?.currentMapId || p.customData.currentMapId === 'main'
    );

    // Update positions for existing players
    mainMapPlayers.forEach(player => {
      const playerData = this.playerSprites.get(player.id);
      if (playerData && player.customData) {
        // Update position from interpolated state
        playerData.container.setPosition(player.customData.x, player.customData.y);
      }
    });

    // Update depth sorting after position changes
    this.updateDepthSorting();
  }

  private createGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2d2d44, 0.1); // Reduced opacity for cleaner farm view

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

  private createStaticObjectSprites(map: Phaser.Tilemaps.Tilemap, layer?: Phaser.Tilemaps.TilemapLayer): void {
    if (!layer) {
      console.log('Decorations layer not found');
      return;
    }

    let objectCount = 0;

    // Iterate through the Decorations tile layer to create visual sprites for depth sorting
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = layer.getTileAt(x, y);
        if (!tile || tile.index === 0) continue;

        const gid = tile.index;

        // Calculate world position (tiles are 16x16, scaled 4x = 64x64)
        // Tile coordinates are top-left, we want center for sprite
        const worldX = (x * 16 + 8) * 4; // Center of tile
        const worldY = (y * 16 + 8) * 4; // Center of tile

        // Create sprite based on GID range
        let sprite: Phaser.GameObjects.Sprite | null = null;

        if (gid >= 159 && gid <= 174) {
          // Fences (GID 159-174)
          sprite = this.add.sprite(worldX, worldY, 'decorations-sprites', gid - 159);
        } else if (gid >= 175 && gid <= 190) {
          // Paths (GID 175-190) - 4x4 grid = 16 tiles
          sprite = this.add.sprite(worldX, worldY, 'paths-sprites', gid - 175);
        } else if (gid >= 191 && gid <= 235) {
          // Basic_Grass_Biom_things (GID 191-235) - 9x5 grid = 45 tiles
          sprite = this.add.sprite(worldX, worldY, 'grass-biom-sprites', gid - 191);
        } else if (gid >= 236 && gid <= 247) {
          // Basic_Plants (GID 236-247) - 6x2 grid = 12 tiles
          sprite = this.add.sprite(worldX, worldY, 'basic-plants-sprites', gid - 236);
        } else if (gid >= 248 && gid <= 262) {
          // Wood_Bridge (GID 248-262) - 5x3 grid = 15 tiles
          sprite = this.add.sprite(worldX, worldY, 'wood-bridge-sprites', gid - 248);
        } else if (gid >= 263 && gid <= 297) {
          // Wooden House (GID 263-297) - 7x5 grid = 35 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-sprites', gid - 263);
        } else if (gid >= 298 && gid <= 332) {
          // Wooden_House_Roof_Tilset (GID 298-332) - 7x5 grid = 35 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-roof-sprites', gid - 298);
        } else if (gid >= 333 && gid <= 347) {
          // Wooden_House_Walls_Tilset (GID 333-347) - 5x3 grid = 15 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-walls-sprites', gid - 333);
        }

        if (sprite) {
          sprite.setScale(4);
          this.staticObjectSprites.push(sprite);
          objectCount++;
        }
      }
    }

    console.log(`Created ${objectCount} static object sprites for depth sorting (collision handled by server)`);
  }

  private createAboveSprites(map: Phaser.Tilemaps.Tilemap, layer?: Phaser.Tilemaps.TilemapLayer): void {
    if (!layer) {
      console.log('Above layer not found');
      return;
    }

    let objectCount = 0;

    // Iterate through the Above tile layer to create visual sprites that render above players
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = layer.getTileAt(x, y);
        if (!tile || tile.index === 0) continue;

        const gid = tile.index;

        // Calculate world position (tiles are 16x16, scaled 4x = 64x64)
        // Tile coordinates are top-left, we want center for sprite
        const worldX = (x * 16 + 8) * 4; // Center of tile
        const worldY = (y * 16 + 8) * 4; // Center of tile

        // Create sprite based on GID range
        let sprite: Phaser.GameObjects.Sprite | null = null;

        if (gid >= 159 && gid <= 174) {
          // Fences (GID 159-174)
          sprite = this.add.sprite(worldX, worldY, 'decorations-sprites', gid - 159);
        } else if (gid >= 175 && gid <= 190) {
          // Paths (GID 175-190) - 4x4 grid = 16 tiles
          sprite = this.add.sprite(worldX, worldY, 'paths-sprites', gid - 175);
        } else if (gid >= 191 && gid <= 235) {
          // Basic_Grass_Biom_things (GID 191-235) - 9x5 grid = 45 tiles
          sprite = this.add.sprite(worldX, worldY, 'grass-biom-sprites', gid - 191);
        } else if (gid >= 236 && gid <= 247) {
          // Basic_Plants (GID 236-247) - 6x2 grid = 12 tiles
          sprite = this.add.sprite(worldX, worldY, 'basic-plants-sprites', gid - 236);
        } else if (gid >= 248 && gid <= 262) {
          // Wood_Bridge (GID 248-262) - 5x3 grid = 15 tiles
          sprite = this.add.sprite(worldX, worldY, 'wood-bridge-sprites', gid - 248);
        } else if (gid >= 263 && gid <= 297) {
          // Wooden House (GID 263-297) - 7x5 grid = 35 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-sprites', gid - 263);
        } else if (gid >= 298 && gid <= 332) {
          // Wooden_House_Roof_Tilset (GID 298-332) - 7x5 grid = 35 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-roof-sprites', gid - 298);
        } else if (gid >= 333 && gid <= 347) {
          // Wooden_House_Walls_Tilset (GID 333-347) - 5x3 grid = 15 tiles
          sprite = this.add.sprite(worldX, worldY, 'wooden-house-walls-sprites', gid - 333);
        }

        if (sprite) {
          sprite.setScale(4);
          this.aboveSprites.push(sprite);
          objectCount++;
        }
      }
    }

    console.log(`Created ${objectCount} above sprites (always render above players)`);
  }

  private drawDebugCollisionBoxes(): void {
    if (!this.debugGraphics) return;

    // Load and parse tilemap to get collision rectangles (same as server)
    const tilemapData = this.cache.tilemap.get('farmMap');
    if (!tilemapData) return;

    const data = tilemapData.data;

    // Draw collision rectangles
    const staticObjectsLayer = data.layers.find((l: any) => l.name === 'StaticObjects' && l.type === 'objectgroup');
    if (staticObjectsLayer && staticObjectsLayer.objects) {
      this.debugGraphics.lineStyle(2, 0x00ff00, 0.8); // Green outline
      this.debugGraphics.fillStyle(0x00ff00, 0.1); // Semi-transparent green fill

      staticObjectsLayer.objects.forEach((obj: any) => {
        if (obj.visible === false) return;

        // Scale coordinates (Tiled coordinates are in pixels, scaled 4x)
        const x = obj.x * 4;
        const y = obj.y * 4;
        const width = obj.width * 4;
        const height = obj.height * 4;

        // Draw rectangle
        this.debugGraphics!.strokeRect(x, y, width, height);
        this.debugGraphics!.fillRect(x, y, width, height);
      });

      console.log(`Drew ${staticObjectsLayer.objects.length} debug collision boxes from StaticObjects layer`);
    }

    // Draw spawn zones
    const spawnZoneLayer = data.layers.find((l: any) => l.name === 'SpawnZone' && l.type === 'objectgroup');
    if (spawnZoneLayer && spawnZoneLayer.objects) {
      this.debugGraphics.lineStyle(2, 0x0000ff, 0.8); // Blue outline
      this.debugGraphics.fillStyle(0x0000ff, 0.05); // Very transparent blue fill

      spawnZoneLayer.objects.forEach((obj: any) => {
        if (obj.visible === false) return;

        // Scale coordinates (Tiled coordinates are in pixels, scaled 4x)
        const x = obj.x * 4;
        const y = obj.y * 4;
        const width = obj.width * 4;
        const height = obj.height * 4;

        // Draw rectangle
        this.debugGraphics!.strokeRect(x, y, width, height);
        this.debugGraphics!.fillRect(x, y, width, height);
      });

      console.log(`Drew ${spawnZoneLayer.objects.length} spawn zones from SpawnZone layer`);
    }
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

    // Sort players, static objects, and depth-sorted placed objects by Y position
    const allSprites: Array<{ obj: any; y: number }> = [];

    // Add players
    this.playerSprites.forEach(playerData => {
      allSprites.push({
        obj: playerData.container,
        y: playerData.container.y
      });
    });

    // Add static objects (decorations that depth-sort with players)
    this.staticObjectSprites.forEach(sprite => {
      allSprites.push({
        obj: sprite,
        y: sprite.y
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

    // Set above sprites to render on top (higher depth than all sorted sprites)
    const aboveDepthStart = baseDepth + allSprites.length;
    this.aboveSprites.forEach((sprite, index) => {
      sprite.setDepth(aboveDepthStart + index);
    });

    // Draw player collision boxes for debug
    if (this.showDebug && this.debugGraphics) {
      this.debugGraphics.clear();

      // Redraw static object collision boxes
      this.drawDebugCollisionBoxes();

      // Draw player collision boxes
      this.debugGraphics.lineStyle(2, 0xff0000, 0.8); // Red outline for players
      this.debugGraphics.fillStyle(0xff0000, 0.1); // Semi-transparent red fill

      this.playerSprites.forEach(playerData => {
        // Match server-side collision box dimensions
        const collisionWidth = 50; // Same as server
        const collisionHeight = 28.8; // Same as server (half of original 57.6)
        const collisionTopMargin = 28.8; // Same as server (equal to new height)

        const x = playerData.container.x - collisionWidth / 2;
        const y = playerData.container.y - collisionHeight / 2 + collisionTopMargin;

        this.debugGraphics!.strokeRect(x, y, collisionWidth, collisionHeight);
        this.debugGraphics!.fillRect(x, y, collisionWidth, collisionHeight);
      });
    }
  }

  private handleStateUpdate(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Only show players on main map
    const mainMapPlayers = Object.values(players).filter(
      p => !p.customData.currentMapId || p.customData.currentMapId === 'main'
    );

    // Create new players (but don't update positions here - that happens in update loop)
    mainMapPlayers.forEach(player => {
      if (!this.playerSprites.has(player.id)) {
        this.createPlayerSprite(player);
      }
      // Update non-position state (animations, coins, etc.)
      this.updatePlayerState(player);
    });

    // Remove players who left main map or disconnected
    this.playerSprites.forEach((playerData, playerId) => {
      const stillOnMain = mainMapPlayers.find(p => p.id === playerId);
      if (!stillOnMain) {
        playerData.container.destroy();
        this.playerSprites.delete(playerId);
      }
    });

    // Update coins
    const coins = (state.gameData?.coins || []) as Array<{ id: string, x: number, y: number }>;

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

    // Update placed objects
    const placedObjects = (state.gameData?.placedObjects || []) as Array<any>;

    // Filter for main map objects only
    const mainMapObjects = placedObjects.filter(
      (obj: any) => obj.mapId === 'main'
    );

    // Create new placed object sprites
    mainMapObjects.forEach((obj: any) => {
      if (!this.placedObjectSprites.has(obj.id)) {
        this.createPlacedObjectSprite(obj);
      }
    });

    // Remove placed objects no longer in state
    const objectIds = new Set(mainMapObjects.map((o: any) => o.id));
    this.placedObjectSprites.forEach((sprite, objId) => {
      if (!objectIds.has(objId)) {
        sprite.destroy();
        this.placedObjectSprites.delete(objId);
      }
    });
    // Note: updateDepthSorting is now called in renderPlayerPositions (every frame)
  }

  private createCoin(coin: { id: string, x: number, y: number }): void {
    const circle = this.add.circle(coin.x, coin.y, 10, 0xFFD700);
    this.coinSprites.set(coin.id, circle);
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
    sprite.setScale(4.0); // 2x scale for pixel art
    sprite.setOrigin(0.5, 0.5);
    sprite.play('idle-down'); // Default animation

    // Calculate sprite dimensions for text positioning
    const spriteHeight = sprite.displayHeight;

    // Name text (positioned above the sprite)
    const nameY = (-(spriteHeight / 2)) + 48;
    const nameText = this.add.text(0, nameY, player.name, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 }
    });
    nameText.setOrigin(0.5, 1); // Bottom-center origin

    // Coin counter text (above name text)
    const coinY = nameY - 24;
    const coinText = this.add.text(0, coinY, `Coins: ${player.customData.coins}`, {
      fontSize: '20px',
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

  /** Update non-position state (animations, coins, etc.) - called on state updates */
  private updatePlayerState(player: MovementPlayerData): void {
    const playerData = this.playerSprites.get(player.id);
    if (!playerData) return;

    const { sprite, coinText, currentDirection } = playerData;

    // Calculate velocity magnitude
    const speed = Math.sqrt(
      player.customData.vx * player.customData.vx +
      player.customData.vy * player.customData.vy
    );

    // Determine direction (prioritize horizontal)
    let direction = currentDirection;
    if (player.customData.vx !== 0) {
      direction = player.customData.vx > 0 ? 'right' : 'left';
    } else if (player.customData.vy !== 0) {
      direction = player.customData.vy > 0 ? 'down' : 'up';
    }

    // Store the new direction
    playerData.currentDirection = direction;

    // Determine animation state
    const movementThreshold = 1;
    const state = speed > movementThreshold ? 'walk' : 'idle';
    const animationKey = `${state}-${direction}`;

    // Play animation if different from current
    if (sprite.anims.currentAnim?.key !== animationKey) {
      sprite.play(animationKey, true);
    }

    // Adjust animation speed based on velocity
    if (state === 'walk') {
      // Use a fixed reference speed for animation scaling
      // This ensures consistent animation speed regardless of upgrades
      const referenceSpeed = 200; // MovementPlayer.baseMaxSpeed
      const normalizedSpeed = Math.min(speed / referenceSpeed, 4.0); // Allow up to 4x speed
      // timeScale: 0.25 at minimum (25% speed), up to 4.0 for fast players
      const minTimeScale = 0.25;
      sprite.anims.timeScale = Math.max(minTimeScale, normalizedSpeed);
    } else {
      sprite.anims.timeScale = 1.0; // Reset to normal speed for idle
    }

    // Update coin counter
    coinText.setText(`Coins: ${player.customData.coins}`);

    // Update opacity based on connection status
    playerData.container.setAlpha(player.connected ? 1 : 0.5);
  }

  /** Render player positions from interpolated state - called every frame */
  private renderPlayerPositions(state: GameState): void {
    const players = state.players as Record<string, MovementPlayerData>;

    // Only render players on main map
    for (const [id, player] of Object.entries(players)) {
      if (!player.customData?.currentMapId || player.customData.currentMapId === 'main') {
        const playerData = this.playerSprites.get(id);
        if (playerData) {
          // Update position from interpolated state
          playerData.container.setPosition(player.customData.x, player.customData.y);
        }
      }
    }

    // Update depth sorting after position changes
    this.updateDepthSorting();
  }
}
