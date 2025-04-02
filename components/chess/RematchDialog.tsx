"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RematchDialogProps {
  open: boolean;
  onClose: () => void;
  onRematch: () => void;
  gameStatus: "completed" | "draw" | "resigned" | string;
  winner?: string | null;
  currentUserId: string;
}

export function RematchDialog({
  open,
  onClose,
  onRematch,
  gameStatus,
  winner,
  currentUserId,
}: RematchDialogProps) {
  const isWinner = winner === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {gameStatus === "completed"
              ? "♚ Checkmate! ♚"
              : gameStatus === "draw"
                ? "🤝 Game Drawn!"
                : "🏳️ Game Resigned!"}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {gameStatus === "completed" && (
              <span className="text-lg">
                {isWinner
                  ? "Congratulations, you won by checkmate!"
                  : "Your opponent won by checkmate."}
              </span>
            )}
            {gameStatus === "draw" && (
              <span className="text-lg">The game ended in a draw.</span>
            )}
            {gameStatus === "resigned" && (
              <span className="text-lg">
                {isWinner
                  ? "Your opponent resigned the game."
                  : "You resigned the game."}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center mb-2">Would you like to play again?</p>
          <p className="text-sm text-muted-foreground text-center">
            A new game will be created with switched colors.
          </p>
        </div>

        <DialogFooter className="flex justify-between gap-4 sm:justify-center">
          <Button type="button" variant="secondary" onClick={onClose}>
            Return to Game
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onRematch}
            className="bg-green-600 hover:bg-green-700"
          >
            Start Rematch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
