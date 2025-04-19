// Update file: components/chess/GameOverMessage.tsx

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GameOverMessageProps, GameData } from "@/lib/types/Chess";
import { formatEloChange } from "@/lib/utils";
import { usePlayerPresence } from "@/hooks/usePlayerPresence";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Clock, AlertTriangle } from "lucide-react";

interface ExtendedGameOverMessageProps extends GameOverMessageProps {
  gameData?: GameData;
  currentUserId?: string;
  onRematch?: () => void;
  useDialog?: boolean; // New prop to determine whether to use dialog or card
}

export function GameOverMessage({ 
  game, 
  gameEndTime, 
  gameData, 
  currentUserId,
  onRematch,
  useDialog = false // Default to card view if not specified
}: ExtendedGameOverMessageProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  
  // Use the player presence hook to check if opponent is online
  const { opponentPresence, rematchAvailable } = 
    gameData && currentUserId 
      ? usePlayerPresence(gameData.id, currentUserId)
      : { opponentPresence: { isOnline: false, lastActive: null }, rematchAvailable: false };

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

  // Helper function to get the appropriate game result message
  const getGameResult = () => {
    if (isCheckmate) {
      return isWinner 
        ? "Congratulations, you won by checkmate!" 
        : "Your opponent won by checkmate.";
    }
    if (isDraw) {
      let drawReason = "";
      if (game.isStalemate()) drawReason = "Stalemate - the player to move has no legal moves.";
      else if (game.isInsufficientMaterial()) drawReason = "Insufficient material to checkmate.";
      else if (game.isThreefoldRepetition()) drawReason = "Threefold repetition.";
      else drawReason = "50-move rule - 50 moves have been made without a pawn move or capture.";
      
      return `The game ended in a draw. ${drawReason}`;
    }
    if (isResigned) {
      return isWinner 
        ? "Your opponent resigned the game." 
        : "You resigned the game.";
    }
    return "The game has ended.";
  };

  // Check if this was a ranked game with ELO changes
  const isRankedGame = gameData.mode === 'ranked';
  
  // Determine if the current user is white or black
  const isWhite = currentUserId === gameData.white_player;
  const isBlack = currentUserId === gameData.black_player;
  
  // Get ELO change for current user
  const userEloChange = isWhite ? gameData.white_elo_change : isBlack ? gameData.black_elo_change : null;
  const formattedEloChange = formatEloChange(userEloChange);
  
  // Format the opponent's last active time
  const formatLastActive = () => {
    if (!opponentPresence.lastActive) return "Unknown";
    
    const lastActive = new Date(opponentPresence.lastActive);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return lastActive.toLocaleDateString();
  };
  
  // Open dialog when game ends if using dialog mode
  React.useEffect(() => {
    if (useDialog && (isCheckmate || isDraw || isResigned)) {
      setDialogOpen(true);
    }
  }, [useDialog, isCheckmate, isDraw, isResigned]);

  // Render dialog version if useDialog is true
  if (useDialog) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
          {gameEndTime && (
            <div className="text-sm text-center text-muted-foreground">
              Game ended at: {new Date(gameEndTime).toLocaleString()}
            </div>
          )}
          
          {/* ELO change for ranked games */}
          {isRankedGame && userEloChange !== null && (
            <div className="text-center py-3">
              <p className="text-sm font-medium">ELO Change</p>
              <p className={`text-xl font-bold ${formattedEloChange.colorClass}`}>
                {formattedEloChange.text}
              </p>
            </div>
          )}
          
          {/* Opponent presence indicator */}
          <div className="text-center py-1 flex justify-center items-center gap-2">
            <Badge variant={opponentPresence.isOnline ? "default" : "outline"}>
              Opponent is {opponentPresence.isOnline ? "Online" : "Offline"}
            </Badge>
            {!opponentPresence.isOnline && opponentPresence.lastActive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Last seen: {formatLastActive()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your opponent must be online to request a rematch</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="py-2">
            <p className="text-center mb-2">What would you like to do next?</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full sm:w-auto"
            >
              Return to Dashboard
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="default"
                      onClick={onRematch}
                      disabled={!rematchAvailable}
                      className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50"
                    >
                      {!rematchAvailable && <AlertTriangle className="h-4 w-4 mr-1" />}
                      Play Rematch
                    </Button>
                  </span>
                </TooltipTrigger>
                {!rematchAvailable && (
                  <TooltipContent>
                    <p>Your opponent must be online to request a rematch</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render the original card version
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
        
        {/* ELO change for ranked games */}
        {isRankedGame && userEloChange !== null && (
          <div className="my-4 p-3 px-5 bg-accent/20 rounded-lg inline-block">
            <p className="text-sm font-medium">ELO Change</p>
            <p className={`text-2xl font-bold ${formattedEloChange.colorClass}`}>
              {formattedEloChange.text}
            </p>
          </div>
        )}
        
        {gameEndTime && (
          <p className="text-sm mt-3 text-muted-foreground">
            Game ended at: {new Date(gameEndTime).toLocaleString()}
          </p>
        )}

        {/* Opponent presence indicator */}
        <div className="flex justify-center items-center gap-2 mt-4 mb-2">
          <Badge variant={opponentPresence.isOnline ? "default" : "outline"}>
            Opponent is {opponentPresence.isOnline ? "Online" : "Offline"}
          </Badge>
          {!opponentPresence.isOnline && opponentPresence.lastActive && (
            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Last seen: {formatLastActive()}
            </span>
          )}
        </div>
        
        <p className="text-muted-foreground mt-2">
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full sm:w-auto">
                <Button
                  onClick={onRematch}
                  variant="default"
                  disabled={!rematchAvailable}
                  className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50"
                >
                  {!rematchAvailable && <AlertTriangle className="h-4 w-4 mr-1" />}
                  Play Rematch
                </Button>
              </span>
            </TooltipTrigger>
            {!rematchAvailable && (
              <TooltipContent>
                <p>Your opponent must be online to request a rematch</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}