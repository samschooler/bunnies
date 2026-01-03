# Portal System with Controller Minimap Implementation Plan

## Overview

Implement a portal system using Tiled object layer. Portal objects in the Portal layer have `go_to_world` custom properties. When a player enters a portal rectangle, their controller shows the interior in an iframe while the big screen always shows the main map. Door tiles that overlap with portals are animated when players approach.

## Requirements Summary

- **Big screen**: Always displays main farm map (no changes to what's shown)
- **Controller phone**: Shows small interior map via iframe ONLY when player enters portal
- **Portal detection**: Bounding box (AABB) collision with portal objects from Portal layer
- **Portal objects**: Rectangle objects in Portal layer with property `go_to_world = "PLAYER_HOUSE"`
- **Isolation**: Server transforms "PLAYER_HOUSE" to `interior-${playerId}` for unique instances
- **Visual**: Find door tiles that overlap with portal areas, animate them when players are near
- **Interior**: House interior using existing house tilesets with return portal object

---

## Phase 1: Server-Side Portal Foundation

### 1.1 Add Portal Data Structures

**File**: `apps/server/src/games/MovementGameState.ts`

Add portal interfaces and properties:
```typescript
interface Portal {
  id: string;
  x: number;          // World X position (scaled)
  y: number;          // World Y position (scaled)
  width: number;      // Portal rectangle width (scaled)
  height: number;     // Portal rectangle height (scaled)
  worldName: string;  // e.g., "PLAYER_HOUSE"
}

private portals: Portal[] = [];
```

### 1.2 Parse Portal Objects from Portal Layer

**File**: `apps/server/src/games/MovementGameState.ts`

In `loadMapData()` method (after collision parsing), parse Portal layer:
```typescript
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
```

### 1.3 Include Portals in Game State

**File**: `apps/server/src/games/MovementGameState.ts`

Update `getGameData()` method (line 85) to include portals:
```typescript
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
    }))
  };
}
```

### 1.4 Add Current Map Tracking to Player

**File**: `apps/server/src/games/MovementPlayer.ts`

Add properties (after line 25):
```typescript
public currentMapId: string = 'main';
private isInPortalZone: boolean = false;
private lastPortalTransition: number = 0;
private portalCooldownMs: number = 500;
```

Update `getState()` method (line 47) to include currentMapId:
```typescript
customData: {
  x: this.x,
  y: this.y,
  vx: this.vx,
  vy: this.vy,
  coins: this.coins,
  size: this.size,
  speed: this.speedUpgrade,
  currentMapId: this.currentMapId  // ADD THIS
}
```

### 1.5 Implement Portal Collision Detection

**File**: `apps/server/src/games/MovementPlayer.ts`

Add method (after `checkCollision` method):
```typescript
public checkPortalCollision(portals: Portal[]): Portal | null {
  if (this.currentMapId !== 'main') return null;

  // Player collision box (same as existing collision)
  const playerLeft = this.x - this.collisionWidth / 2;
  const playerRight = this.x + this.collisionWidth / 2;
  const playerTop = this.y - this.collisionHeight / 2 + this.collisionTopMargin;
  const playerBottom = this.y + this.collisionHeight / 2 + this.collisionTopMargin;

  // Check AABB collision with portal rectangles
  for (const portal of portals) {
    const portalLeft = portal.x;
    const portalRight = portal.x + portal.width;
    const portalTop = portal.y;
    const portalBottom = portal.y + portal.height;

    if (playerRight > portalLeft &&
        playerLeft < portalRight &&
        playerBottom > portalTop &&
        playerTop < portalBottom) {
      return portal; // Collision with portal
    }
  }

  return null;
}
```

### 1.6 Handle Portal Entry Transitions

**File**: `apps/server/src/games/MovementGameState.ts`

Add method:
```typescript
private enterPortal(player: MovementPlayer, portal: Portal): void {
  const now = Date.now();
  if (now - player.lastPortalTransition < player.portalCooldownMs) {
    return; // Cooldown active
  }
  player.lastPortalTransition = now;

  if (player.currentMapId === 'main') {
    // Transform PLAYER_HOUSE -> interior-${playerId} for isolation
    const targetWorld = portal.worldName.replace('PLAYER_HOUSE', `interior-${player.id}`);
    player.currentMapId = targetWorld;
    player.x = 480;  // Center of interior map (960px / 2)
    player.y = 520;  // Near bottom of interior

    // Store return portal location (center of portal rectangle)
    player.returnX = portal.x + portal.width / 2;
    player.returnY = portal.y + portal.height + 20; // Below portal
  } else {
    // Exit to main (return from interior)
    player.currentMapId = 'main';
    player.x = player.returnX || 480;
    player.y = player.returnY || 540;
  }
}
```

Add portal checking in `update()` method (after line 111):
```typescript
// Check portal collisions
const movementPlayer = player as MovementPlayer;
const portal = movementPlayer.checkPortalCollision(this.portals);

if (portal && !movementPlayer.isInPortalZone) {
  movementPlayer.isInPortalZone = true;
  this.enterPortal(movementPlayer, portal);
} else if (!portal && movementPlayer.isInPortalZone) {
  movementPlayer.isInPortalZone = false;
}
```

Add return position tracking to MovementPlayer:
**File**: `apps/server/src/games/MovementPlayer.ts`

```typescript
public returnX: number = 0;
public returnY: number = 0;
```

---

## Phase 2: Interior Map and Collision System

### 2.1 Create Interior Tilemap JSON

**New File**: `apps/game-display/public/assets/sprout-land/tilemaps/house-interior.json`

Create a 15x10 tile map (960x640 pixels at 4x scale) with:
- **Layers**: Floor, Walls, Furniture, StaticObjects, Portal, SpawnZone
- **Tilesets**: Wooden_House, Wooden_House_Walls_Tilset, Basic_Furniture
- **Portal object**: Exit door at bottom center (x: 112, y: 144, width: 16, height: 16)
- **SpawnZone**: Center bottom area for player spawn
- **StaticObjects**: Wall collision rectangles around perimeter

Use existing farm-tilemap.json as a structural reference.

### 2.2 Load Interior Map Data on Server

**File**: `apps/server/src/games/MovementGameState.ts`

Add properties:
```typescript
private interiorCollisionRects: CollisionRect[] = [];
private interiorPortals: Portal[] = [];
```

Add method:
```typescript
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
      portalLayer.objects.forEach(obj => {
        this.interiorPortals.push({
          id: 'return',
          x: obj.x * 4,
          y: obj.y * 4,
          width: obj.width * 4,
          height: obj.height * 4,
          worldName: 'MAIN'
        });
      });
    }

    console.log(`Loaded ${this.interiorCollisionRects.length} interior collision rects`);
  } catch (error) {
    console.error('Failed to load interior map:', error);
  }
}
```

Call in constructor (after `loadMapData()`):
```typescript
this.loadInteriorMapData();
```

### 2.3 Switch Collision Context Based on Map

**File**: `apps/server/src/games/MovementGameState.ts`

Add method:
```typescript
private updatePlayerCollisionContext(player: MovementPlayer): void {
  if (player.currentMapId === 'main') {
    player.setCollisionRects(this.collisionRects);
  } else {
    player.setCollisionRects(this.interiorCollisionRects);
  }
}
```

Update `enterPortalTile()` method to call this after changing currentMapId:
```typescript
this.updatePlayerCollisionContext(player);
```

### 2.4 Handle Return Portals from Interior

**File**: `apps/server/src/games/MovementGameState.ts`

In `loadInteriorMapData()`, parse interior portal layer (same way as main map):
```typescript
// Parse Portal layer from interior map
const interiorPortalLayer = tilemapData.layers.find(
  l => l.name === 'Portal' && l.type === 'objectgroup'
);

if (interiorPortalLayer?.objects) {
  interiorPortalLayer.objects.forEach((obj: any) => {
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

console.log(`Loaded ${this.interiorPortals.length} interior return portals`);
```

Add interior portal array:
```typescript
private interiorPortals: Portal[] = [];
```

**File**: `apps/server/src/games/MovementPlayer.ts`

Update `checkPortalCollision()` to accept both arrays:
```typescript
public checkPortalCollision(mainPortals: Portal[], interiorPortals: Portal[]): Portal | null {
  let portalsToCheck: Portal[] = [];

  if (this.currentMapId === 'main') {
    portalsToCheck = mainPortals;
  } else {
    portalsToCheck = interiorPortals;
  }

  // AABB collision (same logic as before)
  const playerLeft = this.x - this.collisionWidth / 2;
  const playerRight = this.x + this.collisionWidth / 2;
  const playerTop = this.y - this.collisionHeight / 2 + this.collisionTopMargin;
  const playerBottom = this.y + this.collisionHeight / 2 + this.collisionTopMargin;

  for (const portal of portalsToCheck) {
    const portalLeft = portal.x;
    const portalRight = portal.x + portal.width;
    const portalTop = portal.y;
    const portalBottom = portal.y + portal.height;

    if (playerRight > portalLeft &&
        playerLeft < portalRight &&
        playerBottom > portalTop &&
        playerTop < portalBottom) {
      return portal;
    }
  }

  return null;
}
```

**File**: `apps/server/src/games/MovementGameState.ts`

Update portal check in `update()`:
```typescript
const portal = movementPlayer.checkPortalCollision(this.portals, this.interiorPortals);
```

---

## Phase 3: Display Layer Portal Sprites

### 3.1 Load Door Spritesheet

**File**: `apps/game-display/src/scenes/MainScene.ts`

Add to `preload()` method:
```typescript
this.load.spritesheet('doors', '/assets/sprout-land/Tilesets/Doors.png', {
  frameWidth: 16,
  frameHeight: 16
});
```

### 3.2 Create Door Animations

**File**: `apps/game-display/src/scenes/MainScene.ts`

Add to `create()` method (after character animations):
```typescript
// Door animations
this.anims.create({
  key: 'door-closed',
  frames: [{ key: 'doors', frame: 0 }],
  frameRate: 1
});

this.anims.create({
  key: 'door-open',
  frames: this.anims.generateFrameNumbers('doors', { start: 0, end: 3 }),
  frameRate: 8,
  repeat: 0
});

this.anims.create({
  key: 'door-idle-open',
  frames: [{ key: 'doors', frame: 3 }],
  frameRate: 1
});
```

### 3.3 Find and Animate Door Tiles That Overlap Portals

**File**: `apps/game-display/src/scenes/MainScene.ts`

Since portals are invisible rectangles, find door tiles that overlap with them:
```typescript
private portalDoorSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

private findDoorTilesInPortals(portals: any[], tilemap: Phaser.Tilemaps.Tilemap): void {
  portals.forEach((portal, index) => {
    // Find tiles that overlap with portal rectangle
    // Portal coordinates are already in world space, need to convert to tile space
    const tileX = Math.floor(portal.x / (16 * 4));
    const tileY = Math.floor(portal.y / (16 * 4));
    const tileWidth = Math.ceil(portal.width / (16 * 4));
    const tileHeight = Math.ceil(portal.height / (16 * 4));

    // Check Decorations layer for door tiles (GID 273)
    const decorationsLayer = tilemap.getLayer('Decorations');
    if (!decorationsLayer) return;

    for (let y = tileY; y < tileY + tileHeight; y++) {
      for (let x = tileX; x < tileX + tileWidth; x++) {
        const tile = decorationsLayer.tilemapLayer.getTileAt(x, y);
        if (tile && tile.index === 273) {
          // Found door tile - create animated sprite
          const sprite = this.add.sprite(
            tile.pixelX + 8 * 4,  // Center of tile
            tile.pixelY + 8 * 4,
            'doors',
            0  // Frame 0 is door-closed
          );
          sprite.setScale(4);
          sprite.setDepth(tile.pixelY);  // Depth sorting
          sprite.play('door-closed');

          this.portalDoorSprites.set(`portal-${index}`, sprite);
          this.staticObjectSprites.push(sprite);
        }
      }
    }
  });
}

private animatePortalDoors(portals: any[], players: Record<string, any>): void {
  portals.forEach((portal, index) => {
    const doorSprite = this.portalDoorSprites.get(`portal-${index}`);
    if (!doorSprite) return;

    // Check if any player is near this portal
    let nearestDistance = Infinity;
    Object.values(players).forEach((player: any) => {
      if (player.customData.currentMapId !== 'main') return;

      const dx = Math.abs(player.customData.x - (portal.x + portal.width / 2));
      const dy = Math.abs(player.customData.y - (portal.y + portal.height / 2));
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
      }
    });

    // Animate door when player is within 100px
    if (nearestDistance < 100) {
      if (doorSprite.anims.currentAnim?.key !== 'door-open' &&
          doorSprite.anims.currentAnim?.key !== 'door-idle-open') {
        doorSprite.play('door-open');
        doorSprite.once('animationcomplete', () => {
          doorSprite.play('door-idle-open');
        });
      }
    } else {
      if (doorSprite.anims.currentAnim?.key !== 'door-closed') {
        doorSprite.play('door-closed');
      }
    }
  });
}
```

### 3.4 Update Portal Door Sprites in State Handler

**File**: `apps/game-display/src/scenes/MainScene.ts`

In `create()` method (after creating tilemap), find and create door sprites:
```typescript
const tilemap = this.make.tilemap({ key: 'farmMap' });
// ... create layers ...

// After state is loaded for the first time, find portal doors
// This should be called once when portals data is available
```

In `handleStateUpdate()` method:
```typescript
// Update portal doors
const portals = state.gameData?.portals || [];

if (portals.length > 0 && this.portalDoorSprites.size === 0) {
  this.findDoorTilesInPortals(portals, this.tilemap);
} else if (portals.length > 0) {
  this.animatePortalDoors(portals, state.players);
}
```

### 3.5 Filter Players by Current Map

**File**: `apps/game-display/src/scenes/MainScene.ts`

In `handleStateUpdate()`, filter players to only show those on main map:
```typescript
const players = state.players as Record<string, MovementPlayerData>;

// Only show players on main map
const mainMapPlayers = Object.values(players).filter(
  p => !p.customData.currentMapId || p.customData.currentMapId === 'main'
);

// Update existing and create new
mainMapPlayers.forEach(player => {
  if (!this.playerSprites.has(player.id)) {
    this.createPlayerSprite(player);
  } else {
    this.updatePlayerSprite(player);
  }
});

// Remove players who left main map
this.playerSprites.forEach((playerData, playerId) => {
  const stillOnMain = mainMapPlayers.find(p => p.id === playerId);
  if (!stillOnMain) {
    playerData.container.destroy();
    this.playerSprites.delete(playerId);
  }
});
```

---

## Phase 4: Controller iframe Integration

### 4.1 Create Interior Display Entry Point

**New File**: `apps/game-display/src/interior.ts`

Create minimal entry point for interior scene (similar to main.ts but loads interior map).

**New File**: `apps/game-display/interior.html`

Basic HTML file that loads interior.ts as module.

### 4.2 Update Controller State Tracking

**File**: `apps/controller/src/components/GameController.tsx`

Update PlayerState interface (line 11):
```typescript
interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
  currentMapId?: string;  // ADD THIS
}
```

Add state variable (after line 21):
```typescript
const [currentMapId, setCurrentMapId] = useState<string>('main');
```

Update state callback (in useEffect around line 32):
```typescript
(controller as any).callbacks.onStateUpdate = (state: PlayerState) => {
  setPlayerState(state);
  setCurrentMapId(state.currentMapId || 'main');  // ADD THIS
};
```

### 4.3 Add iframe to Layout

**File**: `apps/controller/src/components/GameController.tsx`

Add iframe section before D-pad container (around line 210):
```typescript
{currentMapId !== 'main' && (
  <div className="interior-display">
    <iframe
      src={`/interior.html?roomCode=${roomCode}`}
      className="mini-display-frame"
      title="House Interior"
      loading="lazy"
    />
  </div>
)}
```

Note: roomCode will need to be passed as prop to GameController or extracted from URL.

### 4.4 Update CSS Layout

**File**: `apps/controller/src/components/GameController.css`

Add styles:
```css
.interior-display {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  padding: 8px;
  overflow: hidden;
}

.mini-display-frame {
  width: 100%;
  height: 100%;
  max-width: 960px;
  max-height: 640px;
  border: 2px solid #4a4a4a;
  border-radius: 8px;
  background: #1a1a2e;
}

.controller-header {
  flex: 0 0 auto;
  margin-bottom: 20px;  /* Reduced from 40px */
}

.dpad-container {
  flex: 0 0 auto;  /* Changed from flex: 1 */
}
```

### 4.5 Configure Interior Display Route

**File**: `apps/game-display/vite.config.ts`

Add route handling for `/interior.html` or `/interior/:roomCode`.

**File**: `apps/server/src/index.ts`

Add route for serving interior HTML in production.

---

## Phase 5: Interior Scene Implementation

### 5.1 Create Interior Phaser Scene

**New File**: `apps/game-display/src/scenes/InteriorScene.ts`

Similar structure to MainScene but:
- Load house-interior.json tilemap
- Smaller world bounds (960x640)
- Filter players to only show those in interior (currentMapId !== 'main')
- Render return portal with green tint

### 5.2 Interior Display Configuration

**File**: `apps/game-display/src/interior.ts`

```typescript
import Phaser from 'phaser';
import { InteriorScene } from './scenes/InteriorScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [InteriorScene]
};

const game = new Phaser.Game(config);
```

Connect to same WebSocket room using roomCode from URL params.

---

## Phase 6: Testing and Polish

### 6.1 Testing Checklist

- [ ] Single portal appears on main map
- [ ] Door animates when any player approaches
- [ ] Controller shows interior iframe when entering portal
- [ ] Player moves correctly in interior (collision works)
- [ ] Exit portal returns player to main map at portal location
- [ ] Multiple players can enter the same portal
- [ ] Each player enters their own isolated interior instance
- [ ] Players in interior don't see each other (isolation works)
- [ ] Players on main map don't see interior players
- [ ] Disconnect/reconnect while in interior works
- [ ] Rapid portal spam is prevented by cooldown

### 6.2 Edge Case Handling

- No portal defined: Game works normally, just no portal access
- Interior map load failure: Caught by try-catch, portal entry fails gracefully
- iframe load failure: Add error handler and retry button
- Collision context switching: Already handled in Phase 2.3
- Player instances isolated by using `interior-${playerId}` as unique map ID

### 6.3 Performance Optimization

- Use conditional rendering for iframe (only when needed)
- Lazy loading on iframe
- Smaller interior map reduces rendering load
- Single portal collision check (AABB test, very fast)
- Player isolation means interior scenes only render one player

---

## Tiled Setup

The portal object is already created in the farm tilemap with `go_to_world="PLAYER_HOUSE"` property.

For the interior map, create `house-interior.json` with:
- Portal object layer with a return portal rectangle
- Return portal should have property `go_to_world = "MAIN"`
- Place the portal object where the exit door is in the interior

---

## Critical Files Reference

### Server Files
- `apps/server/src/games/MovementGameState.ts` - Portal tile parsing, collision, map transitions
- `apps/server/src/games/MovementPlayer.ts` - Portal tile collision detection, currentMapId tracking

### Display Files
- `apps/game-display/src/scenes/MainScene.ts` - Portal tile sprites, animations, player filtering
- `apps/game-display/src/scenes/InteriorScene.ts` - NEW: Interior scene rendering
- `apps/game-display/src/interior.ts` - NEW: Interior entry point
- `apps/game-display/interior.html` - NEW: Interior HTML
- `apps/game-display/public/assets/sprout-land/tilemaps/house-interior.json` - NEW: Interior map
- `apps/game-display/public/assets/sprout-land/tilemaps/farm-tilemap.json` - MODIFY: Add tile properties

### Controller Files
- `apps/controller/src/components/GameController.tsx` - iframe integration, layout
- `apps/controller/src/components/GameController.css` - Responsive layout styles

### Shared Files
- `packages/shared-types/src/MapCollision.ts` - Collision parsing utilities
- `packages/shared-types/src/index.ts` - Type exports (add PortalTile interface)

---

## Implementation Order

1. **Phase 1**: Server portal foundation (portal parsing, ownership, collision detection)
2. **Phase 2**: Interior map creation and collision system
3. **Phase 3**: Display portal sprites and animations
4. **Phase 4**: Controller iframe integration
5. **Phase 5**: Interior scene implementation
6. **Phase 6**: Testing and polish

Each phase can be tested independently before moving to the next.
