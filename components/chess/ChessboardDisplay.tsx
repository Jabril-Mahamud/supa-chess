'use client';

import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';
import { ChessboardDisplayProps } from '@/lib/types/Chess';

export function ChessboardDisplay({
  game,
  gameId,
  playerColor,
  onPieceDrop,
  customSquareStyles = {},
  conversionSquare = null, // New prop to highlight converted pieces
}: ChessboardDisplayProps) {
  const [moveSquares, setMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [flashingSquare, setFlashingSquare] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Handle flashing animation for conversions
  useEffect(() => {
    if (conversionSquare) {
      setFlashingSquare(conversionSquare);
      setIsFlashing(true);
      
      // Set up flashing effect with alternating colors
      const flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 400); // Toggle every 400ms
      
      // Clean up after 2.4 seconds (6 flashes)
      const cleanupTimer = setTimeout(() => {
        clearInterval(flashInterval);
        setFlashingSquare(null);
        setIsFlashing(false);
      }, 2400);
      
      return () => {
        clearInterval(flashInterval);
        clearTimeout(cleanupTimer);
      };
    }
  }, [conversionSquare]);
  
  // Function to handle when the user starts dragging a piece
  const onDragStart = (piece: Piece, square: Square) => {
    // Only allow the current player's pieces to be dragged
    const pieceColor = piece.charAt(0) as 'w' | 'b';
    if (playerColor && pieceColor !== playerColor) {
      return false;
    }
    
    // Get all possible moves for the dragged piece
    const moves = game.moves({ 
      square: square as string, 
      verbose: true 
    });

    // Create style objects for each valid destination square
    const newMoveSquares: Record<string, React.CSSProperties> = {};
    
    // Add styles for valid moves
    moves.forEach((move: any) => {
      // For empty square moves
      if (!game.get(move.to as any)) {
        newMoveSquares[move.to] = {
          background: 'radial-gradient(circle, rgba(0,255,0,.3) 25%, transparent 25%)',
          borderRadius: '50%'
        };
      }
      // For capture moves - using red to indicate capture
      else {
        newMoveSquares[move.to] = {
          background: 'rgba(255,0,0,0.2)',
          boxShadow: 'inset 0 0 8px 4px rgba(255,0,0,0.3)',
          borderRadius: '4px'
        };
      }
    });
    
    setMoveSquares(newMoveSquares);
    return true;
  };
  
  // When a piece is dropped, clear the move indicators
  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, piece: Piece) => {
    const result = onPieceDrop(sourceSquare, targetSquare, piece);
    // Clear the move indicators regardless of whether the move was valid
    setMoveSquares({});
    return result;
  };
  
  // When drag is canceled (piece dropped back or outside board), clear indicators
  const onDragEnd = () => {
    setMoveSquares({});
  };
  
  // Merge all the styles: custom styles, move indicators, and conversion flashing
  const mergedStyles = { ...customSquareStyles, ...moveSquares };
  
  // Add flashing effect for converted pieces
  if (flashingSquare) {
    mergedStyles[flashingSquare] = {
      ...mergedStyles[flashingSquare],
      backgroundColor: isFlashing ? 'rgba(255, 50, 50, 0.7)' : 'rgba(255, 255, 50, 0.7)',
      boxShadow: isFlashing 
        ? 'inset 0 0 15px 5px rgba(255, 0, 0, 0.8)' 
        : 'inset 0 0 15px 5px rgba(255, 255, 0, 0.8)',
      transition: 'all 0.2s ease-in-out'
    };
  }

  return (
    <div className="relative rounded-lg overflow-hidden shadow-md dark:shadow-gray-800">
      <Chessboard
        id={gameId}
        position={game.fen()}
        onPieceDrop={handlePieceDrop}
        onPieceDragBegin={onDragStart}
        onPieceDragEnd={onDragEnd}
        boardOrientation={playerColor === 'b' ? 'black' : 'white'}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        customSquareStyles={mergedStyles}
        areArrowsAllowed={true}
      />
    </div>
  );
}