export interface CollisionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TilemapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Array<{
    name: string;
    type: string;
    data?: number[];
    objects?: Array<{
      id: number;
      name: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      visible: boolean;
    }>;
    visible: boolean;
  }>;
}

export class MapCollisionParser {
  /**
   * Parse collision rectangles from an object layer
   * @param tilemapData The tilemap JSON data
   * @param layerName The name of the object layer (e.g., 'StaticObjects')
   * @param scale The scale factor applied to coordinates (e.g., 4 for 4x scaling)
   * @returns Array of collision rectangles in world coordinates
   */
  static parseObjectLayer(
    tilemapData: TilemapData,
    layerName: string,
    scale: number = 4
  ): CollisionRect[] {
    const layer = tilemapData.layers.find(l => l.name === layerName && l.type === 'objectgroup');
    if (!layer || !layer.objects) {
      return [];
    }

    // Convert Tiled objects to collision rectangles
    // Note: Tiled coordinates are already in pixels (not tile indices)
    return layer.objects
      .filter(obj => obj.visible !== false) // Only visible objects
      .map(obj => ({
        x: obj.x * scale,
        y: obj.y * scale,
        width: obj.width * scale,
        height: obj.height * scale
      }));
  }

  /**
   * Parse a tilemap and extract collision rectangles from a tile layer
   * @param tilemapData The tilemap JSON data
   * @param layerName The name of the collision layer (e.g., 'Decorations')
   * @param collisionGids Array of GID ranges that should be treated as collidable
   * @param scale The scale factor applied to tiles (e.g., 4 for 4x scaling)
   * @returns Array of collision rectangles in world coordinates
   */
  static parseCollisionLayer(
    tilemapData: TilemapData,
    layerName: string,
    collisionGids: { min: number; max: number }[],
    scale: number = 4
  ): CollisionRect[] {
    const layer = tilemapData.layers.find(l => l.name === layerName && l.type === 'tilelayer');
    if (!layer || !layer.data) {
      return [];
    }

    const tileWidth = tilemapData.tilewidth * scale;
    const tileHeight = tilemapData.tileheight * scale;
    const mapWidth = tilemapData.width;
    const collisionRects: CollisionRect[] = [];

    // Parse tiles into collision rectangles
    for (let y = 0; y < tilemapData.height; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const index = y * mapWidth + x;
        const gid = layer.data[index];

        // Check if this tile is collidable
        const isCollidable = collisionGids.some(range => gid >= range.min && gid <= range.max);
        if (!isCollidable) continue;

        // Create collision rect for this tile
        collisionRects.push({
          x: x * tileWidth,
          y: y * tileHeight,
          width: tileWidth,
          height: tileHeight
        });
      }
    }

    return collisionRects;
  }

  /**
   * Optimize collision rectangles by merging adjacent horizontal tiles
   * This reduces the number of collision checks needed
   */
  static optimizeRects(rects: CollisionRect[]): CollisionRect[] {
    if (rects.length === 0) return [];

    // Sort by y, then x
    const sorted = [...rects].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const optimized: CollisionRect[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const rect = sorted[i];

      // Check if this rect is adjacent to current on the same row
      if (rect.y === current.y &&
          rect.height === current.height &&
          rect.x === current.x + current.width) {
        // Merge horizontally
        current.width += rect.width;
      } else {
        // Can't merge, save current and start new one
        optimized.push(current);
        current = { ...rect };
      }
    }

    // Don't forget the last one
    optimized.push(current);

    return optimized;
  }
}
