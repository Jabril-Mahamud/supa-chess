'use client';

// Export all components from the chess directory
export { default } from '../../components/chess/ChessBoard';
export { ChessboardDisplay } from '../../components/chess/ChessboardDisplay';
export { GameInfo } from '../../components/chess/GameInfo';
export { GameOverMessage } from '../../components/chess/GameOverMessage';

// Also export the hook
export { useChessGame } from '../../hooks/useChessGame';