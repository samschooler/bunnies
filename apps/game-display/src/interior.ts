import Phaser from 'phaser';
import { URLBuilder } from '@party-game/shared-types';
import { InteriorScene } from './scenes/InteriorScene';
import { MovementGameDisplay } from './game/MovementGameDisplay';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 576,
  height: 640,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [InteriorScene]
};

const game = new Phaser.Game(config);

// Create URLBuilder instance
const urlBuilder = new URLBuilder({
  serverUrl: import.meta.env.VITE_GAME_SERVER_URL,
  displayUrl: import.meta.env.VITE_GAME_DISPLAY_URL,
  controllerUrl: import.meta.env.VITE_GAME_CONTROLLER_URL
});

const serverUrl = urlBuilder.getServerUrl();

// Parse room code from URL query parameter
const params = new URLSearchParams(window.location.search);
const roomCode = params.get('roomCode');

// Only initialize game if we have a room code
if (roomCode) {
  // Initialize game display connection
  const gameDisplay = new MovementGameDisplay(serverUrl, game, urlBuilder);

  // Join room with the code from URL
  console.log(`Interior display joining room: ${roomCode}`);
  gameDisplay.joinRoom(roomCode);

  // Make it available globally for debugging
  (window as any).gameDisplay = gameDisplay;
} else {
  console.error('No room code found in URL query parameters');
}
