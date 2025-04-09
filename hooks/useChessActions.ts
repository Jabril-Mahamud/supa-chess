// hooks/chess/useChessActions.ts
import { useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Chess } from "chess.js";
import { PlayerColor, ChessGameStatus } from "@/lib/types/Chess";
import { Square, Piece } from "react-chessboard/dist/chessboard/types";
import { useChessState } from "./useChessState";
import {
  calculateCapturedPieces,
  isValidFen,
  findKingPosition,
  findCheckingPieces,
} from "../hooks/chess/utils/boardUtils";
import {
  generateCheckHighlight,
  generateCheckmateHighlight,
} from "../hooks/chess/utils/highlightUtils";
import {
  convertRandomEnemyPiece,
  formatPieceType,
} from "../hooks/chess/utils/conversionUtils";
import { showNotification } from "../hooks/chess/utils/notificationUtils";

export function useChessActions(
  gameId: string,
  userId: string,
  playerColor: PlayerColor | undefined,
  { gameState, setGameState, syncState }: ReturnType<typeof useChessState>
) {
  const supabase = createClient();

  // Toggle rematch dialog
  const toggleRematchDialog = useCallback(
    (show: boolean) => {
      setGameState((state) => ({ ...state, showRematchDialog: show }));
    },
    [setGameState]
  );

  // Handle database updates after a move
  const updateDatabaseAfterMove = useCallback(
    async (
      gameInstance: Chess,
      move: any,
      conversionMessage: string | null
    ) => {
      try {
        syncState.current.isUpdating = true;

        const currentData = gameState.data;
        if (!currentData) {
          throw new Error("No game data available");
        }

        // Determine if the game is over
        let newStatus: ChessGameStatus = "active";
        let winner = null;

        if (gameInstance.isCheckmate()) {
          newStatus = "completed";
          winner =
            playerColor === "w"
              ? currentData.white_player
              : currentData.black_player;

          // Get checkmate information for visualization
          const checkmateHighlight = generateCheckmateHighlight(gameInstance);

          // Update local state
          setGameState((state) => ({
            ...state,
            checkmateHighlight,
            showRematchDialog: true,
          }));

          // Show checkmate notification
          const losingColor = gameInstance.turn();
          showNotification(
            `♚ CHECKMATE! ${losingColor === "w" ? "Black" : "White"} wins the game! ♚`,
            0,
            setGameState
          );
        } else if (gameInstance.isDraw()) {
          newStatus = "draw";
          showNotification("Game ended in a draw", 0, setGameState);

          // Show rematch dialog for draw as well
          setGameState((state) => ({
            ...state,
            showRematchDialog: true,
          }));
        } else if (gameInstance.isCheck()) {
          // Update check highlight if not checkmate
          const checkHighlight = generateCheckHighlight(gameInstance);

          setGameState((state) => ({
            ...state,
            checkHighlight,
          }));

          // Show check notification
          const defendingColor = gameInstance.turn();
          showNotification(
            `${defendingColor === "w" ? "White" : "Black"} is in check!`,
            3000,
            setGameState
          );
        } else {
          // Clear check highlights if no longer in check
          setGameState((state) => ({
            ...state,
            checkHighlight: null,
          }));
        }

        // First, save the move to database
        const { data: moveData, error: moveError } = await supabase
          .from("moves")
          .insert({
            game_id: gameId,
            user_id: userId,
            move_notation: move.san,
            position_after: gameInstance.fen(),
          })
          .select();

        if (moveError) {
          console.error("Error saving move:", moveError);
          throw moveError;
        }

        // Now update the game in database
        const updatePayload: {
          current_position: string;
          turn: "w" | "b";
          status: ChessGameStatus;
          updated_at: string;
          winner?: string | null;
          end_time?: string;
          white_conversion_done?: boolean;
          black_conversion_done?: boolean;
          last_conversion?: string | null;
        } = {
          current_position: gameInstance.fen(),
          turn: gameInstance.turn(),
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        // Only add fields that need updating
        if (newStatus !== "active") {
          updatePayload.winner = winner;
          updatePayload.end_time = new Date().toISOString();
        }

        // Add conversion data if needed
        const { whiteCapturedCount, blackCapturedCount } = gameState;

        if (whiteCapturedCount >= 8 || gameState.whiteConversionDone) {
          updatePayload.white_conversion_done = true;
        }

        if (blackCapturedCount >= 8 || gameState.blackConversionDone) {
          updatePayload.black_conversion_done = true;
        }

        if (conversionMessage) {
          updatePayload.last_conversion = conversionMessage;
        }

        // Execute the update
        const { data: gameUpdateData, error: gameError } = await supabase
          .from("games")
          .update(updatePayload)
          .eq("id", gameId)
          .select();

        if (gameError) {
          console.error("Error updating game:", gameError);
          throw gameError;
        }

        syncState.current.lastUpdateTime = Date.now();

        // Update move history optimistically
        const newMove = {
          id: moveData?.[0]?.id || Date.now().toString(),
          game_id: gameId,
          user_id: userId,
          move_notation: move.san,
          position_after: gameInstance.fen(),
          created_at: new Date().toISOString(),
        };

        setGameState((state) => ({
          ...state,
          moveHistory: [...state.moveHistory, newMove],
          lastMoveTime: new Date().toLocaleTimeString(),
        }));

        // Show conversion notification if needed
        if (conversionMessage && newStatus === "active") {
          showNotification(conversionMessage, 5000, setGameState);
        }

        // Remove from pending moves
        syncState.current.pendingMoves = syncState.current.pendingMoves.filter(
          (m) => m.from !== move.from || m.to !== move.to
        );

        return true;
      } catch (error) {
        console.error("Error updating database:", error);
        return false;
      } finally {
        syncState.current.isUpdating = false;
      }
    },
    [gameId, userId, supabase, gameState, playerColor, setGameState, syncState]
  );

  // Handle piece move
  const handleMove = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece: Piece) => {
      console.log(
        `Attempting move from ${sourceSquare} to ${targetSquare}, piece: ${piece}`
      );

      // Don't allow moves if not the player's turn or if spectating
      if (!playerColor || gameState.data?.turn !== playerColor) {
        console.log("Not your turn or you're spectating");
        return false;
      }

      // Don't allow moves if the game is not active
      if (gameState.data?.status !== "active") {
        console.log("Game is not active");
        return false;
      }

      // Check if player is moving their own piece
      const pieceColor = piece.charAt(0) as "w" | "b";
      if (pieceColor !== playerColor) {
        showNotification(
          "You can only move your own pieces!",
          3000,
          setGameState
        );
        return false;
      }

      // Check if this move is already pending
      const isPending = syncState.current.pendingMoves.some(
        (m) => m.from === sourceSquare && m.to === targetSquare
      );

      if (isPending) {
        showNotification("Move already in progress", 1000, setGameState);
        return false;
      }

      try {
        // Make a copy of the game to try the move
        const gameCopy = new Chess(gameState.chess.fen());

        // Check if there was a piece on the target square (capture)
        const targetPiece = gameCopy.get(targetSquare as any);
        const isCapture = targetPiece !== null;

        // Try to make the move
        let move;
        try {
          move = gameCopy.move({
            from: sourceSquare as string,
            to: targetSquare as string,
            promotion: "q", // Always promote to queen for simplicity
          });

          // Invalid move (move returned null)
          if (move === null) {
            showNotification("That move is not allowed.", 2000, setGameState);
            return false;
          }
        } catch (moveError) {
          // Chess.js threw an error for this move
          showNotification("That move is not allowed.", 2000, setGameState);
          return false;
        }

        // Add to pending moves
        syncState.current.pendingMoves.push({
          from: sourceSquare as string,
          to: targetSquare as string,
          piece,
        });

        // Calculate captured pieces after the move
        const { whiteCaptured, blackCaptured } = calculateCapturedPieces(
          gameCopy.fen()
        );

        // Check if we need to convert a piece

        let conversionData = null;
        let conversionMessage: string | null = null;

        // Handle white losing 8+ pieces and conversion hasn't happened yet
        if (whiteCaptured >= 8 && !gameState.whiteConversionDone) {
          conversionData = convertRandomEnemyPiece(gameCopy, "w");

          if (conversionData !== null) {
            // Destructure to avoid null checks in template
            const { type, square } = conversionData;
            conversionMessage = `White converted a ${formatPieceType(type)} at ${square}!`;

            setGameState((state) => ({
              ...state,
              whiteConversionDone: true,
              conversionSquare: square,
              lastConversionMessage: conversionMessage,
            }));
          }
        }

        // Handle black losing 8+ pieces and conversion hasn't happened yet
        if (blackCaptured >= 8 && !gameState.blackConversionDone) {
          conversionData = convertRandomEnemyPiece(gameCopy, "b");

          if (conversionData !== null) {
            // Add explicit null check
            const { type, square } = conversionData;
            conversionMessage = `Black converted a ${formatPieceType(type)} at ${square}!`;

            setGameState((state) => ({
              ...state,
              blackConversionDone: true,
              conversionSquare: square,
              lastConversionMessage: conversionMessage,
            }));
          }
        }

        // Update the local game state optimistically
        setGameState((state) => ({
          ...state,
          chess: gameCopy,
          whiteCapturedCount: whiteCaptured,
          blackCapturedCount: blackCaptured,
        }));

        syncState.current.currentFen = gameCopy.fen();

        // Save the current state in case we need to revert
        const previousChess = gameState.chess;
        const previousData = { ...gameState.data };

        // Handle database updates separately
        updateDatabaseAfterMove(gameCopy, move, conversionMessage).then(
          (success) => {
            if (!success) {
              // If there's an error, revert to previous state
              console.error("Move failed, reverting to previous state");

              setGameState((state) => ({
                ...state,
                chess: previousChess,
                data: previousData,
              }));

              syncState.current.currentFen = previousChess.fen();
              showNotification(
                "Move failed. Please try again.",
                3000,
                setGameState
              );

              // Remove from pending moves
              syncState.current.pendingMoves =
                syncState.current.pendingMoves.filter(
                  (m) => m.from !== sourceSquare || m.to !== targetSquare
                );
            }
          }
        );

        return true;
      } catch (error) {
        console.error("Error processing move:", error);
        showNotification(
          "That move is not allowed right now.",
          3000,
          setGameState
        );
        return false;
      }
    },
    [playerColor, gameState, updateDatabaseAfterMove, setGameState, syncState]
  );

  // Handle skipping a turn
  const handleSkipTurn = useCallback(async () => {
    if (
      !playerColor ||
      gameState.data?.turn !== playerColor ||
      gameState.data?.status !== "active"
    ) {
      showNotification("You can't skip a turn right now.", 3000, setGameState);
      return;
    }

    try {
      syncState.current.isUpdating = true;

      // Create a new game instance with the current position
      const gameCopy = new Chess(gameState.chess.fen());

      // Check if the game is in a checkmate or draw state before skipping
      if (gameCopy.isCheckmate()) {
        showNotification(
          "Cannot skip turn in checkmate position.",
          3000,
          setGameState
        );
        syncState.current.isUpdating = false;
        return;
      }

      // Check for draw
      let newStatus = "active";
      let winner = null;

      if (gameCopy.isDraw()) {
        newStatus = "draw";
      }

      // Toggle the turn without making a move
      const newTurn = playerColor === "w" ? "b" : "w";

      // Generate a FEN with the turn toggled
      const fenParts = gameCopy.fen().split(" ");
      fenParts[1] = newTurn;
      const newFen = fenParts.join(" ");

      // Validate the new FEN to ensure it's legitimate
      if (!isValidFen(newFen)) {
        showNotification(
          "Unable to skip turn: invalid game state.",
          3000,
          setGameState
        );
        syncState.current.isUpdating = false;
        return;
      }

      // Save previous state for potential rollback
      const previousChess = gameState.chess;
      const previousData = { ...gameState.data };

      // Update local state optimistically
      try {
        const newGameCopy = new Chess(newFen);

        setGameState((state) => ({
          ...state,
          chess: newGameCopy,
          checkHighlight: null, // Clear any check highlights when skipping turn
        }));

        syncState.current.currentFen = newFen;
      } catch (fenError) {
        showNotification(
          "Unable to skip turn: invalid position.",
          3000,
          setGameState
        );
        syncState.current.isUpdating = false;
        return;
      }

      try {
        // First, update the game state in the database
        const updateData = {
          current_position: newFen,
          turn: newTurn,
          updated_at: new Date().toISOString(),
        } as any;

        // Add status and winner if game ended
        if (newStatus !== "active") {
          updateData.status = newStatus;
          updateData.winner = winner;
          updateData.end_time = new Date().toISOString();

          // Show rematch dialog for draw
          if (newStatus === "draw") {
            setGameState((state) => ({
              ...state,
              showRematchDialog: true,
            }));
          }
        }

        const { error: gameError } = await supabase
          .from("games")
          .update(updateData)
          .eq("id", gameId);

        if (gameError) {
          throw gameError;
        }

        // Then, add a "skipped turn" entry to moves
        const { error: moveError } = await supabase.from("moves").insert({
          game_id: gameId,
          user_id: userId,
          move_notation: "Skipped turn",
          position_after: newFen,
        });

        if (moveError) {
          console.warn("Error recording skip turn move:", moveError);
          // Continue execution even if move recording fails
        }

        // Update move history optimistically
        const newMove = {
          id: Date.now().toString(),
          game_id: gameId,
          user_id: userId,
          move_notation: "Skipped turn",
          position_after: newFen,
          created_at: new Date().toISOString(),
        };

        setGameState((state) => {
          // Create a properly typed updated data object
          const updatedData = state.data
            ? {
                ...state.data,
                turn: newTurn as "w" | "b",
                current_position: newFen,
                status: newStatus as ChessGameStatus,
                winner: winner,
              }
            : null;

          return {
            ...state,
            moveHistory: [...state.moveHistory, newMove],
            lastMoveTime: new Date().toLocaleTimeString(),
            data: updatedData,
          };
        });

        syncState.current.lastUpdateTime = Date.now();

        // Set notification if one hasn't been set for game end
        if (newStatus === "active") {
          showNotification(
            `${playerColor === "w" ? "White" : "Black"} skipped their turn`,
            3000,
            setGameState
          );
        }

        // Check if the opponent is now in check after skipping
        const newChessCopy = new Chess(newFen);
        if (newChessCopy.isCheck()) {
          const checkHighlight = generateCheckHighlight(newChessCopy);

          setGameState((state) => ({
            ...state,
            checkHighlight,
          }));

          // Show check notification
          const defendingColor = newChessCopy.turn();
          showNotification(
            `${defendingColor === "w" ? "White" : "Black"} is in check!`,
            3000,
            setGameState
          );
        }
      } catch (error) {
        // Revert to previous state if error
        console.error("Error skipping turn:", error);

        setGameState((state) => ({
          ...state,
          chess: previousChess,
          data: previousData,
        }));

        syncState.current.currentFen = previousChess.fen();
        showNotification(
          "Failed to skip turn. Please try again.",
          3000,
          setGameState
        );
      }
    } catch (error) {
      console.error("Error in skip turn:", error);
      showNotification(
        "Error skipping turn. Please try again.",
        3000,
        setGameState
      );
    } finally {
      syncState.current.isUpdating = false;
    }
  }, [
    playerColor,
    gameState,
    gameId,
    userId,
    supabase,
    isValidFen,
    setGameState,
    syncState,
  ]);

  // Handle resigning
  const handleResign = useCallback(async () => {
    try {
      // First check if the game is already over
      if (gameState.data?.status !== "active") {
        showNotification("Game is already complete.", 3000, setGameState);
        return;
      }

      // Determine the winner (opponent of the resigning player)
      const winner =
        gameState.data?.white_player === userId
          ? gameState.data?.black_player
          : gameState.data?.white_player;

      console.log("Implementing client-side resignation");

      // Current timestamp to use consistently
      const timestamp = new Date().toISOString();

      // Update local state immediately for better user experience
      setGameState((state) => ({
        ...state,
        data: state.data
          ? {
              ...state.data,
              status: "resigned",
              winner: winner,
              updated_at: timestamp,
              end_time: timestamp,
            }
          : null,
        showRematchDialog: true,
      }));

      // Try to record the move in the moves table first - this works reliably
      try {
        await supabase.from("moves").insert({
          game_id: gameId,
          user_id: userId,
          move_notation: "Resigned",
          position_after: gameState.chess.fen(),
          created_at: timestamp,
        });
        console.log("Successfully recorded resignation move");
      } catch (moveError) {
        console.warn("Couldn't record resignation move:", moveError);
      }

      // Show notification about the resignation
      showNotification("You have resigned the game.", 0, setGameState);

      // Try a direct game update - this may fail due to profiles table issue
      try {
        const { error: updateError } = await supabase
          .from("games")
          .update({
            status: "resigned",
            winner: winner,
            updated_at: timestamp,
            end_time: timestamp,
          })
          .eq("id", gameId);

        if (!updateError) {
          console.log("Game update succeeded!");
        } else {
          console.warn("Error updating game:", updateError);

          // If there's an error due to profiles table, try a minimal update
          // This might work if the RLS policy only triggers on certain fields
          try {
            const { error: minimalError } = await supabase
              .from("games")
              .update({
                status: "resigned",
              })
              .eq("id", gameId);

            if (!minimalError) {
              console.log("Minimal game update succeeded!");

              // If that worked, try updating the winner separately
              const { error: winnerError } = await supabase
                .from("games")
                .update({ winner: winner })
                .eq("id", gameId);

              if (!winnerError) {
                console.log("Winner update succeeded!");
              }
            }
          } catch (minimalError) {
            console.warn("Even minimal update failed:", minimalError);
          }
        }
      } catch (error) {
        console.warn("Expected error updating game:", error);
      }

      // Display a rematch dialog even if the database update failed
      toggleRematchDialog(true);
    } catch (error) {
      console.error("Error in resign handler:", error);
      showNotification(
        "Game has been resigned locally. Database update failed.",
        5000,
        setGameState
      );
    }
  }, [
    gameId,
    userId,
    supabase,
    gameState.data,
    gameState.chess,
    setGameState,
    toggleRematchDialog,
  ]);

  // Handle rematch request
  const handleRematch = useCallback(async () => {
    if (!gameState.data) return;

    try {
      // Create a new game with the same players but reversed colors
      const { data, error } = await supabase
        .from("games")
        .insert({
          white_player: gameState.data.black_player, // Switch colors
          black_player: gameState.data.white_player, // Switch colors
          current_position:
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          status: "active",
          turn: "w",
          white_conversion_done: false,
          black_conversion_done: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        throw error;
      }

      // Redirect to the new game using the correct URL structure
      if (data && data[0] && data[0].id) {
        // Use the correct path - /game/[id] (singular) instead of /games/[id]
        window.location.href = `/game/${data[0].id}`;
      } else {
        throw new Error("No game ID returned from creation");
      }
    } catch (error) {
      console.error("Error creating rematch:", error);
      showNotification(
        "Failed to create rematch game. Please try again.",
        3000,
        setGameState
      );
    }
  }, [gameState.data, supabase, setGameState]);

  return {
    handleMove,
    handleSkipTurn,
    handleResign,
    handleRematch,
    toggleRematchDialog,
  };
}
