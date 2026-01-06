import { BaseGameState, BasePlayer } from '@party-game/game-framework/server';
import { MovementPlayer } from './MovementPlayer.js';
import { MapCollisionParser, CollisionRect, TilemapData, STORE_CONFIG, PlacedObject } from '@party-game/shared-types';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Coin {
  id: string;
  x: number;
  y: number;
}

interface Portal {
  id: string;
  x: number;          // World X position (scaled)
  y: number;          // World Y position (scaled)
  width: number;      // Portal rectangle width (scaled)
  height: number;     // Portal rectangle height (scaled)
  worldName: string;  // e.g., "PLAYER_HOUSE"
}

export class MovementGameState extends BaseGameState {
  private worldWidth = 1920;
  private worldHeight = 1080;
  private coins: Coin[] = [];
  private maxCoins = 20;
  private coinRadius = 10;
  private basePlayerRadius = 20;
  private nextCoinId = 0;
  private collisionRects: CollisionRect[] = [];
  private spawnZones: CollisionRect[] = [];
  private portals: Portal[] = [];
  private interiorPortals: Portal[] = [];
  private interiorCollisionRects: CollisionRect[] = [];
  private fieldPortals: Portal[] = [];
  private fieldCollisionRects: CollisionRect[] = [];
  private placedObjects: PlacedObject[] = [];
  private nextObjectId = 0;

  constructor() {
    super();
    this.loadMapData();
    this.loadInteriorMapData();
    this.loadFieldMapData();
  }

  private loadMapData(): void {
    try {
      // Load tilemap from public assets
      const tilemapPath = join(__dirname, '../../../game-display/public/assets/sprout-land/tilemaps/farm-tilemap.json');
      const tilemapJson = readFileSync(tilemapPath, 'utf-8');
      const tilemapData: TilemapData = JSON.parse(tilemapJson);

      // Parse StaticObjects layer (rectangle objects for collision)
      this.collisionRects = MapCollisionParser.parseObjectLayer(
        tilemapData,
        'StaticObjects',
        4 // 4x scale
      );

      // Parse SpawnZone layer (rectangle objects for player spawning)
      this.spawnZones = MapCollisionParser.parseObjectLayer(
        tilemapData,
        'SpawnZone',
        4 // 4x scale
      );

      console.log(`Loaded ${this.collisionRects.length} collision rectangles from StaticObjects layer`);
      console.log(`Loaded ${this.spawnZones.length} spawn zones from SpawnZone layer`);

      // Parse Portal layer (object layer with go_to_world properties)
      const portalLayer = tilemapData.layers.find(
        l => l.name === 'Portal' && l.type === 'objectgroup'
      );

      if (portalLayer?.objects) {
        portalLayer.objects.forEach((obj: any) => {
          // Extract go_to_world property
          let worldName = '';
          if (obj.properties) {
            const goToWorldProp = obj.properties.find((p: any) => p.name === 'go_to_world');
            if (goToWorldProp) {
              worldName = goToWorldProp.value;
            }
          }

          if (worldName) {
            this.portals.push({
              id: `portal-${obj.id}`,
              x: obj.x * 4,           // Scale to world coordinates
              y: obj.y * 4,
              width: obj.width * 4,
              height: obj.height * 4,
              worldName: worldName
            });
          }
        });
      }

      console.log(`Loaded ${this.portals.length} portals`);
    } catch (error) {
      console.error('Failed to load tilemap data:', error);
      this.collisionRects = [];
      this.spawnZones = [];
    }
  }

  private loadInteriorMapData(): void {
    try {
      // Use env var for assets path to avoid fragile relative paths
      const assetsBasePath = process.env.ASSETS_PATH || join(__dirname, '../../../game-display/public/assets');
      const tilemapPath = join(assetsBasePath, 'sprout-land/tilemaps/house-interior.json');
      const tilemapJson = readFileSync(tilemapPath, 'utf-8');
      const tilemapData: TilemapData = JSON.parse(tilemapJson);

      // Parse collision
      this.interiorCollisionRects = MapCollisionParser.parseObjectLayer(
        tilemapData,
        'StaticObjects',
        4
      );

      // Parse return portal
      const portalLayer = tilemapData.layers.find(
        l => l.name === 'Portal' && l.type === 'objectgroup'
      );

      if (portalLayer?.objects) {
        portalLayer.objects.forEach((obj: any) => {
          let worldName = '';
          if (obj.properties) {
            const goToWorldProp = obj.properties.find((p: any) => p.name === 'go_to_world');
            if (goToWorldProp) {
              worldName = goToWorldProp.value;
            }
          }

          if (worldName === 'MAIN') {
            this.interiorPortals.push({
              id: `interior-portal-${obj.id}`,
              x: obj.x * 4,
              y: obj.y * 4,
              width: obj.width * 4,
              height: obj.height * 4,
              worldName: worldName
            });
          }
        });
      }

      console.log(`Loaded ${this.interiorCollisionRects.length} interior collision rects`);
      console.log(`Loaded ${this.interiorPortals.length} interior return portals`);
    } catch (error) {
      console.error('Failed to load interior map:', error);
      this.interiorCollisionRects = [];
      this.interiorPortals = [];
    }
  }

