import { BaseGameState, BasePlayer } from '@party-game/game-framework/server';
import { MovementPlayer } from './MovementPlayer.js';

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

  createPlayer(id: string, name: string): BasePlayer {
    // Random spawn position
    const x = Math.random() * (this.worldWidth - 100) + 50;
    const y = Math.random() * (this.worldHeight - 100) + 50;

    return new MovementPlayer(id, name, x, y);
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
