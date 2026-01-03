import { BaseGameState, BasePlayer } from '@party-game/game-framework/server';
import { MovementPlayer } from './MovementPlayer.js';
import { MapCollisionParser, CollisionRect, TilemapData } from '@party-game/shared-types';
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

  constructor() {
    super();
    this.loadMapData();
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
    } catch (error) {
      console.error('Failed to load tilemap data:', error);
      this.collisionRects = [];
      this.spawnZones = [];
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
      coins: this.coins
    };
  }

  private spawnCoin(): void {
    const coin: Coin = {
      id: `coin-${this.nextCoinId++}`,
      x: Math.random() * (this.worldWidth - 100) + 50,
      y: Math.random() * (this.worldHeight - 100) + 50
    };
    this.coins.push(coin);
  }

  update(deltaTime: number): void {
    // Spawn coins if needed
    while (this.coins.length < this.maxCoins) {
      this.spawnCoin();
    }

    // Update all players
    this.players.forEach(player => {
      player.update(deltaTime);

      // Keep players in bounds
      const movementPlayer = player as MovementPlayer;
      movementPlayer.x = Math.max(0, Math.min(this.worldWidth, movementPlayer.x));
      movementPlayer.y = Math.max(0, Math.min(this.worldHeight, movementPlayer.y));

      // Check coin collisions
      this.checkCoinCollisions(movementPlayer);
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
}