  private loadFieldMapData(): void {
    try {
      // Use env var for assets path to avoid fragile relative paths
      const assetsBasePath = process.env.ASSETS_PATH || join(__dirname, '../../../game-display/public/assets');
      const tilemapPath = join(assetsBasePath, 'sprout-land/tilemaps/field-interior.json');
      const tilemapJson = readFileSync(tilemapPath, 'utf-8');
      const tilemapData: TilemapData = JSON.parse(tilemapJson);

      // Parse collision
      this.fieldCollisionRects = MapCollisionParser.parseObjectLayer(
        tilemapData,
        'StaticObjects',
        4
      );

      // Parse return portal
      const portalLayer = tilemapData.layers.find(
        l => l.name === 'Portal' && l.type === 'objectgroup'
      );

      if (portalLayer?.objects) {
        portalLayer.objects.forEach((obj: any) => {
          let worldName = '';
          if (obj.properties) {
            const goToWorldProp = obj.properties.find((p: any) => p.name === 'go_to_world');
            if (goToWorldProp) {
              worldName = goToWorldProp.value;
            }
          }

          if (worldName === 'MAIN') {
            this.fieldPortals.push({
              id: `field-portal-${obj.id}`,
              x: obj.x * 4,
              y: obj.y * 4,
              width: obj.width * 4,
              height: obj.height * 4,
              worldName: worldName
            });
          }
        });
      }

      console.log(`Loaded ${this.fieldCollisionRects.length} field collision rects`);
      console.log(`Loaded ${this.fieldPortals.length} field return portals`);
    } catch (error) {
      console.error('Failed to load field map:', error);
      this.fieldCollisionRects = [];
      this.fieldPortals = [];
    }
  }

  createPlayer(id: string, name: string): BasePlayer {
    let x: number;
    let y: number;

    // Spawn in a random spawn zone if available
    if (this.spawnZones.length > 0) {
      const zone = this.spawnZones[Math.floor(Math.random() * this.spawnZones.length)];
      // Random position within the spawn zone
      x = zone.x + Math.random() * zone.width;
      y = zone.y + Math.random() * zone.height;
    } else {
      // Fallback to random position if no spawn zones defined
      x = Math.random() * (this.worldWidth - 100) + 50;
      y = Math.random() * (this.worldHeight - 100) + 50;
      console.warn('No spawn zones found, using random position');
    }

    const player = new MovementPlayer(id, name, x, y);
    player.setCollisionRects(this.collisionRects);
    return player;
  }

