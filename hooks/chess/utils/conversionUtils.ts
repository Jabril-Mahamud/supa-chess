import { Chess } from 'chess.js';
import { ConversionData, PlayerColor } from '@/lib/types/Chess';
import { findPiecesOfColor } from './boardUtils';

/**
 * Format piece type for display
 */
export const formatPieceType = (type: string) => {
  switch (type) {
    case "p": return "Pawn";
    case "r": return "Rook";
    case "n": return "Knight";
    case "b": return "Bishop";
    case "q": return "Queen";
    case "k": return "King";
    default: return type;
  }
};

/**
 * Convert a random enemy piece (special rule)
 */
export const convertRandomEnemyPiece = (
  chess: Chess, 
  playerLosing: PlayerColor
): ConversionData | null => {
  // Determine which color's piece to convert
  const enemyColor = playerLosing === "w" ? "b" : "w";

  // Find all enemy pieces excluding the king
  const enemyPieces = findPiecesOfColor(chess, enemyColor);

  if (enemyPieces.length === 0) {
    console.log("No enemy pieces to convert");
    return null;
  }

  // Select a random enemy piece
  const randomIndex = Math.floor(Math.random() * enemyPieces.length);
  const pieceToConvert = enemyPieces[randomIndex];

  // Remove the piece from its square
  chess.remove(pieceToConvert.square as any);

  // Add the converted piece of the opposite color
  chess.put(
    {
      type: pieceToConvert.type as "p" | "n" | "b" | "r" | "q" | "k",
      color: playerLosing,
    },
    pieceToConvert.square as any
  );

  return {
    square: pieceToConvert.square,
    type: pieceToConvert.type,
    from: enemyColor as PlayerColor,
    to: playerLosing as PlayerColor,
  };
};