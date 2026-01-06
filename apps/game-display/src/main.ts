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
