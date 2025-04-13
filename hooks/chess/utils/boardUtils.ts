import { Chess } from 'chess.js';
import { PlayerColor } from '@/lib/types/Chess';

/**
 * Find all pieces of a specific color
 */
export const findPiecesOfColor = (chess: Chess, color: PlayerColor) => {
  const pieces: { square: string; type: "p" | "n" | "b" | "r" | "q" | "k" }[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + (8 - rank);
      const piece = chess.get(square as any);

      if (piece && piece.color === color && piece.type !== "k") {
        pieces.push({ square, type: piece.type });
      }
    }
  }

  return pieces;
};

/**
 * Find the position of a king of a specific color
 */
export const findKingPosition = (chess: Chess, color: PlayerColor) => {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + (8 - rank);
      const piece = chess.get(square as any);
      if (piece && piece.type === "k" && piece.color === color) {
        return square;
      }
    }
  }
  return null;
};

/**
 * Find all pieces attacking the king
 */
export const findCheckingPieces = (chess: Chess) => {
  const attackingSquares: string[] = [];
  const defendingColor = chess.turn();
  const attackingColor = defendingColor === "w" ? "b" : "w";
  const kingSquare = findKingPosition(chess, defendingColor);

  if (!kingSquare) return [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = String.fromCharCode(97 + file) + (8 - rank);
      const piece = chess.get(square as any);

      if (piece && piece.color === attackingColor) {
        const moves = chess.moves({
          square: square as any,
          verbose: true,
        });

        if (moves.some((move: any) => move.to === kingSquare)) {
          attackingSquares.push(square);
        }
      }
    }
  }

  return attackingSquares;
};

/**
 * Count pieces by color in a given position
 */
export const countPieces = (fen: string, color: PlayerColor) => {
  const position = fen.split(" ")[0];
  const pattern = color === "w" ? /[PNBRQK]/g : /[pnbrqk]/g;
  const matches = position.match(pattern);
  return matches ? matches.length : 0;
};

/**
 * Calculate captured pieces
 */
export const calculateCapturedPieces = (fen: string) => {
  const whitePieces = countPieces(fen, "w");
  const blackPieces = countPieces(fen, "b");

  // Initial piece count is 16 for each side
  const whiteCaptured = 16 - whitePieces;
  const blackCaptured = 16 - blackPieces;

  return { whiteCaptured, blackCaptured };
};

/**
 * Validate a FEN string
 */
export const isValidFen = (fen: string): boolean => {
  try {
    const tempChess = new Chess();
    tempChess.load(fen);

    // Check for kings - both kings must be present
    const fenParts = fen.split(" ");
    const position = fenParts[0];

    // Check that both kings exist
    if (!position.includes("K") || !position.includes("k")) {
      console.error("Invalid FEN: missing king(s)");
      return false;
    }

    return true;
  } catch (error) {
    console.error("FEN validation error:", error);
    return false;
  }
};