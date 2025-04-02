"use client";

import React from "react";
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
}

export function GameOverMessage({ 
  game, 
  gameEndTime, 
  gameData, 
  currentUserId 
}: ExtendedGameOverMessageProps) {
  // Check if game is over or if it's a resignation
  if (!game.isGameOver() && (!gameData || gameData.status !== 'resigned')) return null;

  return (
    <Card className="mt-6 border-2 border-yellow-500 dark:border-yellow-600 shadow-lg animate-pulse">
      <CardHeader className="text-center">
        <CardTitle>Game Over</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {game.isCheckmate() && (
          <div>
            <p className="text-2xl font-bold mb-2">♚ CHECKMATE! ♚</p>
            <p className="text-lg">
              {game.turn() === "w" ? "Black" : "White"} wins the game!
            </p>
            {gameEndTime && (
              <p className="text-sm mt-3 text-muted-foreground">
                Game ended at: {gameEndTime}
              </p>
            )}
          </div>
        )}
        {game.isDraw() && (
          <div>
            <p className="text-xl font-bold mb-2">Draw!</p>
            <p className="text-base mb-3">The game ended in a draw.</p>
            <p className="text-sm mt-1 text-muted-foreground">
              {game.isStalemate() &&
                "Stalemate - the player to move has no legal moves and is not in check."}
              {game.isInsufficientMaterial() &&
                "Insufficient material - neither player has enough pieces to checkmate."}
              {game.isThreefoldRepetition() &&
                "Threefold repetition - the same position has occurred three times."}
              {game.isDraw() &&
                !game.isStalemate() &&
                !game.isInsufficientMaterial() &&
                !game.isThreefoldRepetition() &&
                "50-move rule - 50 moves have been made without a pawn move or capture."}
            </p>
            {gameEndTime && (
              <p className="text-sm mt-3 text-muted-foreground">
                Game ended at: {gameEndTime}
              </p>
            )}
          </div>
        )}
        {gameData && gameData.status === 'resigned' && (
          <div>
            <p className="text-xl font-bold mb-2">Resignation</p>
            <p className="text-lg">
              {currentUserId && gameData.winner === currentUserId 
                ? 'Your opponent resigned the game.' 
                : 'You resigned the game.'}
            </p>
            {gameEndTime && (
              <p className="text-sm mt-3 text-muted-foreground">
                Game ended at: {gameEndTime}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center space-x-4">
        <Button
          variant="default"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Back to Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Here you would add logic to create a rematch game
            alert("Rematch functionality would go here");
          }}
        >
          Rematch
        </Button>
      </CardFooter>
    </Card>
  );
}