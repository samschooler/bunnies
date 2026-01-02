import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { MovementGameDisplay } from './game/MovementGameDisplay';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);

// Get server URL from environment or use default
const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

// Parse room code from URL path
const path = window.location.pathname;
const roomCodeMatch = path.match(/^\/([A-Z0-9]{4})$/i);
const roomCode = roomCodeMatch ? roomCodeMatch[1].toUpperCase() : null;

// Only initialize game if we have a room code
if (roomCode) {
  // Initialize game display connection
  const gameDisplay = new MovementGameDisplay(serverUrl, game);

  // Join room with the code from URL
  console.log(`Joining room: ${roomCode}`);
  gameDisplay.joinRoom(roomCode);

  // Make it available globally for debugging
  (window as any).gameDisplay = gameDisplay;
} else {
  // No room code - this shouldn't happen because routing should handle it
  // But just in case, redirect to landing page
  console.error('No room code found in URL');
  window.location.href = '/';
}
