import { BasePlayer } from '@party-game/game-framework/server';
import { PlayerData, STORE_CONFIG, calculateUpgradeCost, CollisionRect } from '@party-game/shared-types';
import { ColorGenerator } from '@party-game/game-framework';

interface Portal {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  worldName: string;
}

interface SproutLandPlayerData extends PlayerData {
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

export class SproutLandPlayer extends BasePlayer {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public coins: number = 0;
  public size: number = 1.0; // size multiplier
  public speedUpgrade: number = 1.0; // speed multiplier
  public ownedColors: Set<string> = new Set();
  public currentMapId: string = 'main';
  public isInPortalZone: boolean = false;
  public lastPortalTransition: number = 0;
  public portalCooldownMs: number = 500;
  public returnX: number = 0;
  public returnY: number = 0;
  private baseSpeed: number = 200; // movement speed (pixels per second)
  private readonly collisionWidth: number = 50; // Player collision box width
  private readonly collisionHeight: number = 28.8; // Player collision box height (half of original 57.6)
  private readonly collisionTopMargin: number = 28.8; // Top margin for hitbox (equal to new height)
  private collisionRects: CollisionRect[] = [];

  constructor(id: string, name: string, x: number, y: number) {
    const color = ColorGenerator.getColor();
    super(id, name, color);
    this.x = x;
    this.y = y;
  }

  get speed(): number {
    return this.baseSpeed * this.speedUpgrade;
  }

  setCollisionRects(rects: CollisionRect[]): void {
    this.collisionRects = rects;
  }

  getState(): SproutLandPlayerData {
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
        speed: this.speedUpgrade,
        currentMapId: this.currentMapId
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
    // Input format: { timestamp: number, data: { dx: number, dy: number } }
    // Values are -1, 0, or 1
    // We store the input direction for use in update()
    const data = input.data || input;
    this.inputDx = data.dx ?? 0;
    this.inputDy = data.dy ?? 0;
  }

  private inputDx: number = 0;
  private inputDy: number = 0;

  private checkCollision(x: number, y: number): boolean {
    // Player collision box is centered horizontally, shifted down by top margin
    const playerLeft = x - this.collisionWidth / 2;
    const playerRight = x + this.collisionWidth / 2;
    const playerTop = y - this.collisionHeight / 2 + this.collisionTopMargin;
    const playerBottom = y + this.collisionHeight / 2 + this.collisionTopMargin;

    // Check against all collision rectangles from tilemap
    for (const rect of this.collisionRects) {
      const rectLeft = rect.x;
      const rectRight = rect.x + rect.width;
      const rectTop = rect.y;
      const rectBottom = rect.y + rect.height;

      // AABB collision detection
      if (playerRight > rectLeft &&
        playerLeft < rectRight &&
        playerBottom > rectTop &&
        playerTop < rectBottom) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  public checkPortalCollision(mainPortals: Portal[], interiorPortals: Portal[], fieldPortals: Portal[]): Portal | null {
    let portalsToCheck: Portal[] = [];

    if (this.currentMapId === 'main') {
      portalsToCheck = mainPortals;
    } else if (this.currentMapId.startsWith('interior-')) {
      portalsToCheck = interiorPortals;
    } else if (this.currentMapId.startsWith('field-')) {
      portalsToCheck = fieldPortals;
    }

    // AABB collision
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

  update(deltaTime: number): void {
    // Convert deltaTime from ms to seconds
    const dt = deltaTime / 1000;
    const oldX = this.x;
    const oldY = this.y;

    // Set velocity directly based on input (no acceleration/friction)
    if (this.inputDx !== 0 || this.inputDy !== 0) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(this.inputDx * this.inputDx + this.inputDy * this.inputDy);
      const normalizedDx = this.inputDx / magnitude;
      const normalizedDy = this.inputDy / magnitude;

      // Set velocity to constant speed in input direction
      this.vx = normalizedDx * this.speed;
      this.vy = normalizedDy * this.speed;
    } else {
      // No input = stop immediately
      this.vx = 0;
      this.vy = 0;
    }

    // Calculate new position
    const newX = this.x + this.vx * dt;
    const newY = this.y + this.vy * dt;

    // Check collision for full movement
    if (!this.checkCollision(newX, newY)) {
      // No collision, move freely
      this.x = newX;
      this.y = newY;
    } else {
      // Collision detected, try sliding along walls
      // Try X movement only
      if (!this.checkCollision(newX, this.y)) {
        this.x = newX;
        this.vy = 0; // Stop Y velocity when hitting horizontal wall
      }
      // Try Y movement only
      else if (!this.checkCollision(this.x, newY)) {
        this.y = newY;
        this.vx = 0; // Stop X velocity when hitting vertical wall
      }
      // Can't move in either direction, stop completely
      else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    // Mark dirty if position changed
    if (this.x !== oldX || this.y !== oldY) {
      this.markDirty();
    }
  }

  disconnect(): void {
    super.disconnect();
    ColorGenerator.releaseColor(this.color);
  }
}
