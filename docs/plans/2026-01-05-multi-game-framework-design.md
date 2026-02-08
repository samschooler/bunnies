# Multi-Game Framework Design

## Overview

Transform the single-game codebase into a multi-game platform where the server handles multiple games dynamically, each game is a self-contained package, and the existing Sprout Land game is preserved at its own path.

## Goals

- **Starter template**: Minimal geometric demo game that showcases the framework
- **Multi-game support**: Server dynamically loads and routes to different games
- **Clean separation**: Games are isolated packages with a standard interface
- **Preserve Sprout Land**: Move to `/sprout-land/` path, fully functional

## Project Structure

```
/game
├── apps/
│   ├── server/                 # Generic game server (loads games dynamically)
│   ├── game-display/           # Generic Phaser shell (loads game scenes)
│   └── controller/             # Generic React controller (loads game UI)
│
├── packages/
│   ├── game-framework/         # Base classes (unchanged)
│   └── shared-types/           # Core types + game registry types
│
├── games/                      # All games live here
│   ├── demo/                   # Minimal geometric demo (new)
│   │   ├── package.json        # @games/demo
│   │   ├── server/
│   │   ├── display/
│   │   └── assets/
│   │
│   └── sprout-land/            # Existing game (moved)
│       ├── package.json        # @games/sprout-land
│       ├── server/
│       ├── display/
│       ├── assets/
│       └── index.ts
│
└── turbo.json                  # Updated to include games/*
```

## Game Interface Contract

Each game exports a standard `GameDefinition`:

```typescript
// packages/shared-types/src/game-registry.ts

export interface GameDefinition {
  id: string;                          // 'demo', 'sprout-land'
  name: string;                        // Display name
  maxPlayers: number;

  // Server-side
  createServer: (io: Server, roomCode: string) => GameServer;

  // Display-side
  scenes: typeof Phaser.Scene[];       // Array of Phaser scenes
  entryScene: string;                  // Which scene to start

  // Controller-side (optional)
  controllerComponent?: React.ComponentType;  // Custom controller UI

  // Assets
  assetPath: string;                   // '/games/demo/assets'
}
```

Example game export:

```typescript
// games/demo/index.ts
import { DemoServer } from './server';
import { DemoScene } from './display/DemoScene';

export const game: GameDefinition = {
  id: 'demo',
  name: 'Demo',
  maxPlayers: 12,
  createServer: (io, roomCode) => new DemoServer(io, roomCode),
  scenes: [DemoScene],
  entryScene: 'DemoScene',
  assetPath: '/games/demo/assets',
};
```

## Game Registry with Dynamic Room Prefixes

Room codes encode which game they belong to via a prefix assigned at registration:

```typescript
class GameRegistry {
  private games = new Map<string, GameDefinition>();
  private prefixToGame = new Map<string, string>();  // 'A' → 'demo'
  private gameToPrefix = new Map<string, string>();  // 'demo' → 'A'

  register(game: GameDefinition) {
    const prefix = String.fromCharCode(65 + this.games.size); // A, B, C...

    this.games.set(game.id, game);
    this.prefixToGame.set(prefix, game.id);
    this.gameToPrefix.set(game.id, prefix);
  }

  generateRoomCode(gameId: string): string {
    const prefix = this.gameToPrefix.get(gameId);
    const code = generateRandomChars(4);
    return `${prefix}${code}`;  // e.g., 'AX7K2'
  }

  parseRoomCode(code: string): { gameId: string; roomCode: string } | null {
    const prefix = code[0];
    const gameId = this.prefixToGame.get(prefix);
    if (!gameId) return null;
    return { gameId, roomCode: code };
  }
}
```

User flow:
1. Player enters room code `BX7K2`
2. System sees `B` prefix → Sprout Land
3. Connects to correct game automatically

## Server Architecture

Server uses Socket.io namespaces per game:

```typescript
// apps/server/src/index.ts

import { games } from 'shared-types/games';

const io = new Server(httpServer);

for (const [gameId, game] of Object.entries(games)) {
  const namespace = io.of(`/${gameId}`);

  namespace.on('connection', (socket) => {
    socket.on('room:create', () => {
      const roomCode = registry.generateRoomCode(gameId);
      const server = game.createServer(namespace, roomCode);
      activeRooms.set(roomCode, server);
    });

    socket.on('room:join', ({ roomCode }) => {
      const server = activeRooms.get(roomCode);
      server?.addPlayer(socket);
    });
  });
}
```

