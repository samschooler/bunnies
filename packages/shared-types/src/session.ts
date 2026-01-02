// Session Management Types

import { PlayerData } from './state.js';

export interface SessionData {
  sessionToken: string;
  playerId: string;
  roomCode: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionData;
  player?: PlayerData;
}
