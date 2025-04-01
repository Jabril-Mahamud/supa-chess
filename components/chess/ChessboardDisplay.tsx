'use client';

import React from 'react';
import { Chessboard } from 'react-chessboard';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';
import { ChessboardDisplayProps } from '@/lib//types/Chess';

export function ChessboardDisplay({
  game,
  gameId,
  playerColor,
  onPieceDrop,
  customSquareStyles = {},
}: ChessboardDisplayProps) {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-md dark:shadow-gray-800">
      <Chessboard
        id={gameId}
        position={game.fen()}
        onPieceDrop={onPieceDrop}
        boardOrientation={playerColor === 'b' ? 'black' : 'white'}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        customSquareStyles={customSquareStyles}
        areArrowsAllowed={true}
      />
    </div>
  );
}