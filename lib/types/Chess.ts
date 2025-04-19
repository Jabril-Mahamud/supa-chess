// Enhanced chess game types

export type ChessGameStatus = 'waiting' | 'active' | 'completed' | 'draw' | 'resigned';

export type PlayerColor = 'w' | 'b';

export interface GameData {
  id: string;
  created_at: string;
  updated_at: string;
  white_player: string | null;
  black_player: string | null;
  current_position: string;
  status: ChessGameStatus;
  winner: string | null;
  turn: PlayerColor;
  white_conversion_done: boolean;
  black_conversion_done: boolean;
  last_conversion: string | null;
  end_time?: string | null;
  
  // Added missing properties
  mode?: 'casual' | 'ranked';  // Game mode (casual or ranked)
  white_elo_change?: number | null;  // ELO change for white player
  black_elo_change?: number | null;  // ELO change for black player
  matchmaking_id?: string;  // Reference to matchmaking entry
  initial_white_elo?: number;  // Initial ELO for white player
  initial_black_elo?: number;  // Initial ELO for black player
}

// For compatibility with existing code that uses 'Game' type
export type Game = GameData;

export interface ChessMoveHistory {
  id: string;
  game_id: string;
  user_id: string;
  move_notation: string;
  position_after: string;
  created_at: string;
}

export interface ConversionData {
  square: string;
  type: string;
  from: PlayerColor;
  to: PlayerColor;
}

export interface CheckmateHighlight {
  kingSquare: string;
  attackingSquares: string[];
  winningColor: PlayerColor;
}

// Component props types
export interface ChessboardProps {
  gameId: string;
  userId: string;
  playerColor?: PlayerColor;
}

export interface ChessboardDisplayProps {
  game: any; // Chess.js instance
  gameId: string;
  playerColor?: PlayerColor;
  onPieceDrop: (sourceSquare: any, targetSquare: any, piece: any) => boolean;
  customSquareStyles?: Record<string, React.CSSProperties>;
  conversionSquare?: string | null;
}

export interface GameInfoProps {
  gameData: GameData;
  moveHistory: ChessMoveHistory[];
  whiteCapturedCount: number;
  blackCapturedCount: number;
  whiteConversionDone: boolean;
  blackConversionDone: boolean;
  lastConversionMessage?: string | null;
}

export interface GameOverMessageProps {
  game: any; // Chess.js instance
  gameEndTime: string | null;
}

export interface GameClientProps {
  gameId: string;
  game: Game;
  userId: string;
}