// games/demo/src/server/DemoPlayer.ts
import { BasePlayer } from '@party-game/game-framework/server';
import { PlayerData } from '@party-game/shared-types';

export interface DemoPlayerState extends PlayerData {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class DemoPlayer extends BasePlayer {
  x: number = 400;
  y: number = 300;
  vx: number = 0;
  vy: number = 0;
  private speed: number = 200;

  constructor(id: string, name: string, color: string) {
    super(id, name, color);
    // Random spawn position
    this.x = 200 + Math.random() * 400;
    this.y = 150 + Math.random() * 300;
  }

  getState(): DemoPlayerState {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      connected: this.connected,
      joinedAt: this.joinedAt
    };
  }

  handleInput(input: Record<string, any>): void {
    if (input.joystick) {
      this.vx = input.joystick.x * this.speed;
      this.vy = input.joystick.y * this.speed;
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Simple bounds checking (800x600 play area with padding)
    this.x = Math.max(30, Math.min(770, this.x));
    this.y = Math.max(30, Math.min(570, this.y));
  }
}
