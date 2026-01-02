# Production Deployment Guide

This guide covers how to build and run the party game in production mode.

## Quick Start

### 1. Build Everything

```bash
npm run build
```

This compiles all packages and creates optimized production bundles.

### 2. Run in Production

```bash
npm start
```

The server will start on port 3000 and serve all apps:
- Display: `http://<YOUR_IP>:3000/display`
- Controller: `http://<YOUR_IP>:3000/controller/<ROOM_CODE>`

## Architecture

In production, everything is served from a single Node.js server:

```
Port 3000 (Node.js + Express)
├── /display          → Phaser game display (TV)
├── /controller/:code → React controller (phones)
└── WebSocket         → Socket.io for real-time communication
```

## Environment Variables

### Required for Production

None! The app works out-of-the-box on your local network.

### Optional Configuration

Create `apps/server/.env`:
```bash
PORT=3000                    # Server port (default: 3000)
```

Create `apps/game-display/.env.production`:
```bash
# Override server URL (useful for custom deployments)
VITE_SERVER_URL=http://192.168.1.100:3000
```

Create `apps/controller/.env.production`:
```bash
# Override server URL
VITE_SERVER_URL=http://192.168.1.100:3000
```

## Deployment Options

### Option 1: Local Network (Living Room Setup)

This is the typical use case - run on a computer connected to your TV.

1. Build:
   ```bash
   npm run build
   ```

2. Start:
   ```bash
   npm start
   ```

3. Open display on TV:
   - Navigate to: `http://localhost:3000/display`
   - Or use the computer's IP: `http://192.168.1.X:3000/display`

4. Players scan QR code with phones or visit controller URL directly

### Option 2: Persistent Background Service (systemd)

For a dedicated game server that always runs:

Create `/etc/systemd/system/party-game.service`:
```ini
[Unit]
Description=Party Game Server
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/game
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node apps/server/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable party-game
sudo systemctl start party-game
sudo systemctl status party-game
```

### Option 3: Docker (Advanced)

Create `Dockerfile` in the root:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy all workspace packages
COPY apps/ ./apps/
COPY packages/ ./packages/

# Install dependencies
RUN npm install

# Build everything
RUN npm run build

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start server
CMD ["node", "apps/server/dist/index.js"]
```

Build and run:
```bash
docker build -t party-game .
docker run -p 3000:3000 party-game
```

## Network Setup

### Finding Your Local IP

**macOS:**
```bash
ipconfig getifaddr en0
```

**Linux:**
```bash
hostname -I | awk '{print $1}'
```

**Windows:**
```bash
ipconfig
```
(Look for "IPv4 Address")

### Firewall Configuration

Ensure port 3000 is accessible on your local network:

**macOS:**
System Preferences → Security & Privacy → Firewall → Firewall Options
→ Allow incoming connections for Node

**Linux (ufw):**
```bash
sudo ufw allow 3000/tcp
```

**Windows:**
Control Panel → Windows Defender Firewall → Allow an app
→ Add Node.js

## Performance Optimization

### For 12+ Players

The default configuration supports 12+ players smoothly. For even more players:

1. **Increase update rate** (if network is fast):
   Edit `apps/server/src/games/MovementGameState.ts`:
   ```typescript
   protected updateInterval: number = 1000 / 120; // 120fps
   ```

2. **Reduce state sync frequency** (if network is slow):
   Edit `packages/game-framework/src/server/BaseGameState.ts`:
   ```typescript
   protected fullSyncInterval: number = 2000; // 2 seconds
   ```

## Monitoring

### Server Logs

Production mode logs to console. Redirect to file:
```bash
npm start > server.log 2>&1
```

Or with systemd, view logs:
```bash
sudo journalctl -u party-game -f
```

### Health Check

Check if server is running:
```bash
curl http://localhost:3000/display
```

## Troubleshooting

### QR Code Shows Wrong URL

The QR code auto-detects your local IP. If wrong, set explicitly:

Edit `apps/game-display/.env.production`:
```bash
VITE_SERVER_URL=http://YOUR_ACTUAL_IP:3000
```

Rebuild display:
```bash
npm run build:display
```

### Players Can't Connect

1. Check firewall allows port 3000
2. Verify server shows correct local IP on startup
3. Ensure phones are on same network as server
4. Try accessing `http://<SERVER_IP>:3000/controller/TEST` from phone

### Build Errors

Clean and rebuild:
```bash
npm run clean
npm install
npm run build
```

## Updating

When you make code changes:

1. Rebuild affected packages:
   ```bash
   npm run build
   ```

2. Restart server:
   ```bash
   # Kill existing server (Ctrl+C)
   npm start
   ```

   Or with systemd:
   ```bash
   sudo systemctl restart party-game
   ```

## Security Notes

This app is designed for **local network use only**. Do NOT expose to the internet without:
- Adding authentication
- Using HTTPS
- Implementing rate limiting
- Adding input validation

For local network use, it's safe as-is.
