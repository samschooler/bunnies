# Party Game Monorepo

A local networked HTML5 party game supporting 12+ players.

## Architecture
- **apps/server**: Node.js + Socket.io backend
- **apps/game-display**: Phaser.js TV display
- **apps/controller**: React phone controller
- **packages/shared-types**: Shared TypeScript types
- **packages/game-framework**: Reusable multiplayer framework

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
# Run all packages in dev mode
npm run dev

# Or run individual packages
npm run dev:server      # Server on port 3000
npm run dev:display     # Display on port 5173
npm run dev:controller  # Controller on port 5174
```

### Building
```bash
npm run build
```

## How to Play

1. Start the server and display: `npm run dev:server` and `npm run dev:display`
2. Open the display in your browser (http://localhost:5173)
3. Scan the QR code with your phone or manually navigate to the controller URL
4. Enter your name and start playing!

## Tech Stack
- TypeScript
- Turbo (monorepo)
- Socket.io (real-time communication)
- Phaser 3 (game engine)
- React (controller UI)
- Node.js (backend)
