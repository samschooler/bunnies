# Multi-Game Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-game codebase into a multi-game platform where the server handles multiple games dynamically.

**Architecture:** Games are self-contained packages in `games/` that export a standard interface. Server creates Socket.io namespaces per game. Room codes are prefixed with a letter that identifies the game (A=first registered, B=second, etc.).

**Tech Stack:** TypeScript, Socket.io, Phaser 3, React, Turbo monorepo

---

## Task 1: Create Game Registry Types

**Files:**
- Create: `packages/shared-types/src/game-registry.ts`
- Modify: `packages/shared-types/src/index.ts`

**Step 1: Create the game registry types file**

```typescript
// packages/shared-types/src/game-registry.ts
import type { Server } from 'socket.io';

export interface GameDefinition {
  id: string;
  name: string;
  maxPlayers: number;
  createServer: (io: Server, roomCode: string) => any;
  scenes: any[];
  entryScene: string;
  assetPath: string;
  controllerComponent?: any;
}

export class GameRegistry {
  private games = new Map<string, GameDefinition>();
  private prefixToGame = new Map<string, string>();
  private gameToPrefix = new Map<string, string>();

  register(game: GameDefinition): void {
    const prefix = String.fromCharCode(65 + this.games.size);
    this.games.set(game.id, game);
    this.prefixToGame.set(prefix, game.id);
    this.gameToPrefix.set(game.id, prefix);
  }

  getGame(id: string): GameDefinition | undefined {
    return this.games.get(id);
  }

  getGameByPrefix(prefix: string): GameDefinition | undefined {
    const gameId = this.prefixToGame.get(prefix);
    return gameId ? this.games.get(gameId) : undefined;
  }

  getPrefix(gameId: string): string | undefined {
    return this.gameToPrefix.get(gameId);
  }

  generateRoomCode(gameId: string): string | null {
    const prefix = this.gameToPrefix.get(gameId);
    if (!prefix) return null;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}${code}`;
  }

  parseRoomCode(code: string): { gameId: string; roomCode: string } | null {
    if (!code || code.length < 2) return null;
    const prefix = code[0].toUpperCase();
    const gameId = this.prefixToGame.get(prefix);
    if (!gameId) return null;
    return { gameId, roomCode: code.toUpperCase() };
  }

  getAllGames(): GameDefinition[] {
    return Array.from(this.games.values());
  }

  getGameIds(): string[] {
    return Array.from(this.games.keys());
  }
}

export const registry = new GameRegistry();
```

**Step 2: Export from shared-types index**

Add to `packages/shared-types/src/index.ts`:

```typescript
export * from './game-registry.js';
```

**Step 3: Build and verify**

Run: `npm run build --filter=@party-game/shared-types`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/shared-types/src/game-registry.ts packages/shared-types/src/index.ts
git commit -m "feat: add game registry types for multi-game support"
```

---

## Task 2: Update Monorepo Configuration for Games

**Files:**
- Modify: `package.json`
- Modify: `turbo.json`

**Step 1: Update root package.json workspaces**

Change the workspaces array in `package.json`:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "games/*"
  ]
}
```

**Step 2: Update turbo.json if needed**

No changes needed - turbo auto-discovers workspaces.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add games/* to monorepo workspaces"
```

---

## Task 3: Create Demo Game Package Structure

**Files:**
- Create: `games/demo/package.json`
- Create: `games/demo/tsconfig.json`
- Create: `games/demo/src/index.ts`

**Step 1: Create games directory**

```bash
mkdir -p games/demo/src/server games/demo/src/display
```

**Step 2: Create package.json**

```json
{
  "name": "@games/demo",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@party-game/game-framework": "*",
    "@party-game/shared-types": "*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create placeholder index.ts**

```typescript
// games/demo/src/index.ts
export const DEMO_GAME_ID = 'demo';

