// hooks/chess/useChessState.ts
import { useState, useRef } from 'react';
import { Chess } from 'chess.js';
import { GameData, ChessMoveHistory } from '@/lib/types/Chess';

export type SyncStateRef = {
  currentFen: string;
  lastUpdateTime: number;
  isUpdating: boolean;
  pendingMoves: Array<{ from: string; to: string; piece: string }>;
};

export type SubscriptionsRef = {
  gameChannel: any;
  moveChannel: any;
  autoSyncTimer: any;
};

export type GameStateType = {
  chess: Chess;
  data: GameData | null;
  moveHistory: ChessMoveHistory[];
  loading: boolean;
  notification: string | null;
  lastMoveTime: string | null;
  whiteCapturedCount: number;
  blackCapturedCount: number;
  whiteConversionDone: boolean;
  blackConversionDone: boolean;
  checkmateHighlight: string | null;
  checkHighlight: string | null;
  showRematchDialog: boolean;
  conversionSquare: string | null;
  lastConversionMessage: string | null;
};

export function useChessState() {
  // Main game state
  const [gameState, setGameState] = useState<GameStateType>({
    chess: new Chess(),
    data: null,
    moveHistory: [],
    loading: true,
    notification: null,
    lastMoveTime: null,
    whiteCapturedCount: 0,
    blackCapturedCount: 0,
    whiteConversionDone: false,
    blackConversionDone: false,
    checkmateHighlight: null,
    checkHighlight: null,
    showRematchDialog: false,
    conversionSquare: null,
    lastConversionMessage: null,
  });

  // Refs for tracking sync state
  const syncState = useRef<SyncStateRef>({
    currentFen: "",
    lastUpdateTime: Date.now(),
    isUpdating: false,
    pendingMoves: [],
  });

  // Subscription refs
  const subscriptions = useRef<SubscriptionsRef>({
    gameChannel: null,
    moveChannel: null,
    autoSyncTimer: null,
  });

  return {
    gameState,
    setGameState,
    syncState,
    subscriptions,
  };
}