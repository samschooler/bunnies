# Farm Island Tilemap Structure

## Overview

The farm is designed as an island surrounded by water, with proper grass-to-water edge transitions, decorative weeds, and two fenced farm plots.

## Layer Structure (Bottom to Top)

### Layer 1: Water (Base Layer)
- **Purpose**: Water background for the island
- **Tiles**: GID 155 (solid water tile)
- **Coverage**: Entire 30×17 map

### Layer 2: Ground (Island Shape)
- **Purpose**: Creates the grass island with proper edges
- **Main Tile**: GID 13 (solid grass center)

#### Island Edge Tiles (Grass Tileset):
```
Island Shape Pattern:
+-----+-----+-----+-----+-----+
|  0  |  1  |  2  |  2  |  3  |  <- Top edge
+-----+-----+-----+-----+-----+
|  0  | 12  | 13  | 13  | 14  |  <- Left/Right edges with center
+-----+-----+-----+-----+-----+
|  0  | 12  | 13  | 13  | 14  |
+-----+-----+-----+-----+-----+
|  0  | 23  | 24  | 24  | 25  |  <- Bottom edge
+-----+-----+-----+-----+-----+
```

**Edge Tile Reference:**
- **GID 1**: Top-left corner of island
- **GID 2**: Top edge (grass-to-water transition)
- **GID 3**: Top-right corner of island
- **GID 12**: Left edge (grass-to-water transition)
- **GID 13**: Center grass fill
- **GID 14**: Right edge (grass-to-water transition)
- **GID 18**: Inner corner transition
- **GID 23**: Bottom-left corner of island
- **GID 24**: Bottom edge (grass-to-water transition)
- **GID 28**: Outer corner variant
- **GID 60**: Right edge variant

**Island Layout:**
- Top edge at row 0
- Left edge starts at col 1
- Right edge at col 28-29
- Bottom edge starts at row 12
- Interior filled with GID 13 (solid grass)

### Layer 3: Terrain (Farm Features & Decorations)
- **Purpose**: Tilled dirt plots and decorative grass/weeds

#### Tilled Dirt (Same as before):
- **Farm Plot 1**: Rows 4-8, cols 6-12
  - Uses edge tiles: 78-80 (top), 89-91 (sides), 100-102 (bottom)
- **Farm Plot 2**: Rows 10-14, cols 20-26
  - Uses same edge pattern

#### Decorative Weeds/Grass (Grass Tileset):
Scattered across the island for visual variety:
- **GID 57**: Small grass tuft/weed
- **GID 61**: Weed variant
- **GID 64**: Weed variant
- **GID 67**: Weed variant
- **GID 68**: Weed variant
- **GID 73**: Weed variant
- **GID 74**: Weed variant

**Weed Placement** (examples from current map):
- Row 1, col 16: GID 57
- Row 2, col 26-27: GIDs 68, 64
- Row 3, col 20: GID 57
- Row 4, col 2, 25: GIDs 67, 68
- Row 5, col 28: GID 74
- Row 6, col 16: GID 67
- Row 8, col 16, 27: GIDs 61, 74
- Row 9, col 8: GID 57
- Row 10, col 17: GID 57
- Row 11, col 11: GID 57
- Row 12, col 7: GID 67
- Row 13, col 12: GID 73
- Row 16, col 5: GID 24

### Layer 4: Decorations (Fence Collision - Invisible)
- **Purpose**: Invisible collision layer for fences
- **Status**: `visible: false` in code
- **Physics**: Collision enabled for GIDs 159-174

#### Fence Pattern:
- **Farm Plot 1**: Rows 4-8, cols 6-12
  - Top: 160, 173×5, 162
  - Sides: 163 on left and right
  - Bottom: 168, 173×5, 170

- **Farm Plot 2**: Rows 10-14, cols 20-26
  - Same pattern as Plot 1

