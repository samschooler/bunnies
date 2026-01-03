import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root
config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MovementGameServer } from './games/MovementGameServer.js';
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

// Initialize game server
const gameServer = new MovementGameServer(io, localIp);

app.use(cors());
app.use(express.json());

// API endpoint to create a room
app.post('/api/room/create', async (req, res) => {
  try {
    const roomCode = await gameServer.createRoomViaAPI();
    res.json({ roomCode });
  } catch (error: any) {
    console.error('Failed to create room:', error);
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve controller app static files
  app.use('/controller', express.static(path.join(__dirname, '../../controller/dist')));

  // Serve display app static assets (but not at root, we'll handle routing separately)
  app.use('/assets', express.static(path.join(__dirname, '../../game-display/dist/assets')));

  // Handle controller routes - serve controller HTML for /controller/:roomCode
  app.get('/controller/:roomCode', (req, res) => {
    res.sendFile(path.join(__dirname, '../../controller/dist/index.html'));
  });

  // Handle display routes - serve landing page at root
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../game-display/dist/index.landing.html'));
  });

  // Handle interior display route
  app.get('/interior.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../game-display/dist/interior.html'));
  });

  app.get('/:roomCode', (req, res) => {
    // Only match 4-character alphanumeric room codes
    const roomCode = req.params.roomCode;
    if (/^[A-Z0-9]{4}$/i.test(roomCode)) {
      res.sendFile(path.join(__dirname, '../../game-display/dist/index.html'));
    } else {
      res.status(404).send('Not found');
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIp}:${PORT}`);
  console.log(`\nDisplay: Create new room at http://${localIp}:${PORT}/`);
  console.log(`Display: Join existing room at http://${localIp}:${PORT}/:roomCode`);
  console.log(`Controller: http://${localIp}:${PORT}/controller/:roomCode`);
});