## Display App Architecture

Display loads the correct game based on URL or room code:

```typescript
// apps/game-display/src/main.ts

import { games, registry } from 'shared-types/games';

const pathParts = window.location.pathname.split('/').filter(Boolean);

// Check if it's a room join: /room/AX7K2
if (pathParts[0] === 'room' && pathParts[1]) {
  const parsed = registry.parseRoomCode(pathParts[1]);
  if (parsed) {
    bootGame(games[parsed.gameId], parsed.roomCode);
  } else {
    show404();
  }
}
// Check if it's a game path: /demo/ or /sprout-land/
else if (pathParts[0] && games[pathParts[0]]) {
  bootGame(games[pathParts[0]], null);
}
// Root path: show game selector
else if (!pathParts[0]) {
  showGameSelector(Object.values(games));
}
// Unknown path: 404
else {
  show404();
}

function bootGame(game: GameDefinition, roomCode: string | null) {
  const config: Phaser.Types.Core.GameConfig = {
    scene: game.scenes,
    // ...
  };

  const phaserGame = new Phaser.Game(config);
  phaserGame.scene.start(game.entryScene, {
    socketNamespace: `/${game.id}`,
    assetPath: game.assetPath,
    roomCode,
  });
}
```

## Controller App Architecture

Controller supports custom game UIs with a default fallback:

```typescript
// apps/controller/src/App.tsx

import { games, registry } from 'shared-types/games';
import { DefaultController } from './components/DefaultController';

function App() {
  const { roomCode } = useParams();

  if (!roomCode) {
    return <JoinScreen />;
  }

  const parsed = registry.parseRoomCode(roomCode);
  if (!parsed) {
    return <NotFound />;
  }

  const game = games[parsed.gameId];
  const ControllerComponent = game.controllerComponent || DefaultController;

  return (
    <GameProvider gameId={parsed.gameId} roomCode={roomCode}>
      <ControllerComponent />
    </GameProvider>
  );
}
```

Default controller provides:
- Virtual joystick for movement
- Action button (generic "interact")
- Player color/name selection

## URL Structure

| URL | Behavior |
|-----|----------|
| `/` | Game selector homepage |
| `/demo/` | Demo game (create new room) |
| `/sprout-land/` | Sprout Land (create new room) |
| `/room/AX7K2` | Join room (game derived from prefix) |
| `/unknown/` | 404 page |

## Demo Game Design

Minimal geometric demo showcasing the framework:

**Visual style:**
- Players: Circles with gradient and directional indicator
- Walls: Rounded rectangles with soft shadows
- Floor: Subtle grid pattern, muted colors
- Palette: Clean pastels or monochrome with player accent colors

**Map:**
- Simple arena with scattered wall obstacles
- Defined in code (no tilemap editor)
- ~10 collision rectangles
- Spawn zone in center

**Implementation:**
- All graphics drawn with Phaser's built-in shapes
- No external assets required
- ~100 lines of server code

## Sprout Land Migration

### File Moves

| From | To |
|------|-----|
| `apps/server/src/MovementGame*` | `games/sprout-land/server/` |
| `apps/server/src/storeConfig.ts` | `games/sprout-land/server/` |
| `apps/game-display/src/scenes/` | `games/sprout-land/display/` |
| `apps/game-display/public/assets/` | `games/sprout-land/assets/` |

### New Structure

```
games/sprout-land/
├── package.json                   # @games/sprout-land
├── index.ts                       # Exports GameDefinition
├── server/
│   ├── index.ts
│   ├── SproutLandServer.ts        # Renamed from MovementGameServer
│   ├── SproutLandState.ts         # Renamed from MovementGameState
│   ├── SproutLandPlayer.ts        # Renamed from MovementPlayer
│   └── storeConfig.ts
├── display/
│   ├── index.ts
│   ├── MainScene.ts
│   └── HouseScene.ts
└── assets/
    └── sprout-land/
```

### Renames

- `MovementGameServer` → `SproutLandServer`
- `MovementGameState` → `SproutLandState`
- `MovementPlayer` → `SproutLandPlayer`

## Adding a New Game

1. Create `games/my-game/` with standard structure
2. Implement server (extends `BaseGameState`, `BasePlayer`)
3. Implement display (Phaser scenes)
4. Export `GameDefinition` from `index.ts`
5. Register in game registry
6. Done - server and clients pick it up automatically
