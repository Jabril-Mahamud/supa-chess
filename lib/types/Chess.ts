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
}

export interface GameInfoProps {
  gameData: GameData;
  moveHistory: ChessMoveHistory[];
  whiteCapturedCount: number;
  blackCapturedCount: number;
  whiteConversionDone: boolean;
  blackConversionDone: boolean;
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