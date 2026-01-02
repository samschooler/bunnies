import { SessionData, SessionValidationResult } from '@party-game/shared-types';
import crypto from 'crypto';

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private playerIdToSession: Map<string, string> = new Map();
  private sessionTimeout: number = 86400000; // 24 hours

  createSession(playerId: string, roomCode: string): SessionData {
    const sessionToken = this.generateSessionToken();
    const session: SessionData = {
      sessionToken,
      playerId,
      roomCode,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    };

    this.sessions.set(sessionToken, session);
    this.playerIdToSession.set(playerId, sessionToken);

    return session;
  }

  validateSession(sessionToken: string, roomCode: string): SessionValidationResult {
    const session = this.sessions.get(sessionToken);

    if (!session) {
      return { valid: false };
    }

    if (session.roomCode !== roomCode) {
      return { valid: false };
    }

    const now = Date.now();
    if (now - session.lastActiveAt > this.sessionTimeout) {
      this.deleteSession(sessionToken);
      return { valid: false };
    }

    session.lastActiveAt = now;
    return { valid: true, session };
  }

  deleteSession(sessionToken: string): void {
    const session = this.sessions.get(sessionToken);
    if (session) {
      this.playerIdToSession.delete(session.playerId);
      this.sessions.delete(sessionToken);
    }
  }

  deleteSessionByPlayerId(playerId: string): void {
    const sessionToken = this.playerIdToSession.get(playerId);
    if (sessionToken) {
      this.deleteSession(sessionToken);
    }
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    this.sessions.forEach((session, token) => {
      if (now - session.lastActiveAt > this.sessionTimeout) {
        this.deleteSession(token);
      }
    });
  }
}
