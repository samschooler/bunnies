import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInput
} from '@party-game/shared-types';

export abstract class BaseController {
  protected socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  protected sessionToken: string | null = null;
  protected playerId: string | null = null;

  constructor(serverUrl: string, roomCode: string) {
    this.socket = io(serverUrl, {
      query: { roomCode }
    });

    this.setupEventHandlers();
    this.loadSession(roomCode);
  }

  abstract onJoined(playerId: string, playerData: any): void;
  abstract onSessionRestored(playerId: string, playerData: any): void;
  abstract onError(error: string): void;

  private setupEventHandlers(): void {
    this.socket.on('room:joined', (data) => {
      this.playerId = data.playerId;
      this.sessionToken = data.sessionToken;
      this.saveSession(data.sessionToken, data.playerId);
      this.onJoined(data.playerId, data.playerData);
    });

    this.socket.on('session:validated', (data) => {
      this.playerId = data.playerId;
      this.onSessionRestored(data.playerId, data.playerData);
    });

    this.socket.on('session:invalid', () => {
      this.clearSession();
      this.onError('Session invalid. Please rejoin.');
    });

    this.socket.on('room:error', (error) => {
      this.onError(error.message);
    });
  }

  joinRoom(roomCode: string, playerName: string): void {
    this.socket.emit('room:join', roomCode, playerName);
  }

  sendInput(data: Record<string, any>): void {
    if (!this.playerId) return;

    const input: PlayerInput = {
      timestamp: Date.now(),
      data
    };

    this.socket.emit('input:update', input);
  }

  private loadSession(roomCode: string): void {
    const key = `session_${roomCode}`;
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const { sessionToken } = JSON.parse(stored);
        this.sessionToken = sessionToken;
        this.socket.emit('session:validate', sessionToken);
      } catch (e) {
        this.clearSession();
      }
    }
  }

  private saveSession(sessionToken: string, playerId: string): void {
    const roomCode = this.socket.io.opts.query?.roomCode as string;
    const key = `session_${roomCode}`;
    localStorage.setItem(key, JSON.stringify({ sessionToken, playerId }));
  }

  private clearSession(): void {
    const roomCode = this.socket.io.opts.query?.roomCode as string;
    const key = `session_${roomCode}`;
    localStorage.removeItem(key);
    this.sessionToken = null;
    this.playerId = null;
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}
