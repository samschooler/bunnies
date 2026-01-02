// Socket.io Event Types

// Client -> Server Events
export interface ClientToServerEvents {
  'room:create': () => void;
  'room:join': (roomCode: string, playerName: string) => void;
  'session:validate': (sessionToken: string) => void;
  'input:update': (input: PlayerInput) => void;
  'player:disconnect': () => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  'room:created': (data: RoomCreatedData) => void;
  'room:joined': (data: PlayerJoinedData) => void;
  'room:error': (error: RoomError) => void;
  'session:validated': (data: SessionValidatedData) => void;
  'session:invalid': () => void;
  'state:delta': (delta: StateDelta) => void;
  'state:full': (state: GameState) => void;
  'player:joined': (player: PlayerData) => void;
  'player:left': (playerId: string) => void;
}

// Server -> Display Events (TV-specific)
export interface ServerToDisplayEvents extends ServerToClientEvents {
  'room:code': (roomCode: string) => void;
}

// Event Data Types
export interface RoomCreatedData {
  roomCode: string;
  roomId: string;
  serverIp?: string;
}

export interface PlayerJoinedData {
  playerId: string;
  sessionToken: string;
  playerData: PlayerData | null;
  roomCode?: string;
}

export interface SessionValidatedData {
  playerId: string;
  playerData: PlayerData;
}

export interface RoomError {
  code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'INVALID_NAME' | 'SESSION_INVALID';
  message: string;
}

export interface PlayerInput {
  timestamp: number;
  data: Record<string, any>;
}

// Re-export types from state.ts to avoid circular dependencies
import { GameState, StateDelta, PlayerData } from './state.js';
