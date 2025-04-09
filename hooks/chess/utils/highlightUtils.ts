import { Chess } from 'chess.js';
import { findKingPosition, findCheckingPieces } from './boardUtils';

/**
 * Generate highlight info for check
 */
export const generateCheckHighlight = (chess: Chess) => {
  if (chess.isCheck() && !chess.isCheckmate()) {
    const defendingColor = chess.turn();
    const kingSquare = findKingPosition(chess, defendingColor);
    const attackingSquares = findCheckingPieces(chess);

    return JSON.stringify({
      kingSquare,
      attackingSquares,
    });
  }
  
  return null;
};

/**
 * Generate highlight info for checkmate
 */
export const generateCheckmateHighlight = (chess: Chess) => {
  if (chess.isCheckmate()) {
    const losingColor = chess.turn();
    const kingSquare = findKingPosition(chess, losingColor);
    const attackingSquares = findCheckingPieces(chess);
    
    return JSON.stringify({
      kingSquare,
      attackingSquares,
      winningColor: losingColor === "w" ? "b" : "w",
    });
  }
  
  return null;
};

/**
 * Create square styles for highlighting
 */
export const createSquareStyles = (checkHighlight: string | null, checkmateHighlight: string | null) => {
  const styles: Record<string, React.CSSProperties> = {};

  // Handle checkmate highlights
  if (checkmateHighlight) {
    try {
      const { kingSquare, attackingSquares } = JSON.parse(
        checkmateHighlight
      );

      if (kingSquare) {
        styles[kingSquare] = {
          backgroundColor: "rgba(255, 0, 0, 0.5)",
          borderRadius: "50%",
          boxShadow: "inset 0 0 8px 4px rgba(255, 0, 0, 0.6)",
        };
      }

      if (attackingSquares && attackingSquares.length > 0) {
        attackingSquares.forEach((square: string) => {
          styles[square] = {
            backgroundColor: "rgba(255, 215, 0, 0.5)",
            boxShadow: "inset 0 0 8px 4px rgba(255, 215, 0, 0.6)",
            borderRadius: "4px"
          };
        });
      }
    } catch (e) {
      console.error("Error parsing checkmate highlight data:", e);
    }
  }

  // Handle check highlights
  if (checkHighlight) {
    try {
      const { kingSquare, attackingSquares } = JSON.parse(
        checkHighlight
      );

      if (kingSquare) {
        styles[kingSquare] = {
          backgroundColor: "rgba(255, 165, 0, 0.5)", // Orange for check
          borderRadius: "50%",
          boxShadow: "inset 0 0 8px 4px rgba(255, 165, 0, 0.6)",
        };
      }

      if (attackingSquares && attackingSquares.length > 0) {
        attackingSquares.forEach((square: string) => {
          styles[square] = {
            backgroundColor: "rgba(255, 255, 0, 0.3)", // Yellow for attacking pieces
            boxShadow: "inset 0 0 6px 3px rgba(255, 255, 0, 0.4)",
          };
        });
      }
    } catch (e) {
      console.error("Error parsing check highlight data:", e);
    }
  }

  return styles;
};