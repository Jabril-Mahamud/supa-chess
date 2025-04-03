"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameOverMessageProps, GameData } from "@/lib/types/Chess";

interface ExtendedGameOverMessageProps extends GameOverMessageProps {
  gameData?: GameData;
  currentUserId?: string;
  onRematch?: () => void;
}

export function GameOverMessage({ 
  game, 
  gameEndTime, 
  gameData, 
  currentUserId,
  onRematch
}: ExtendedGameOverMessageProps) {
  const router = useRouter();
  
  // If no game data is provided, or the game isn't over and not resigned, don't show anything
  if (!gameData || (gameData.status !== 'completed' && gameData.status !== 'draw' && gameData.status !== 'resigned')) {
    return null;
  }

  // Determine the game over status
  const isResigned = gameData.status === 'resigned';
  const isCheckmate = gameData.status === 'completed';
  const isDraw = gameData.status === 'draw';
  
  // Determine if the current user is the winner
  const isWinner = currentUserId && gameData.winner === currentUserId;

  // Helper function to get appropriate title based on game outcome
  const getGameTitle = () => {
    if (isCheckmate) return '♚ Game Over - Checkmate! ♚';
    if (isDraw) return '🤝 Game Over - Draw!';
    if (isResigned) return '🏳️ Game Over - Resignation!';
    return 'Game Over';
  };

  return (
    <Card className="mt-6 border-2 border-yellow-500 dark:border-yellow-600 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle>{getGameTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {isCheckmate && (
          <div>
            <p className="text-xl font-bold mb-2">Checkmate!</p>
            <p className="text-lg mb-3">
              {isWinner ? (
                <span className="text-green-600 dark:text-green-500">You won!</span>
              ) : (
                <span>Your opponent won.</span>
              )}
            </p>
          </div>
        )}
        
        {isDraw && (
          <div>
            <p className="text-xl font-bold mb-2">The game ended in a draw.</p>
            <p className="text-base mb-3">
              {game.isStalemate() && "Stalemate - the player to move has no legal moves."}
              {game.isInsufficientMaterial() && "Insufficient material to checkmate."}
              {game.isThreefoldRepetition() && "Threefold repetition."}
              {!game.isStalemate() && !game.isInsufficientMaterial() && !game.isThreefoldRepetition() && 
                "50-move rule - 50 moves have been made without a pawn move or capture."}
            </p>
          </div>
        )}
        
        {isResigned && (
          <div>
            <p className="text-xl font-bold mb-2">Resignation</p>
            <p className="text-lg mb-3">
              {isWinner ? (
                <span className="text-green-600 dark:text-green-500">Your opponent resigned the game.</span>
              ) : (
                <span>You resigned the game.</span>
              )}
            </p>
          </div>
        )}
        
        {gameEndTime && (
          <p className="text-sm mt-3 text-muted-foreground">
            Game ended at: {new Date(gameEndTime).toLocaleString()}
          </p>
        )}
        
        <p className="text-muted-foreground mt-4">
          What would you like to do next?
        </p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
        <Button
          onClick={() => router.push('/dashboard')}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Return to Dashboard
        </Button>
        <Button
          onClick={onRematch}
          variant="default"
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        >
          Play Rematch
        </Button>
      </CardFooter>
    </Card>
  );
}