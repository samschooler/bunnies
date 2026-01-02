import { BaseGameDisplay } from '@party-game/game-framework/client';
import { GameState, PlayerData, URLBuilder } from '@party-game/shared-types';
import QRCode from 'qrcode';

export class MovementGameDisplay extends BaseGameDisplay {
  private game: Phaser.Game;
  private playerListElement: HTMLElement;
  private playerCountElement: HTMLElement;
  private urlBuilder: URLBuilder;
  private currentRoomCode: string | null = null;

  constructor(serverUrl: string, game: Phaser.Game, urlBuilder: URLBuilder) {
    super(serverUrl);
    this.urlBuilder = urlBuilder;
    this.game = game;
    this.playerListElement = document.getElementById('players')!;
    this.playerCountElement = document.getElementById('player-count')!;
  }

  onRoomCreated(roomCode: string): void {
    console.log('Room created:', roomCode);
    this.currentRoomCode = roomCode;
    this.displayQRCode(roomCode);
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

    // Get controller URL from URLBuilder
    const url = this.urlBuilder.getControllerUrl(roomCode);

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
