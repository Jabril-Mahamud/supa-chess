// Add this to a new file named game-types.ts in the game/[id] folder

// Define a proper type for the game object based on the actual database schema
export type Game = {
  id: string;
  created_at: string;
  updated_at: string;
  white_player: string | null;
  black_player: string | null;
  current_position: string;
  status: "waiting" | "active" | "resigned" | "completed";
  winner: string | null;
  turn: "w" | "b";
  white_conversion_done: boolean;
  black_conversion_done: boolean;
  last_conversion: string | null;
};

// Define explicit props interface for GameClient component
export interface GameClientProps {
  gameId: string;
  game: Game;
  userId: string;
}
