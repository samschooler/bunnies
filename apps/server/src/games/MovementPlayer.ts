import { BasePlayer } from '@party-game/game-framework/server';
import { PlayerData, STORE_CONFIG, calculateUpgradeCost } from '@party-game/shared-types';
import { ColorGenerator } from '@party-game/game-framework';

interface MovementPlayerData extends PlayerData {
  customData: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    coins: number;
    size: number;
    speed: number;
  };
}

export class MovementPlayer extends BasePlayer {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public coins: number = 0;
  public size: number = 1.0; // size multiplier
  public speedUpgrade: number = 1.0; // speed multiplier
  public ownedColors: Set<string> = new Set();
  private baseAcceleration: number = 800; // pixels per second squared
  private baseMaxSpeed: number = 250; // max pixels per second
  private friction: number = 0.85; // friction coefficient

  constructor(id: string, name: string, x: number, y: number) {
    const color = ColorGenerator.getColor();
    super(id, name, color);
    this.x = x;
    this.y = y;
  }

  get acceleration(): number {
    return this.baseAcceleration * this.speedUpgrade;
  }

  get maxSpeed(): number {
    return this.baseMaxSpeed * this.speedUpgrade;
  }

  getState(): MovementPlayerData {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      connected: this.connected,
      joinedAt: this.joinedAt,
      customData: {
        x: this.x,
        y: this.y,
        vx: this.vx,
        vy: this.vy,
        coins: this.coins,
        size: this.size,
        speed: this.speedUpgrade
      }
    };
  }

  purchaseUpgrade(upgradeType: string): boolean {
    // Handle regular upgrades
    const upgrade = STORE_CONFIG.upgrades[upgradeType];
    if (upgrade) {
      const cost = calculateUpgradeCost(upgradeType, {
        size: this.size,
        speed: this.speedUpgrade
      });

      if (this.coins >= cost) {
        this.coins -= cost;
        // Apply the upgrade effect
        (this as any)[upgrade.effect.property] += upgrade.effect.increment;
        return true;
      }
      return false;
    }

    // Handle color purchases
    if (upgradeType.startsWith('color:')) {
      const color = upgradeType.substring(6);
      const colorConfig = STORE_CONFIG.premiumColors.find(c => c.color === color);

      if (!colorConfig) return false;

      if (this.ownedColors.has(color)) {
        // Already owned, just switch to it
        this.color = color;
        return true;
      }

      if (this.coins >= colorConfig.cost) {
        this.coins -= colorConfig.cost;
        this.ownedColors.add(color);
        this.color = color;
        return true;
      }
    }

    return false;
  }

  handleInput(input: Record<string, any>): void {
    // Input format: { dx: number, dy: number }
    // Values are -1, 0, or 1
    // We store the input direction for use in update()
    this.inputDx = input.dx ?? 0;
    this.inputDy = input.dy ?? 0;
  }

  private inputDx: number = 0;
  private inputDy: number = 0;

  update(deltaTime: number): void {
    // Convert deltaTime from ms to seconds
    const dt = deltaTime / 1000;

    // Apply acceleration based on input
    if (this.inputDx !== 0 || this.inputDy !== 0) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(this.inputDx * this.inputDx + this.inputDy * this.inputDy);
      const normalizedDx = this.inputDx / magnitude;
      const normalizedDy = this.inputDy / magnitude;

      this.vx += normalizedDx * this.acceleration * dt;
      this.vy += normalizedDy * this.acceleration * dt;
    }

    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Clamp velocity to max speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    // Stop completely if velocity is very small
    if (Math.abs(this.vx) < 0.1) this.vx = 0;
    if (Math.abs(this.vy) < 0.1) this.vy = 0;

    // Update position based on velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  disconnect(): void {
    super.disconnect();
    ColorGenerator.releaseColor(this.color);
  }
}
