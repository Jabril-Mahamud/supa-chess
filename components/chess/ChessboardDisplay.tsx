'use client';

import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';
import { ChessboardDisplayProps } from '@/lib/types/Chess';

export function ChessboardDisplay({
  game,
  gameId,
  playerColor,
  onPieceDrop,
  customSquareStyles = {},
}: ChessboardDisplayProps) {
  const [moveSquares, setMoveSquares] = useState<Record<string, React.CSSProperties>>({});
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  
  // Function to handle piece click and show valid moves
  const onPieceClick = (piece: Piece, square: Square) => {
    // If we click on the already selected piece, deselect it
    if (square === selectedPiece) {
      setSelectedPiece(null);
      setMoveSquares({});
      return;
    }
    
    // Only show valid moves for the current player's pieces
    const pieceColor = piece.charAt(0) as 'w' | 'b';
    if (playerColor && pieceColor !== playerColor) {
      // If we click on an opponent's piece when another piece is selected, try to capture it
      if (selectedPiece && moveSquares[square as string]) {
        const pieceObj = game.get(selectedPiece as any);
        if (pieceObj) {
          const pieceString = `${pieceObj.color}${pieceObj.type.toUpperCase()}`;
          onPieceDrop(selectedPiece as Square, square, pieceString as Piece);
          setSelectedPiece(null);
          setMoveSquares({});
        }
      }
      return;
    }
    
    // Store the selected piece
    setSelectedPiece(square as string);
    
    // Get all possible moves for the clicked piece
    const moves = game.moves({ 
      square: square as string, 
      verbose: true 
    });

    // Create style objects for each valid destination square
    const newMoveSquares: Record<string, React.CSSProperties> = {};
    
    // Highlight the selected piece
    newMoveSquares[square as string] = {
      backgroundColor: 'rgba(255, 255, 0, 0.4)'
    };
    
    moves.forEach((move: any) => {
      // For empty square moves
      if (!game.get(move.to as any)) {
        newMoveSquares[move.to] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
          borderRadius: '50%'
        };
      }
      // For capture moves
      else {
        newMoveSquares[move.to] = {
          background: 'radial-gradient(transparent 0%, transparent 79%, rgba(220,0,0,.3) 80%)',
          borderRadius: '50%'
        };
      }
    });
    
    setMoveSquares(newMoveSquares);
  };
  
  // Handle square click
  const onSquareClick = (square: Square) => {
    // If we have a selected piece and this is a valid move square
    if (selectedPiece && moveSquares[square as string] && selectedPiece !== square) {
      const pieceObj = game.get(selectedPiece as any);
      if (pieceObj) {
        // Convert to the format expected by react-chessboard
        const pieceString = `${pieceObj.color}${pieceObj.type.toUpperCase()}`;
        onPieceDrop(selectedPiece as Square, square, pieceString as Piece);
      }
      // Clear selection
      setSelectedPiece(null);
      setMoveSquares({});
    } 
    // If we click on an empty or invalid square, clear the selection
    else if (square !== selectedPiece) {
      setSelectedPiece(null);
      setMoveSquares({});
    }
  };
  
  // When a piece is dropped, clear the move indicators
  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, piece: Piece) => {
    const result = onPieceDrop(sourceSquare, targetSquare, piece);
    setSelectedPiece(null);
    setMoveSquares({});
    return result;
  };
  
  // Merge the custom square styles with our move indicators
  const mergedStyles = { ...customSquareStyles };
  
  // Apply move squares on top of custom styles
  Object.entries(moveSquares).forEach(([square, style]) => {
    mergedStyles[square] = {
      ...mergedStyles[square],
      ...style
    };
  });

  return (
    <div className="relative rounded-lg overflow-hidden shadow-md dark:shadow-gray-800">
      <Chessboard
        id={gameId}
        position={game.fen()}
        onPieceDrop={handlePieceDrop}
        onPieceClick={onPieceClick}
        onSquareClick={onSquareClick}
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