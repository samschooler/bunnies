import { RoomConfig, RoomData } from '@party-game/shared-types';

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map();
  private roomCodeToId: Map<string, string> = new Map();
  private config: RoomConfig;

  constructor(config?: Partial<RoomConfig>) {
    this.config = {
      maxPlayers: config?.maxPlayers ?? 16,
      roomCodeLength: config?.roomCodeLength ?? 4,
      inactiveTimeout: config?.inactiveTimeout ?? 3600000 // 1 hour
    };
  }

  createRoom(displaySocketId: string, roomCode?: string): RoomData {
    const roomId = this.generateRoomId();
    const finalRoomCode = roomCode || this.generateRoomCode();

    const room: RoomData = {
      roomId,
      roomCode: finalRoomCode,
      createdAt: Date.now(),
      displaySocketId,
      playerCount: 0
    };

    this.rooms.set(roomId, room);
    this.roomCodeToId.set(finalRoomCode, roomId);

    return room;
  }

  getRoomByCode(roomCode: string): RoomData | null {
    const roomId = this.roomCodeToId.get(roomCode.toUpperCase());
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  getRoomById(roomId: string): RoomData | null {
    return this.rooms.get(roomId) || null;
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.roomCodeToId.delete(room.roomCode);
      this.rooms.delete(roomId);
    }
  }

  incrementPlayerCount(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.playerCount++;
    }
  }

  decrementPlayerCount(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.playerCount > 0) {
      room.playerCount--;
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omit ambiguous chars
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = '';
      for (let i = 0; i < this.config.roomCodeLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.roomCodeToId.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code');
    }

    return code;
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanupInactiveRooms(): void {
    const now = Date.now();
    this.rooms.forEach((room, roomId) => {
      if (now - room.createdAt > this.config.inactiveTimeout && room.playerCount === 0) {
        this.deleteRoom(roomId);
      }
    });
  }
}
