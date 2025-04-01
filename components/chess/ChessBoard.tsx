'use client';

import { useState, useEffect } from 'react';
import { ChessboardDisplay } from './ChessboardDisplay';
import { GameInfo } from './GameInfo';
import { GameOverMessage } from './GameOverMessage';
import { useChessGame } from '@/hooks/useChessGame';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChessboardProps } from '@/lib/types/Chess';

export default function ChessBoard({
  gameId,
  userId,
  playerColor,
}: ChessboardProps) {
  const {
    game,
    gameData,
    loading,
    notification,
    moveHistory,
    lastMoveTime,
    isPlayerTurn,
    customSquareStyles,
    handleMove,
    handleSkipTurn,
    handleResign,
    whiteCapturedCount,
    blackCapturedCount,
    whiteConversionDone,
    blackConversionDone,
  } = useChessGame(gameId, userId, playerColor);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl">Loading chess board...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Could not load the game data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Determine if the game is over
  const isGameOver = gameData.status === 'completed' || gameData.status === 'draw' || gameData.status === 'resigned';

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* Game status and notifications */}
          {!isGameOver && gameData.status === 'active' && (
            <Alert 
              variant={isPlayerTurn ? "default" : "destructive"}
              className="mb-4"
            >
              <AlertDescription>
                {isPlayerTurn
                  ? '🎮 Your turn!'
                  : `⏳ Waiting for ${gameData.turn === 'w' ? 'White' : 'Black'}'s move...`}
              </AlertDescription>
            </Alert>
          )}
          
          {gameData.status === 'completed' && (
            <Alert variant="default" className="mb-4 bg-green-50 dark:bg-green-900">
              <AlertDescription>🏆 Game over - Checkmate!</AlertDescription>
            </Alert>
          )}
          
          {gameData.status === 'draw' && (
            <Alert variant="default" className="mb-4 bg-blue-50 dark:bg-blue-900">
              <AlertDescription>🤝 Game over - Draw!</AlertDescription>
            </Alert>
          )}
          
          {gameData.status === 'resigned' && (
            <Alert variant="default" className="mb-4 bg-orange-50 dark:bg-orange-900">
              <AlertDescription>🏳️ Game over - Resignation!</AlertDescription>
            </Alert>
          )}

          {notification && (
            <Alert variant="default" className="mb-4">
              <AlertDescription>{notification}</AlertDescription>
            </Alert>
          )}

          {/* Chessboard */}
          <div className="mb-4">
            <ChessboardDisplay
              game={game}
              gameId={gameId}
              playerColor={playerColor}
              onPieceDrop={isGameOver ? () => false : handleMove}
              customSquareStyles={customSquareStyles}
            />
          </div>

          {/* Game controls only for active games */}
          {!isGameOver && gameData.status === 'active' && (
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="font-medium">
                  {gameData.turn === 'w' ? 'White' : 'Black'}'s turn
                </div>
                {lastMoveTime && (
                  <div className="text-sm text-muted-foreground">
                    Last move at: {lastMoveTime}
                  </div>
                )}
              </div>

              <div className="space-x-2">
                {isPlayerTurn && (
                  <button
                    onClick={handleSkipTurn}
                    className="px-3 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-800 transition"
                  >
                    Skip Turn
                  </button>
                )}

                <button
                  onClick={handleResign}
                  className="px-3 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition"
                >
                  Resign
                </button>
              </div>
            </div>
          )}
          
          {/* Last move display for completed games */}
          {isGameOver && lastMoveTime && (
            <div className="text-sm text-muted-foreground mb-4">
              Last move was made at: {lastMoveTime}
            </div>
          )}
        </div>

        {/* Game info sidebar */}
        <GameInfo
          gameData={gameData}
          moveHistory={moveHistory}
          whiteCapturedCount={whiteCapturedCount}
          blackCapturedCount={blackCapturedCount}
          whiteConversionDone={whiteConversionDone}
          blackConversionDone={blackConversionDone}
        />
      </div>

      {/* GameOverMessage is only shown for completed games when viewed directly (not through game-client) */}
      {!window.location.pathname.includes('/games/') && game.isGameOver() && (
        <GameOverMessage 
          game={game} 
          gameEndTime={gameData.end_time || null}
        />
      )}
    </div>
  );
}