### Layer 5: FenceObjects (Object Layer)
- **Purpose**: Fence sprites for visual rendering with depth sorting
- **Type**: Object layer (not tile layer)
- **Objects**: 40 fence objects created from Decorations tile layer
- **Rendering**: Each fence is a sprite with Y-based depth sorting

#### How It Works:
- Tile layer (Decorations) provides collision
- Object layer (FenceObjects) provides visual sprites
- Sprites are sorted by Y position for proper occlusion
- Players appear behind fences when "north" and in front when "south"

## Map Dimensions
- **Size**: 30 tiles × 17 tiles
- **Scaled**: 4x (each 16×16 tile becomes 64×64 pixels)
- **Final**: 1920×1088 pixels

## Key Design Elements

1. **Island Structure**: Water base with grass island featuring proper edge transitions
2. **Natural Look**: Scattered decorative weeds across grass areas
3. **Farm Plots**: Two tilled dirt areas with proper edge tiles
4. **Fences**: Optional wooden fences around plots (currently hidden)

## Tile GID Ranges
- **Grass**: 1-77 (edges, center, weeds)
- **Tilled_Dirt**: 78-154 (farm plot edges and fill)
- **Water**: 155-158 (water background)
- **Fences**: 159-174 (fence corners, rails, posts)

## MainScene.ts Implementation

### Layer Loading

```typescript
// Create layers (bottom to top)
const waterLayer = map.createLayer('Water', [waterTileset!], 0, 0);
const groundLayer = map.createLayer('Ground', [grassTileset!], 0, 0);
const terrainLayer = map.createLayer('Terrain', [grassTileset!, dirtTileset!], 0, 0);
const decorationsLayer = map.createLayer('Decorations', [fencesTileset!], 0, 0);

// Scale to 4x (16px tiles → 64px)
waterLayer?.setScale(4);
groundLayer?.setScale(4);
terrainLayer?.setScale(4);
decorationsLayer?.setScale(4);

// Make fence layer invisible (used only for collision)
decorationsLayer?.setVisible(false);

// Enable collision on fence tiles
decorationsLayer?.setCollisionBetween(159, 174);
```

### Fence Sprite System

```typescript
// Create fence sprites from object layer
this.createFenceSprites(map);

private createFenceSprites(map: Phaser.Tilemaps.Tilemap): void {
  const fenceObjectsLayer = map.getObjectLayer('FenceObjects');
  fenceObjectsLayer.objects.forEach(obj => {
    const sprite = this.add.sprite(x, y, 'fences-sprites', obj.gid - 159);
    sprite.setScale(4);
    this.fenceSprites.push(sprite);
  });
}
```

### Player Physics & Collision

```typescript
// Enable physics on player container
this.physics.add.existing(container);
body.setSize(sprite.displayWidth * 0.5, sprite.displayHeight * 0.3);
body.setOffset(-sprite.displayWidth * 0.25, sprite.displayHeight * 0.2);

// Add collision with fence layer
this.physics.add.collider(container, this.fenceCollisionLayer);
```

### Depth Sorting

```typescript
private updateDepthSorting(): void {
  // Collect all sprites (players + fences)
  const allSprites = [...];

  // Sort by Y position
  allSprites.sort((a, b) => a.y - b.y);

  // Update depths
  allSprites.forEach((item, index) => item.obj.setDepth(index));
}
```

Called every frame in `handleStateUpdate()` to maintain proper occlusion.

**Notes**:
- The Terrain layer uses both Grass tileset (for weeds) and Tilled_Dirt tileset (for farm plots)
- Fences use a dual-layer system: invisible tile layer for collision + object sprites for rendering
- Player collision boxes are smaller than sprites and offset to feet for better feel

## Notes
- The island shape creates natural boundaries with water
- Edge tiles provide smooth grass-to-water transitions
- Decorative weeds add visual variety without cluttering
- Fences layer can be toggled on/off as needed (currently hidden in tilemap JSON)
