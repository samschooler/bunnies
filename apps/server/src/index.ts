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
import { registry } from '@party-game/shared-types';
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

// Server-side game initialization - imports server-only code (no Phaser)
async function initializeGamesServer(): Promise<void> {
  // Games are registered in order - first gets 'A', second gets 'B', etc.
  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: demoGame } = await import('@games/demo/dist/server-entry.js');
    registry.register(demoGame);
  } catch (e) {
    console.warn('Demo game not available:', e);
  }

  try {
    // @ts-ignore - Dynamic import resolved at runtime
    const { game: sproutLandGame } = await import('@games/sprout-land/dist/server-entry.js');
    registry.register(sproutLandGame);
  } catch (e) {
    console.warn('Sprout Land game not available:', e);
  }
}

async function main() {
  // Initialize all games (server-side, no Phaser)
  await initializeGamesServer();

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

        const server = game.createServer(namespace as any, roomCode);
        activeServers.set(roomCode, server);

        // Manually trigger room creation on the server with pre-generated room code
        server.io = namespace;
        const room = server.roomManager.createRoom(socket.id, roomCode);
        const gameState = server.createGameState(room.roomId);
        server.gameStates.set(room.roomId, gameState);

        socket.join(room.roomId);
        socket.emit('room:created', {
          roomCode: room.roomCode,
          roomId: room.roomId,
          serverIp: localIp
        });
        socket.emit('room:code', room.roomCode);

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
