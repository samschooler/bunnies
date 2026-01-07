// apps/game-display/src/main.ts
import Phaser from 'phaser';
import QRCode from 'qrcode';
import { URLBuilder, initializeGames, registry, GameState } from '@party-game/shared-types';
import { BaseGameDisplay } from '@party-game/game-framework';
import { showGameSelector } from './pages/GameSelector';
import { showNotFound } from './pages/NotFound';

// Game display class that connects socket.io to Phaser scenes
class GameDisplay extends BaseGameDisplay {
  private phaserGame: Phaser.Game;
  private urlBuilder: URLBuilder;
  private playerListElement: HTMLElement | null;
  private playerCountElement: HTMLElement | null;

  constructor(serverUrl: string, phaserGame: Phaser.Game, urlBuilder: URLBuilder) {
    super(serverUrl);
    this.phaserGame = phaserGame;
    this.urlBuilder = urlBuilder;
    this.playerListElement = document.getElementById('players');
    this.playerCountElement = document.getElementById('player-count');
  }

  onRoomCreated(roomCode: string): void {
    console.log('Room created:', roomCode);
    this.displayQRCode(roomCode);
    // Update URL to include room code
    const newPath = `/room/${roomCode}`;
    window.history.replaceState({}, '', newPath);
  }

  onStateUpdate(state: GameState): void {
    // Send state to all active Phaser scenes
    const scenes = this.phaserGame.scene.getScenes(true);
    scenes.forEach(scene => {
      scene.events.emit('state-update', state);
    });
    this.updatePlayerList(state.players);
  }

  onPlayerJoined(player: any): void {
    console.log('Player joined:', player.name);
  }

  onPlayerLeft(playerId: string): void {
    console.log('Player left:', playerId);
  }

  private async displayQRCode(roomCode: string): Promise<void> {
    const qrContainer = document.getElementById('qr-container');
    const qrCanvas = document.getElementById('qr-code') as HTMLCanvasElement;
    const roomCodeElement = document.getElementById('room-code');

    if (!qrContainer || !qrCanvas || !roomCodeElement) return;

    const controllerUrl = this.urlBuilder.getControllerUrl(roomCode);
    await QRCode.toCanvas(qrCanvas, controllerUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });

    roomCodeElement.textContent = roomCode;
    qrContainer.style.display = 'block';
  }

  private updatePlayerList(players: Record<string, any>): void {
    if (!this.playerListElement || !this.playerCountElement) return;

    // Filter out display clients
    const realPlayers = Object.values(players).filter(
      p => !p.name?.startsWith('__DISPLAY__')
    );

    this.playerCountElement.textContent = String(realPlayers.length);
    this.playerListElement.innerHTML = realPlayers.map(player => `
      <div class="player-item ${player.connected ? '' : 'player-disconnected'}">
        <span class="player-color" style="background-color: ${player.color}"></span>
        ${player.name}
      </div>
    `).join('');
  }
}

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
    width: 1920,
    height: 1080,
    backgroundColor: '#1a1a2e',
    parent: document.body,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: game.scenes
  };

  const phaserGame = new Phaser.Game(config);

  // Start the entry scene
  phaserGame.scene.start(game.entryScene);

  // Create game display with socket.io connection
  const serverUrl = urlBuilder.getServerUrl() + `/${gameId}`;
  const gameDisplay = new GameDisplay(serverUrl, phaserGame, urlBuilder);

  // Join existing room or create new one
  if (roomCode) {
    gameDisplay.joinRoom(roomCode);
  } else {
    gameDisplay.createRoom();
  }

  // Make available for debugging
  (window as any).gameDisplay = gameDisplay;
}

main().catch(console.error);
