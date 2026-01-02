// Room Management Types

export interface RoomConfig {
  maxPlayers: number;
  roomCodeLength: number;
  inactiveTimeout: number; // ms
}

export interface RoomData {
  roomId: string;
  roomCode: string;
  createdAt: number;
  displaySocketId: string;
  playerCount: number;
}