// Will be populated in subsequent tasks
export { DemoServer } from './server/DemoServer.js';
export { DemoScene } from './display/DemoScene.js';
```

**Step 5: Commit**

```bash
git add games/demo/
git commit -m "feat: create demo game package structure"
```

---

## Task 4: Implement Demo Game Server

**Files:**
- Create: `games/demo/src/server/DemoServer.ts`
- Create: `games/demo/src/server/DemoGameState.ts`
- Create: `games/demo/src/server/DemoPlayer.ts`
- Create: `games/demo/src/server/index.ts`

**Step 1: Create DemoPlayer**

```typescript
// games/demo/src/server/DemoPlayer.ts
import { BasePlayer } from '@party-game/game-framework/server';

export interface DemoPlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connected: boolean;
}

export class DemoPlayer extends BasePlayer {
  x: number = 400;
  y: number = 300;
  vx: number = 0;
  vy: number = 0;
  private speed: number = 200;

  constructor(id: string, name: string) {
    super(id, name);
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
      connected: this.connected
    };
  }

  handleInput(input: any): void {
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
```

**Step 2: Create DemoGameState**

```typescript
// games/demo/src/server/DemoGameState.ts
import { BaseGameState } from '@party-game/game-framework/server';
import { DemoPlayer, DemoPlayerState } from './DemoPlayer.js';

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DemoGameData {
  walls: Wall[];
}

export class DemoGameState extends BaseGameState {
  protected players: Map<string, DemoPlayer> = new Map();
  private walls: Wall[] = [];

  constructor() {
    super();
    this.initializeWalls();
  }

  private initializeWalls(): void {
    // Simple geometric walls for the demo
    this.walls = [
      // Top-left obstacle
      { x: 100, y: 100, width: 80, height: 80 },
      // Top-right obstacle
      { x: 620, y: 100, width: 80, height: 80 },
      // Center obstacle
      { x: 360, y: 250, width: 80, height: 100 },
      // Bottom-left obstacle
      { x: 100, y: 420, width: 80, height: 80 },
      // Bottom-right obstacle
      { x: 620, y: 420, width: 80, height: 80 },
    ];
  }

  addPlayer(id: string, name: string): DemoPlayer {
    const player = new DemoPlayer(id, name);
    this.players.set(id, player);
    return player;
  }

  getPlayer(id: string): DemoPlayer | undefined {
    return this.players.get(id);
  }

  handleInput(playerId: string, input: any): void {
    const player = this.players.get(playerId);
    if (player) {
      player.handleInput(input);
    }
  }

  update(deltaTime: number): void {
    for (const player of this.players.values()) {
      if (player.connected) {
        const prevX = player.x;
        const prevY = player.y;

        player.update(deltaTime);

        // Check wall collisions
        for (const wall of this.walls) {
          if (this.checkCollision(player, wall)) {
            player.x = prevX;
            player.y = prevY;
            break;
          }
        }
      }
    }
  }

  private checkCollision(player: DemoPlayer, wall: Wall): boolean {
    const playerRadius = 15;
    const closestX = Math.max(wall.x, Math.min(player.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(player.y, wall.y + wall.height));
    const distanceX = player.x - closestX;
    const distanceY = player.y - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (playerRadius * playerRadius);
  }

  getFullState(): { players: Record<string, DemoPlayerState>; gameData: DemoGameData; timestamp: number } {
    const playersObj: Record<string, DemoPlayerState> = {};
    for (const [id, player] of this.players) {
      playersObj[id] = player.getState();
    }
    return {
      players: playersObj,
      gameData: { walls: this.walls },
      timestamp: Date.now()
    };
  }

  getDelta(): any {
    const playersObj: Record<string, DemoPlayerState> = {};
    for (const [id, player] of this.players) {
      if (player.connected) {
        playersObj[id] = player.getState();
      }
    }
    return {
      players: playersObj,
      timestamp: Date.now()
    };
  }

  shouldSendFullSync(): boolean {
    return Date.now() % 1000 < 20;
  }
}
```

**Step 3: Create DemoServer**

```typescript
// games/demo/src/server/DemoServer.ts
import { GameServer, BaseGameState } from '@party-game/game-framework/server';
import { DemoGameState } from './DemoGameState.js';

export class DemoServer extends GameServer {
  createGameState(roomId: string): BaseGameState {
    return new DemoGameState();
  }
}
```

**Step 4: Create server index**

```typescript
// games/demo/src/server/index.ts
export { DemoServer } from './DemoServer.js';
export { DemoGameState } from './DemoGameState.js';
export { DemoPlayer } from './DemoPlayer.js';
```

**Step 5: Build and verify**

Run: `npm install && npm run build --filter=@games/demo`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add games/demo/src/server/
git commit -m "feat: implement demo game server with geometric walls"
```

---

## Task 5: Implement Demo Game Display Scene

**Files:**
- Create: `games/demo/src/display/DemoScene.ts`
- Create: `games/demo/src/display/index.ts`

**Step 1: Create DemoScene**

```typescript
// games/demo/src/display/DemoScene.ts
import Phaser from 'phaser';

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerData {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  connected: boolean;
}

interface GameState {
  players: Record<string, PlayerData>;
  gameData: { walls: Wall[] };
  timestamp: number;
}

export class DemoScene extends Phaser.Scene {
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private wallGraphics: Phaser.GameObjects.Graphics | null = null;
  private walls: Wall[] = [];

  constructor() {
    super({ key: 'DemoScene' });
  }

  create(): void {
    // Draw background grid
    this.drawBackground();

    // Wall graphics will be drawn when we receive state
    this.wallGraphics = this.add.graphics();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();

    // Background
    graphics.fillStyle(0x1a1a2e, 1);
    graphics.fillRect(0, 0, 800, 600);

    // Grid lines
    graphics.lineStyle(1, 0x2a2a4e, 0.3);
    for (let x = 0; x <= 800; x += 40) {
      graphics.lineBetween(x, 0, x, 600);
    }
    for (let y = 0; y <= 600; y += 40) {
      graphics.lineBetween(0, y, 800, y);
    }

    // Border
    graphics.lineStyle(3, 0x4a4a6e, 1);
    graphics.strokeRect(10, 10, 780, 580);
  }

  private drawWalls(): void {
    if (!this.wallGraphics) return;

    this.wallGraphics.clear();

    for (const wall of this.walls) {
      // Shadow
      this.wallGraphics.fillStyle(0x000000, 0.3);
      this.wallGraphics.fillRoundedRect(wall.x + 4, wall.y + 4, wall.width, wall.height, 8);

      // Wall body
      this.wallGraphics.fillStyle(0x4a4a6e, 1);
      this.wallGraphics.fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 8);

      // Highlight
      this.wallGraphics.fillStyle(0x6a6a8e, 1);
      this.wallGraphics.fillRoundedRect(wall.x + 4, wall.y + 4, wall.width - 8, wall.height / 3, 4);
    }
  }

  updateState(state: GameState): void {
    // Update walls if provided
    if (state.gameData?.walls) {
      this.walls = state.gameData.walls;
      this.drawWalls();
    }

    // Update players
    const currentPlayers = new Set(Object.keys(state.players));

    // Remove disconnected players
    for (const [id, sprite] of this.playerSprites) {
      if (!currentPlayers.has(id) || !state.players[id].connected) {
        sprite.destroy();
        this.playerSprites.delete(id);
      }
    }

    // Update or create players
    for (const [id, playerData] of Object.entries(state.players)) {
      if (!playerData.connected) continue;

      let container = this.playerSprites.get(id);

      if (!container) {
        container = this.createPlayerSprite(playerData);
        this.playerSprites.set(id, container);
      }

      // Smooth interpolation
      const targetX = playerData.x;
      const targetY = playerData.y;
      container.x += (targetX - container.x) * 0.3;
      container.y += (targetY - container.y) * 0.3;
    }
  }

  private createPlayerSprite(playerData: PlayerData): Phaser.GameObjects.Container {
    const container = this.add.container(playerData.x, playerData.y);

    const color = parseInt(playerData.color.replace('#', ''), 16);

    // Shadow
    const shadow = this.add.circle(2, 2, 15, 0x000000, 0.3);
    container.add(shadow);

    // Body (gradient effect using multiple circles)
    const bodyOuter = this.add.circle(0, 0, 15, color, 1);
    const bodyInner = this.add.circle(-3, -3, 8, 0xffffff, 0.3);
    container.add(bodyOuter);
    container.add(bodyInner);

    // Direction indicator
    const indicator = this.add.triangle(10, 0, 0, -4, 8, 0, 0, 4, color);
    container.add(indicator);

    // Name label
    const nameText = this.add.text(0, -25, playerData.name, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(nameText);

    return container;
  }
}
```

**Step 2: Create display index**

```typescript
// games/demo/src/display/index.ts
export { DemoScene } from './DemoScene.js';
```

**Step 3: Update main index**

Update `games/demo/src/index.ts`:

```typescript
// games/demo/src/index.ts
import type { GameDefinition } from '@party-game/shared-types';
import { DemoServer } from './server/index.js';
import { DemoScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'demo',
  name: 'Demo',
  maxPlayers: 12,
  createServer: (io, roomCode) => new DemoServer(io),
  scenes: [DemoScene],
  entryScene: 'DemoScene',
  assetPath: '/games/demo/assets'
};

export { DemoServer } from './server/index.js';
export { DemoScene } from './display/index.js';
```

**Step 4: Build and verify**

Run: `npm run build --filter=@games/demo`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add games/demo/src/
git commit -m "feat: implement demo game display scene with geometric visuals"
```

---

## Task 6: Create Sprout Land Game Package Structure

**Files:**
- Create: `games/sprout-land/package.json`
- Create: `games/sprout-land/tsconfig.json`
- Create: `games/sprout-land/src/index.ts`

**Step 1: Create directory structure**

```bash
mkdir -p games/sprout-land/src/server games/sprout-land/src/display games/sprout-land/assets
```

**Step 2: Create package.json**

```json
{
  "name": "@games/sprout-land",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@party-game/game-framework": "*",
    "@party-game/shared-types": "*"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Commit structure**

```bash
git add games/sprout-land/package.json games/sprout-land/tsconfig.json
git commit -m "feat: create sprout-land game package structure"
```

---

## Task 7: Move Sprout Land Server Code

**Files:**
- Move: `apps/server/src/games/MovementGameServer.ts` → `games/sprout-land/src/server/SproutLandServer.ts`
- Move: `apps/server/src/games/MovementGameState.ts` → `games/sprout-land/src/server/SproutLandState.ts`
- Move: `apps/server/src/games/MovementPlayer.ts` → `games/sprout-land/src/server/SproutLandPlayer.ts`
- Create: `games/sprout-land/src/server/index.ts`
- Create: `games/sprout-land/src/server/storeConfig.ts`

**Step 1: Copy and rename MovementPlayer.ts to SproutLandPlayer.ts**

Copy the content from `apps/server/src/games/MovementPlayer.ts` to `games/sprout-land/src/server/SproutLandPlayer.ts`.

Rename the class from `MovementPlayer` to `SproutLandPlayer`.

**Step 2: Copy and rename MovementGameState.ts to SproutLandState.ts**

Copy the content from `apps/server/src/games/MovementGameState.ts` to `games/sprout-land/src/server/SproutLandState.ts`.

Rename:
- `MovementGameState` → `SproutLandState`
- `MovementPlayer` import → `SproutLandPlayer`

**Step 3: Copy and rename MovementGameServer.ts to SproutLandServer.ts**

Copy the content from `apps/server/src/games/MovementGameServer.ts` to `games/sprout-land/src/server/SproutLandServer.ts`.

Rename:
- `MovementGameServer` → `SproutLandServer`
- `MovementGameState` import → `SproutLandState`
- `MovementPlayer` import → `SproutLandPlayer`

**Step 4: Copy storeConfig.ts**

Copy `packages/shared-types/src/storeConfig.ts` to `games/sprout-land/src/server/storeConfig.ts`.

This is game-specific configuration that belongs with the game.

**Step 5: Create server index**

```typescript
// games/sprout-land/src/server/index.ts
export { SproutLandServer } from './SproutLandServer.js';
export { SproutLandState } from './SproutLandState.js';
export { SproutLandPlayer } from './SproutLandPlayer.js';
export * from './storeConfig.js';
```

**Step 6: Build and verify**

Run: `npm run build --filter=@games/sprout-land`
Expected: Build succeeds (may need to fix import paths)

**Step 7: Commit**

```bash
git add games/sprout-land/src/server/
git commit -m "feat: move sprout-land server code to game package"
```

---

## Task 8: Move Sprout Land Display Code

**Files:**
- Move: `apps/game-display/src/scenes/MainScene.ts` → `games/sprout-land/src/display/MainScene.ts`
- Move: `apps/game-display/src/scenes/InteriorScene.ts` → `games/sprout-land/src/display/InteriorScene.ts`
- Move: `apps/game-display/src/scenes/FieldScene.ts` → `games/sprout-land/src/display/FieldScene.ts`
- Create: `games/sprout-land/src/display/index.ts`

**Step 1: Copy scene files**

Copy all scene files from `apps/game-display/src/scenes/` to `games/sprout-land/src/display/`.

**Step 2: Create display index**

```typescript
// games/sprout-land/src/display/index.ts
export { MainScene } from './MainScene.js';
export { InteriorScene } from './InteriorScene.js';
export { FieldScene } from './FieldScene.js';
```

**Step 3: Commit**

```bash
git add games/sprout-land/src/display/
git commit -m "feat: move sprout-land display scenes to game package"
```

---

## Task 9: Move Sprout Land Assets

**Files:**
- Move: `apps/game-display/public/assets/sprout-land/` → `games/sprout-land/assets/`

**Step 1: Copy assets**

```bash
cp -r apps/game-display/public/assets/sprout-land/* games/sprout-land/assets/
```

**Step 2: Commit**

```bash
git add games/sprout-land/assets/
git commit -m "feat: move sprout-land assets to game package"
```

---

## Task 10: Create Sprout Land Game Definition

**Files:**
- Create: `games/sprout-land/src/index.ts`

**Step 1: Create the game definition export**

```typescript
// games/sprout-land/src/index.ts
import type { GameDefinition } from '@party-game/shared-types';
import { SproutLandServer } from './server/index.js';
import { MainScene, InteriorScene, FieldScene } from './display/index.js';

export const game: GameDefinition = {
  id: 'sprout-land',
  name: 'Sprout Land',
  maxPlayers: 12,
  createServer: (io, roomCode) => new SproutLandServer(io),
  scenes: [MainScene, InteriorScene, FieldScene],
  entryScene: 'MainScene',
  assetPath: '/games/sprout-land/assets'
};

export { SproutLandServer } from './server/index.js';
export { MainScene, InteriorScene, FieldScene } from './display/index.js';
```

**Step 2: Build and verify**

Run: `npm run build --filter=@games/sprout-land`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add games/sprout-land/src/index.ts
git commit -m "feat: create sprout-land game definition export"
```

---

## Task 11: Create Games Registry Module

**Files:**
- Create: `packages/shared-types/src/games.ts`
- Modify: `packages/shared-types/src/index.ts`

**Step 1: Create games registry**

```typescript
// packages/shared-types/src/games.ts
import { registry, type GameDefinition } from './game-registry.js';

// Import games - these will be registered at startup
// In production, this could be dynamic loading

let gamesInitialized = false;

export async function initializeGames(): Promise<void> {
  if (gamesInitialized) return;

  // Games are registered in order - first gets 'A', second gets 'B', etc.
  try {
    const { game: demoGame } = await import('@games/demo');
    registry.register(demoGame);
  } catch (e) {
    console.warn('Demo game not available');
  }

  try {
    const { game: sproutLandGame } = await import('@games/sprout-land');
    registry.register(sproutLandGame);
  } catch (e) {
    console.warn('Sprout Land game not available');
  }

  gamesInitialized = true;
}

export { registry };
```

**Step 2: Export from index**

Add to `packages/shared-types/src/index.ts`:

```typescript
export * from './games.js';
```

**Step 3: Commit**

```bash
git add packages/shared-types/src/games.ts packages/shared-types/src/index.ts
git commit -m "feat: add games initialization module"
```

---

## Task 12: Update Server for Multi-Game Support

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Update server to support multiple games**

Replace `apps/server/src/index.ts`:

```typescript
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeGames, registry } from '@party-game/shared-types';
import { getLocalIpAddress } from './utils/network.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const localIp = getLocalIpAddress();

// Store active game servers per room
const activeServers: Map<string, any> = new Map();

async function main() {
  // Initialize all games
  await initializeGames();

  const games = registry.getAllGames();
  console.log(`Loaded ${games.length} games: ${games.map(g => g.id).join(', ')}`);

  // Set up namespace for each game
  for (const game of games) {
    const namespace = io.of(`/${game.id}`);

    namespace.on('connection', (socket) => {
      console.log(`[${game.id}] Socket connected: ${socket.id}`);

      socket.on('room:create', () => {
        const roomCode = registry.generateRoomCode(game.id);
        if (!roomCode) {
          socket.emit('room:error', { code: 'INVALID_GAME', message: 'Invalid game' });
          return;
        }

        const server = game.createServer(namespace, roomCode);
        activeServers.set(roomCode, server);

        // Manually trigger room creation on the server
        server.io = namespace;
        const room = server.roomManager.createRoom(socket.id);
        const gameState = server.createGameState(room.roomId);
        server.gameStates.set(room.roomId, gameState);

        socket.join(room.roomId);
        socket.emit('room:created', {
          roomCode: roomCode,
          roomId: room.roomId,
          serverIp: localIp
        });

        console.log(`[${game.id}] Room created: ${roomCode}`);
      });

      // Other events handled by game server
    });
  }

  app.use(cors());
  app.use(express.json());

  // API endpoint to create a room for a specific game
  app.post('/api/room/create', async (req, res) => {
    const { gameId } = req.body;
    const game = registry.getGame(gameId);

    if (!game) {
      res.status(400).json({ error: 'Invalid game ID' });
      return;
    }

    const roomCode = registry.generateRoomCode(gameId);
    res.json({ roomCode, gameId });
  });

  // API to get all available games
  app.get('/api/games', (req, res) => {
    const games = registry.getAllGames().map(g => ({
      id: g.id,
      name: g.name,
      maxPlayers: g.maxPlayers
    }));
    res.json({ games });
  });

  // API to parse a room code
  app.get('/api/room/:code', (req, res) => {
    const parsed = registry.parseRoomCode(req.params.code);
    if (!parsed) {
      res.status(404).json({ error: 'Invalid room code' });
      return;
    }
    res.json(parsed);
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    // Serve game assets
    app.use('/games', express.static(path.join(__dirname, '../../../games')));

    // Serve controller app
    app.use('/controller', express.static(path.join(__dirname, '../../controller/dist')));

    // Serve display app assets
    app.use('/assets', express.static(path.join(__dirname, '../../game-display/dist/assets')));

    // Handle routes
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../game-display/dist/index.html'));
    });

    app.get('/room/:roomCode', (req, res) => {
      res.sendFile(path.join(__dirname, '../../game-display/dist/index.html'));
    });

    app.get('/:gameId', (req, res) => {
      const game = registry.getGame(req.params.gameId);
      if (game) {
        res.sendFile(path.join(__dirname, '../../game-display/dist/index.html'));
      } else {
        res.status(404).send('Game not found');
      }
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${localIp}:${PORT}`);
  });
}

main().catch(console.error);
```

**Step 2: Build and verify**

Run: `npm run build --filter=@party-game/server`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat: update server for multi-game support with namespaces"
```

---

## Task 13: Update Display App for Multi-Game Support

**Files:**
- Modify: `apps/game-display/src/main.ts`
- Create: `apps/game-display/src/pages/GameSelector.ts`
- Create: `apps/game-display/src/pages/NotFound.ts`

**Step 1: Create GameSelector page**

```typescript
// apps/game-display/src/pages/GameSelector.ts
export function showGameSelector(games: Array<{ id: string; name: string }>): void {
  const container = document.getElementById('game-container') || document.body;

  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: white;
      font-family: system-ui, sans-serif;
    ">
      <h1 style="margin-bottom: 2rem; font-size: 2.5rem;">Select a Game</h1>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
        ${games.map(game => `
          <button
            onclick="window.location.href='/${game.id}/'"
            style="
              padding: 1.5rem 3rem;
              font-size: 1.25rem;
              background: #4a4a6e;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#6a6a8e'"
            onmouseout="this.style.background='#4a4a6e'"
          >
            ${game.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
```

**Step 2: Create NotFound page**

```typescript
// apps/game-display/src/pages/NotFound.ts
export function showNotFound(message: string = 'Page not found'): void {
  const container = document.getElementById('game-container') || document.body;

  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: white;
      font-family: system-ui, sans-serif;
    ">
      <h1 style="font-size: 4rem; margin-bottom: 1rem;">404</h1>
      <p style="font-size: 1.25rem; color: #888;">${message}</p>
      <a
        href="/"
        style="
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: #4a4a6e;
          color: white;
          text-decoration: none;
          border-radius: 8px;
        "
      >
        Back to Home
      </a>
    </div>
  `;
}
```

**Step 3: Update main.ts**

```typescript
// apps/game-display/src/main.ts
import Phaser from 'phaser';
import { URLBuilder, initializeGames, registry } from '@party-game/shared-types';
import { showGameSelector } from './pages/GameSelector';
import { showNotFound } from './pages/NotFound';

async function main() {
  await initializeGames();

  const urlBuilder = new URLBuilder({
    serverUrl: import.meta.env.VITE_GAME_SERVER_URL,
    displayUrl: import.meta.env.VITE_GAME_DISPLAY_URL,
    controllerUrl: import.meta.env.VITE_GAME_CONTROLLER_URL
  });

  const path = window.location.pathname;
  const pathParts = path.split('/').filter(Boolean);

  // Check if it's a room join: /room/AX7K2
  if (pathParts[0] === 'room' && pathParts[1]) {
    const parsed = registry.parseRoomCode(pathParts[1]);
    if (parsed) {
      await bootGame(parsed.gameId, parsed.roomCode, urlBuilder);
    } else {
      showNotFound('Invalid room code');
    }
    return;
  }

  // Check if it's a game path: /demo/ or /sprout-land/
  if (pathParts[0]) {
    const game = registry.getGame(pathParts[0]);
    if (game) {
      // Create new room for this game
      await bootGame(game.id, null, urlBuilder);
      return;
    }
  }

  // Root path: show game selector
  if (!pathParts[0]) {
    const games = registry.getAllGames().map(g => ({ id: g.id, name: g.name }));
    showGameSelector(games);
    return;
  }

  // Unknown path: 404
  showNotFound('Game not found');
}

async function bootGame(gameId: string, roomCode: string | null, urlBuilder: URLBuilder) {
  const game = registry.getGame(gameId);
  if (!game) {
    showNotFound('Game not found');
    return;
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    parent: document.body,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: game.scenes
  };

  const phaserGame = new Phaser.Game(config);

  // Pass connection info to the scene
  phaserGame.scene.start(game.entryScene, {
    socketNamespace: `/${gameId}`,
    assetPath: game.assetPath,
    roomCode,
    serverUrl: urlBuilder.getServerUrl()
  });
}

main().catch(console.error);
```

**Step 4: Build and verify**

Run: `npm run build --filter=@party-game/game-display`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/game-display/src/
git commit -m "feat: update display app for multi-game support with routing"
```

---

## Task 14: Update Controller App for Multi-Game Support

**Files:**
- Modify: `apps/controller/src/App.tsx`

**Step 1: Update App.tsx to derive game from room code**

```typescript
// apps/controller/src/App.tsx
import { useState, useEffect } from 'react';
import { initializeGames, registry } from '@party-game/shared-types';
import { ControllerPage } from './pages/ControllerPage';
import { HomePage } from './pages/HomePage';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      await initializeGames();

      // Check URL for room code
      const path = window.location.pathname;
      const match = path.match(/\/controller\/([A-Z0-9]+)/i);

      if (match) {
        const code = match[1].toUpperCase();
        const parsed = registry.parseRoomCode(code);

        if (parsed) {
          setRoomCode(parsed.roomCode);
          setGameId(parsed.gameId);
        }
      }

      setInitialized(true);
    }

    init();
  }, []);

  if (!initialized) {
    return <div>Loading...</div>;
  }

  if (roomCode && gameId) {
    return <ControllerPage roomCode={roomCode} gameId={gameId} />;
  }

  return <HomePage onJoin={(code) => {
    const parsed = registry.parseRoomCode(code);
    if (parsed) {
      window.location.href = `/controller/${parsed.roomCode}`;
    } else {
      alert('Invalid room code');
    }
  }} />;
}

export default App;
```

**Step 2: Build and verify**

Run: `npm run build --filter=@party-game/controller`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/controller/src/App.tsx
git commit -m "feat: update controller to derive game from room code prefix"
```

---

## Task 15: Clean Up Old Game-Specific Code

**Files:**
- Delete: `apps/server/src/games/` (entire directory)
- Modify: `packages/shared-types/src/index.ts` (remove storeConfig export if game-specific)

**Step 1: Remove old server game files**

```bash
rm -rf apps/server/src/games/
```

**Step 2: Update shared-types if needed**

If storeConfig was game-specific, remove it from shared-types exports.

**Step 3: Build everything**

Run: `npm run build`
Expected: All packages build successfully

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old game-specific code from apps"
```

---

## Task 16: Test Full System

**Step 1: Start development servers**

```bash
npm run dev
```

**Step 2: Verify game selector**

Navigate to `http://localhost:3000/`
Expected: Shows game selector with "Demo" and "Sprout Land"

**Step 3: Test demo game**

1. Click "Demo" or navigate to `/demo/`
2. Expected: Room is created with code starting with 'A' (e.g., AX7K2)
3. Join with controller using the room code
4. Expected: Player appears as geometric circle, can move around

**Step 4: Test sprout-land game**

1. Navigate to `/sprout-land/`
2. Expected: Room is created with code starting with 'B' (e.g., BX7K2)
3. Join with controller
4. Expected: Sprout Land game works as before

**Step 5: Test room code routing**

1. Navigate to `/room/AX7K2` (use actual demo room code)
2. Expected: Joins demo game
3. Navigate to `/room/BX7K2` (use actual sprout-land room code)
4. Expected: Joins sprout-land game

**Step 6: Commit final verification**

```bash
git add -A
git commit -m "test: verify multi-game framework working end-to-end"
```

---

## Summary

After completing all tasks, the codebase will have:

1. **Game Registry** - `GameRegistry` class with dynamic prefix assignment
2. **Demo Game** - Minimal geometric game in `games/demo/`
3. **Sprout Land Game** - Existing game moved to `games/sprout-land/`
4. **Multi-Game Server** - Server handles multiple games via namespaces
5. **Smart Routing** - Room codes encode game, URLs route correctly
6. **Game Selector** - Homepage shows available games
