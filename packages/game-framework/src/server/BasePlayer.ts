import { PlayerData } from '@party-game/shared-types';

export abstract class BasePlayer {
  public id: string;
  public name: string;
  public color: string;
  public connected: boolean;
  public joinedAt: number;
  protected _dirty = true;

  constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.connected = true;
    this.joinedAt = Date.now();
  }

  isDirty(): boolean {
    return this._dirty;
  }

  clearDirty(): void {
    this._dirty = false;
  }

  protected markDirty(): void {
    this._dirty = true;
  }

  abstract getState(): PlayerData;
  abstract handleInput(input: Record<string, any>): void;
  abstract update(deltaTime: number): void;

  disconnect(): void {
    this.connected = false;
  }

  reconnect(): void {
    this.connected = true;
  }
}
