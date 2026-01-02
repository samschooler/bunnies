// Base State Types

export interface GameState {
  players: Record<string, PlayerData>;
  gameData: Record<string, any>;
  timestamp: number;
}

export interface StateDelta {
  players?: Partial<Record<string, Partial<PlayerData>>>;
  gameData?: Partial<Record<string, any>>;
  timestamp: number;
}

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  joinedAt: number;
  customData?: Record<string, any>;
}
