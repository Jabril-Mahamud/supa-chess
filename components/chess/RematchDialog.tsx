"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const router = useRouter();
  const isWinner = winner === currentUserId;

  // Helper function to get the appropriate game status title
  const getGameTitle = () => {
    switch (gameStatus) {
      case "completed":
        return "♚ Checkmate! ♚";
      case "draw":
        return "🤝 Game Drawn!";
      case "resigned":
        return "🏳️ Game Resigned!";
      default:
        return "Game Over!";
    }
  };

  // Helper function to get the appropriate game result message
  const getGameResult = () => {
    switch (gameStatus) {
      case "completed":
        return isWinner
          ? "Congratulations, you won by checkmate!"
          : "Your opponent won by checkmate.";
      case "draw":
        return "The game ended in a draw.";
      case "resigned":
        return isWinner
          ? "Your opponent resigned the game."
          : "You resigned the game.";
      default:
        return "The game has ended.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {getGameTitle()}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            <span className="text-lg font-medium">
              {getGameResult()}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-center mb-2">What would you like to do next?</p>
        </div>

        {/* Replacing DialogFooter with a custom div for better control */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto"
          >
            Return to Dashboard
          </Button>
          
          <Button
            type="button"
            variant="default"
            onClick={onRematch}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            Play Rematch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}