  getGameData(): Record<string, any> {
    return {
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      coins: this.coins,
      portals: this.portals.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height
      })),
      placedObjects: this.placedObjects
    };
  }

  private isPositionValid(x: number, y: number, radius: number): boolean {
    // Check if position overlaps with any collision rectangles
    for (const rect of this.collisionRects) {
      // Expand rectangle by coin radius for proper collision checking
      const expandedRect = {
        x: rect.x - radius,
        y: rect.y - radius,
        width: rect.width + radius * 2,
        height: rect.height + radius * 2
      };

      // Check if point is inside expanded rectangle
      if (x >= expandedRect.x && x <= expandedRect.x + expandedRect.width &&
          y >= expandedRect.y && y <= expandedRect.y + expandedRect.height) {
        return false;
      }
    }
    return true;
  }

  private spawnCoin(): void {
    let x: number;
    let y: number;
    let attempts = 0;
    const maxAttempts = 100;

    // Keep trying until we find a valid position
    do {
      x = Math.random() * (this.worldWidth - 100) + 50;
      y = Math.random() * (this.worldHeight - 100) + 50;
      attempts++;
    } while (!this.isPositionValid(x, y, this.coinRadius) && attempts < maxAttempts);

    // Only spawn if we found a valid position
    if (attempts < maxAttempts) {
      const coin: Coin = {
        id: `coin-${this.nextCoinId++}`,
        x,
        y
      };
      this.coins.push(coin);
    }
  }

  private updatePlayerCollisionContext(player: MovementPlayer): void {
    if (player.currentMapId === 'main') {
      player.setCollisionRects(this.collisionRects);
    } else if (player.currentMapId.startsWith('interior-')) {
      player.setCollisionRects(this.interiorCollisionRects);
    } else if (player.currentMapId.startsWith('field-')) {
      player.setCollisionRects(this.fieldCollisionRects);
    } else {
      // Default fallback
      player.setCollisionRects(this.collisionRects);
    }
  }

  private enterPortal(player: MovementPlayer, portal: Portal): void {
    const now = Date.now();
    if (now - player.lastPortalTransition < player.portalCooldownMs) {
      return; // Cooldown active
    }
    player.lastPortalTransition = now;

    if (player.currentMapId === 'main') {
      // Transform PLAYER_HOUSE -> interior-${playerId} or PLAYER_FIELD -> field-${playerId} for isolation
      let targetWorld = portal.worldName;
      targetWorld = targetWorld.replace('PLAYER_HOUSE', `interior-${player.id}`);
      targetWorld = targetWorld.replace('PLAYER_FIELD', `field-${player.id}`);

      player.currentMapId = targetWorld;

      // Set spawn position based on target world
      if (targetWorld.startsWith('interior-')) {
        player.x = 480;  // Center of interior map (960px / 2)
        player.y = 520;  // Near bottom of interior
      } else if (targetWorld.startsWith('field-')) {
        player.x = 384;  // Center of field map (768px / 2)
        player.y = 2240; // Near bottom of field (spawn zone)
      } else {
        // Default fallback
        player.x = 480;
        player.y = 520;
      }

      // Store return portal location (center of portal rectangle)
      player.returnX = portal.x + portal.width / 2;
      player.returnY = portal.y + portal.height + 20; // Below portal

      // Update collision context to interior/field
      this.updatePlayerCollisionContext(player);
    } else {
      // Exit to main (return from interior/field)
      player.currentMapId = 'main';
      player.x = player.returnX || 480;
      player.y = player.returnY || 540;

      // Update collision context to main
      this.updatePlayerCollisionContext(player);
    }
  }

  update(deltaTime: number): void {
    // Spawn coins if needed
    while (this.coins.length < this.maxCoins) {
      this.spawnCoin();
    }

    // Update all players
    this.players.forEach(player => {
      player.update(deltaTime);

      // Keep players in bounds (map-specific)
      const movementPlayer = player as MovementPlayer;
      let maxX = this.worldWidth;
      let maxY = this.worldHeight;

      if (movementPlayer.currentMapId.startsWith('interior-')) {
        maxX = 576;  // 9 tiles * 16 * 4
        maxY = 640;  // 10 tiles * 16 * 4
      } else if (movementPlayer.currentMapId.startsWith('field-')) {
        maxX = 768;  // 12 tiles * 16 * 4
        maxY = 2560; // 40 tiles * 16 * 4
      }

      movementPlayer.x = Math.max(0, Math.min(maxX, movementPlayer.x));
      movementPlayer.y = Math.max(0, Math.min(maxY, movementPlayer.y));

      // Check coin collisions
      this.checkCoinCollisions(movementPlayer);

      // Check portal collisions
      const portal = movementPlayer.checkPortalCollision(this.portals, this.interiorPortals, this.fieldPortals);

      if (portal && !movementPlayer.isInPortalZone) {
        movementPlayer.isInPortalZone = true;
        this.enterPortal(movementPlayer, portal);
      } else if (!portal && movementPlayer.isInPortalZone) {
        movementPlayer.isInPortalZone = false;
      }
    });
  }

  private checkCoinCollisions(player: MovementPlayer): void {
    const playerRadius = this.basePlayerRadius * player.size;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const dx = player.x - coin.x;
      const dy = player.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + this.coinRadius) {
        // Collect coin
        player.coins++;
        this.coins.splice(i, 1);
      }
    }
  }

  public placeObject(
    playerId: string,
    itemId: string,
    x: number,
    y: number,
    mapId: string
  ): PlacedObject | null {
    // 1. Find item in STORE_CONFIG.placeableItems
    const item = STORE_CONFIG.placeableItems.find(i => i.id === itemId);
    if (!item) {
      console.error(`Invalid item ID: ${itemId}`);
      return null;
    }

    // 2. Get player and validate coins
    const player = this.getPlayer(playerId) as MovementPlayer;
    if (!player) {
      console.error(`Player not found: ${playerId}`);
      return null;
    }

    if (player.coins < item.cost) {
      console.error(`Insufficient coins. Need ${item.cost}, have ${player.coins}`);
      return null;
    }

    // 3. Deduct coins
    player.coins -= item.cost;

    // 4. Create placed object
    const placedObject: PlacedObject = {
      id: `obj-${this.nextObjectId++}`,
      itemId: item.id,
      x,
      y,
      mapId,
      placedBy: playerId,
      placedAt: Date.now()
    };

    // 5. Add to array
    this.placedObjects.push(placedObject);

    console.log(`Player ${playerId} placed ${itemId} at (${x}, ${y}) on ${mapId}`);
    return placedObject;
  }
}
