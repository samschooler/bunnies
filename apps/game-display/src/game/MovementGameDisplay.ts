import { BaseGameDisplay } from '@party-game/game-framework/client';
import { GameState, PlayerData } from '@party-game/shared-types';
import QRCode from 'qrcode';

export class MovementGameDisplay extends BaseGameDisplay {
  private game: Phaser.Game;
  private playerListElement: HTMLElement;
  private playerCountElement: HTMLElement;
  private serverUrl: string;
  private currentRoomCode: string | null = null;
  private useNetworkIp: boolean = false;

  constructor(serverUrl: string, game: Phaser.Game) {
    super(serverUrl);
    this.serverUrl = serverUrl;
    this.game = game;
    this.playerListElement = document.getElementById('players')!;
    this.playerCountElement = document.getElementById('player-count')!;

    // Load saved preference
    const saved = localStorage.getItem('qr-use-network-ip');
    this.useNetworkIp = saved === 'true';

    // Setup toggle button
    const toggleButton = document.getElementById('qr-toggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggleQRMode());
      this.updateToggleButton();
    }
  }

  onRoomCreated(roomCode: string): void {
    console.log('Room created:', roomCode);
    this.currentRoomCode = roomCode;
    this.displayQRCode(roomCode);
  }

  private toggleQRMode(): void {
    this.useNetworkIp = !this.useNetworkIp;
    localStorage.setItem('qr-use-network-ip', String(this.useNetworkIp));
    this.updateToggleButton();

    // Regenerate QR code if room exists
    if (this.currentRoomCode) {
      this.displayQRCode(this.currentRoomCode);
    }
  }

  private updateToggleButton(): void {
    const button = document.getElementById('qr-toggle');
    if (button) {
      button.textContent = this.useNetworkIp ? 'Use Localhost' : 'Use Domain';
    }
  }

  onStateUpdate(state: GameState): void {
    // Send state to Phaser scene
    const scene = this.game.scene.getScene('MainScene');
    if (scene) {
      scene.events.emit('state-update', state);
    }
    this.updatePlayerList(state.players);
  }

  onPlayerJoined(player: PlayerData): void {
    console.log('Player joined:', player.name);
  }

  onPlayerLeft(playerId: string): void {
    console.log('Player left:', playerId);
  }

  private async displayQRCode(roomCode: string): Promise<void> {
    const qrContainer = document.getElementById('qr-container')!;
    const qrCanvas = document.getElementById('qr-code') as HTMLCanvasElement;
    const roomCodeElement = document.getElementById('room-code')!;

    // Get local network URL
    const url = this.getControllerUrl(roomCode);

    try {
      await QRCode.toCanvas(qrCanvas, url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      roomCodeElement.textContent = roomCode;
      qrContainer.style.display = 'block';
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  }

  private getControllerUrl(roomCode: string): string {
    // Use env var if explicitly set
    if (import.meta.env.VITE_CONTROLLER_URL) {
      return `${import.meta.env.VITE_CONTROLLER_URL}/${roomCode}`;
    }

    // In dev mode
    if (!import.meta.env.PROD) {
      if (this.useNetworkIp) {
        // Use the server URL from env (could be tunnel URL like play.sam.ink)
        const serverUrl = new URL(this.serverUrl);
        // If it's https (tunnel), keep https and use default port
        if (serverUrl.protocol === 'https:') {
          return `${serverUrl.origin}/${roomCode}`;
        }
        // If it's http with network IP, use port 5174
        return `http://${serverUrl.hostname}:5174/${roomCode}`;
      } else {
        // Localhost mode: always use localhost:5174 for Vite dev server
        return `http://localhost:5174/${roomCode}`;
      }
    }

    // In production, controller is served from same server
    const protocol = window.location.protocol;
    const port = window.location.port || '3000';

    if (this.useNetworkIp) {
      // Use the network IP provided by the server or window location
      const hostname = window.location.hostname || `${this.serverNetworkIp}:${port}`;
      return `${protocol}//${hostname}/controller/${roomCode}`;
    } else {
      // Use localhost
      return `${protocol}//localhost:${port}/controller/${roomCode}`;
    }
  }

  private updatePlayerList(players: Record<string, PlayerData>): void {
    const playerArray = Object.values(players);
    this.playerCountElement.textContent = playerArray.length.toString();

    this.playerListElement.innerHTML = playerArray
      .map(player => `
        <div class="player-item ${player.connected ? '' : 'player-disconnected'}">
          <div class="player-color" style="background: ${player.color}"></div>
          <span>${player.name}</span>
        </div>
      `)
      .join('');
  }
}
