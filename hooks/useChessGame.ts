// hooks/chess/useChessGame.ts
import { useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PlayerColor } from '@/lib/types/Chess';
import { createSquareStyles } from '../hooks/chess/utils/highlightUtils';
import { useChessState } from './useChessState';
import { useChessSync } from './useChessSync';
import { useChessActions } from './useChessActions';

export function useChessGame(
  gameId: string,
  userId: string,
  playerColor?: PlayerColor
) {
  // Set up the base state
  const stateManager = useChessState();
  const { gameState, setGameState, syncState, subscriptions } = stateManager;
  
  // Set up synchronization with the database
  useChessSync(gameId, userId, stateManager);
  
  // Set up game actions
  const { 
    handleMove, 
    handleSkipTurn, 
    handleResign, 
    handleRematch, 
    toggleRematchDialog 
  } = useChessActions(gameId, userId, playerColor, stateManager);

  // Calculate if it's player's turn
  const isPlayerTurn = useMemo(() => {
    return playerColor && gameState.data?.turn === playerColor;
  }, [playerColor, gameState.data]);

  // Board square styles for highlighting
  const customSquareStyles = useMemo(() => {
    return createSquareStyles(gameState.checkHighlight, gameState.checkmateHighlight);
  }, [gameState.checkHighlight, gameState.checkmateHighlight]);

  // Return the same API as the original hook
  return {
    game: gameState.chess,
    gameData: gameState.data,
    loading: gameState.loading,
    notification: gameState.notification,
    moveHistory: gameState.moveHistory,
    lastMoveTime: gameState.lastMoveTime,
    isPlayerTurn,
    customSquareStyles,
    handleMove,
    handleSkipTurn,
    handleResign,
    handleRematch,
    showRematchDialog: gameState.showRematchDialog,
    toggleRematchDialog,
    whiteCapturedCount: gameState.whiteCapturedCount,
    blackCapturedCount: gameState.blackCapturedCount,
    whiteConversionDone: gameState.whiteConversionDone,
    blackConversionDone: gameState.blackConversionDone,
    conversionSquare: gameState.conversionSquare,
    lastConversionMessage: gameState.lastConversionMessage,
  };
}