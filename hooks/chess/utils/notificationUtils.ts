import { Dispatch, SetStateAction } from 'react';
import { GameStateType } from '../useChessState';

/**
 * Show a notification in the game
 */
export const showNotification = (
  message: string, 
  duration: number = 5000,
  setGameState: Dispatch<SetStateAction<GameStateType>>
) => {
  setGameState((state) => ({ ...state, notification: message }));

  if (duration > 0) {
    setTimeout(() => {
      setGameState((state) => {
        // Only clear this specific notification if it hasn't been replaced
        if (state.notification === message) {
          return { ...state, notification: null };
        }
        return state;
      });
    }, duration);
  }
};