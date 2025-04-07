"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Chess } from "chess.js";
import { createClient } from "@/utils/supabase/client";
import { Square, Piece } from "react-chessboard/dist/chessboard/types";
import {
  PlayerColor,
  GameData,
  ConversionData,
  ChessMoveHistory,
  ChessGameStatus,
} from "@/lib/types/Chess";

export function useChessGame(
  gameId: string,
  userId: string,
  playerColor?: "w" | "b"
) {
  const supabase = createClient();

  // Main game state
  const [gameState, setGameState] = useState<{
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
    conversionSquare: string | null; // New: track the square where conversion happened
    lastConversionMessage: string | null; // New: store the last conversion message
  }>({
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
    conversionSquare: null, // Initialize new field
    lastConversionMessage: null, // Initialize new field
  });

  // Refs for tracking sync state
  const syncState = useRef({
    currentFen: "",
    lastUpdateTime: Date.now(),
    isUpdating: false,
    pendingMoves: [] as Array<{ from: string; to: string; piece: string }>,
  });

  // Subscription refs
  const subscriptions = useRef({
    gameChannel: null as any,
    moveChannel: null as any,
    autoSyncTimer: null as any,
  });

  // Calculate if it's player's turn
  const isPlayerTurn = useMemo(() => {
    return playerColor && gameState.data?.turn === playerColor;
  }, [playerColor, gameState.data]);

  // Board square styles for highlighting
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Handle checkmate highlights
    if (gameState.checkmateHighlight) {
      try {
        const { kingSquare, attackingSquares } = JSON.parse(
          gameState.checkmateHighlight
        );

        if (kingSquare) {
          styles[kingSquare] = {
            backgroundColor: "rgba(255, 0, 0, 0.5)",
            borderRadius: "50%",
            boxShadow: "inset 0 0 8px 4px rgba(255, 0, 0, 0.6)",
          };
        }

        if (attackingSquares && attackingSquares.length > 0) {
          attackingSquares.forEach((square: string) => {
            styles[square] = {
              backgroundColor: "rgba(255, 215, 0, 0.5)",
              boxShadow: "inset 0 0 8px 4px rgba(255, 215, 0, 0.6)",
            };
          });
        }
      } catch (e) {
        console.error("Error parsing checkmate highlight data:", e);
      }
    }

    // Handle check highlights
    if (gameState.checkHighlight) {
      try {
        const { kingSquare, attackingSquares } = JSON.parse(
          gameState.checkHighlight
        );

        if (kingSquare) {
          styles[kingSquare] = {
            backgroundColor: "rgba(255, 165, 0, 0.5)", // Orange for check
            borderRadius: "50%",
            boxShadow: "inset 0 0 8px 4px rgba(255, 165, 0, 0.6)",
          };
        }

        if (attackingSquares && attackingSquares.length > 0) {
          attackingSquares.forEach((square: string) => {
            styles[square] = {
              backgroundColor: "rgba(255, 255, 0, 0.3)", // Yellow for attacking pieces
              boxShadow: "inset 0 0 6px 3px rgba(255, 255, 0, 0.4)",
            };
          });
        }
      } catch (e) {
        console.error("Error parsing check highlight data:", e);
      }
    }

    return styles;
  }, [gameState.checkmateHighlight, gameState.checkHighlight]);

  // Toggle rematch dialog
  const toggleRematchDialog = useCallback((show: boolean) => {
    setGameState((state) => ({ ...state, showRematchDialog: show }));
  }, []);

  // Validate FEN string
  const isValidFen = useCallback((fen: string): boolean => {
    try {
      const tempChess = new Chess();
      tempChess.load(fen);

      // Check for kings - both kings must be present
      const fenParts = fen.split(" ");
      const position = fenParts[0];

      // Check that both kings exist
      if (!position.includes("K") || !position.includes("k")) {
        console.error("Invalid FEN: missing king(s)");
        return false;
      }

      return true;
    } catch (error) {
      console.error("FEN validation error:", error);
      return false;
    }
  }, []);

  // Count pieces by color
  const countPieces = useCallback((fen: string, color: "w" | "b") => {
    const position = fen.split(" ")[0];
    const pattern = color === "w" ? /[PNBRQK]/g : /[pnbrqk]/g;
    const matches = position.match(pattern);
    return matches ? matches.length : 0;
  }, []);

  // Calculate captured pieces
  const calculateCapturedPieces = useCallback(
    (fen: string) => {
      const whitePieces = countPieces(fen, "w");
      const blackPieces = countPieces(fen, "b");

      // Initial piece count is 16 for each side
      const whiteCaptured = 16 - whitePieces;
      const blackCaptured = 16 - blackPieces;

      return { whiteCaptured, blackCaptured };
    },
    [countPieces]
  );

  // Find pieces of a specific color
  const findPiecesOfColor = useCallback((chess: Chess, color: "w" | "b") => {
    // Use PieceSymbol type for piece types
    const pieces: {
      square: string;
      type: "p" | "n" | "b" | "r" | "q" | "k";
    }[] = [];

    // Loop through all squares on the board
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square as any);

        // If square has a piece of the target color and it's not a king
        if (piece && piece.color === color && piece.type !== "k") {
          pieces.push({ square, type: piece.type });
        }
      }
    }

    return pieces;
  }, []);

  // Find king position
  const findKingPosition = useCallback((chess: Chess, color: "w" | "b") => {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square as any);
        if (piece && piece.type === "k" && piece.color === color) {
          return square;
        }
      }
    }
    return null;
  }, []);

  // Find checking/attacking pieces
  const findCheckingPieces = useCallback(
    (chess: Chess) => {
      const attackingSquares: string[] = [];
      const defendingColor = chess.turn();
      const attackingColor = defendingColor === "w" ? "b" : "w";
      const kingSquare = findKingPosition(chess, defendingColor);

      if (!kingSquare) return [];

      // Find all attacking pieces
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          const piece = chess.get(square as any);

          if (piece && piece.color === attackingColor) {
            // Check if this piece is attacking the king
            const moves = chess.moves({
              square: square as any,
              verbose: true,
            });

            if (moves.some((move: any) => move.to === kingSquare)) {
              attackingSquares.push(square);
            }
          }
        }
      }

      return attackingSquares;
    },
    [findKingPosition]
  );

  // Convert a random enemy piece (special rule)
  const convertRandomEnemyPiece = useCallback(
    (chess: Chess, playerLosing: "w" | "b") => {
      // Determine which color's piece to convert
      const enemyColor = playerLosing === "w" ? "b" : "w";

      // Find all enemy pieces excluding the king
      const enemyPieces = findPiecesOfColor(chess, enemyColor);

      if (enemyPieces.length === 0) {
        console.log("No enemy pieces to convert");
        return null;
      }

      // Select a random enemy piece
      const randomIndex = Math.floor(Math.random() * enemyPieces.length);
      const pieceToConvert = enemyPieces[randomIndex];

      // Remove the piece from its square
      chess.remove(pieceToConvert.square as any);

      // Add the converted piece of the opposite color
      // Cast the piece type to PieceSymbol since chess.js expects specific values
      chess.put(
        {
          type: pieceToConvert.type as "p" | "n" | "b" | "r" | "q" | "k",
          color: playerLosing,
        },
        pieceToConvert.square as any
      );

      return {
        square: pieceToConvert.square,
        type: pieceToConvert.type,
        from: enemyColor as PlayerColor,
        to: playerLosing as PlayerColor,
      };
    },
    [findPiecesOfColor]
  );

  // Format piece type for display
  const formatPieceType = useCallback((type: string) => {
    switch (type) {
      case "p":
        return "Pawn";
      case "r":
        return "Rook";
      case "n":
        return "Knight";
      case "b":
        return "Bishop";
      case "q":
        return "Queen";
      case "k":
        return "King";
      default:
        return type;
    }
  }, []);

  // Update check/checkmate highlights
  const updateCheckHighlights = useCallback(
    (chess: Chess) => {
      // Clear previous highlights
      setGameState((state) => ({
        ...state,
        checkHighlight: null,
      }));

      // If in check but not checkmate
      if (chess.isCheck() && !chess.isCheckmate()) {
        const defendingColor = chess.turn();
        const kingSquare = findKingPosition(chess, defendingColor);
        const attackingSquares = findCheckingPieces(chess);

        const highlightInfo = JSON.stringify({
          kingSquare,
          attackingSquares,
        });

        setGameState((state) => ({
          ...state,
          checkHighlight: highlightInfo,
        }));
      }
    },
    [findKingPosition, findCheckingPieces]
  );

  // Show notification
  const showNotification = useCallback((message: string, duration = 5000) => {
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
  }, []);

  // Handle rematch request
  // This is how the updated handleRematch function should look in hooks/useChessGame.tsx
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
        3000
      );
    }
  }, [gameState.data, supabase, showNotification]);

  // Fetch game state from database
  const fetchGameState = useCallback(async () => {
    // Prevent concurrent updates
    if (syncState.current.isUpdating) {
      return;
    }

    syncState.current.isUpdating = true;

    try {
      // Fetch the game data
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (error) {
        console.error("Error fetching game state:", error);
        throw error;
      }

      // Only update if the position has changed or it's been more than 5 seconds
      const shouldUpdate =
        data.current_position !== syncState.current.currentFen ||
        Date.now() - syncState.current.lastUpdateTime > 5000;

      if (shouldUpdate) {
        let validFen = data.current_position;

        // Validate FEN before using it
        if (!isValidFen(validFen)) {
          console.error("Invalid FEN received from server:", validFen);
          // Use the default starting position if invalid
          validFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        }

        syncState.current.currentFen = validFen;
        syncState.current.lastUpdateTime = Date.now();

        // Initialize the chess instance with the current position
        const chess = new Chess();

        try {
          if (
            validFen !==
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          ) {
            chess.load(validFen);
          }

          // Calculate captured pieces
          const { whiteCaptured, blackCaptured } = calculateCapturedPieces(
            chess.fen()
          );

          // Update game state
          setGameState((state) => ({
            ...state,
            chess,
            data,
            loading: false,
            whiteCapturedCount: whiteCaptured,
            blackCapturedCount: blackCaptured,
            whiteConversionDone: data.white_conversion_done || false,
            blackConversionDone: data.black_conversion_done || false,
          }));

          // Update check/checkmate highlights
          updateCheckHighlights(chess);

          // If there's a conversion message, show it
          if (data.last_conversion) {
            showNotification(data.last_conversion);
          }
        } catch (loadError) {
          console.error("Error loading FEN:", loadError);

          // Use default position if loading fails
          chess.reset();

          setGameState((state) => ({
            ...state,
            chess,
            data,
            loading: false,
          }));

          showNotification(
            "Error loading game position. Using default position."
          );
        }
      }
    } catch (error) {
      console.error("Error fetching game state:", error);

      // Set loading to false even on error
      setGameState((state) => ({
        ...state,
        loading: false,
      }));

      showNotification("Error loading game data. Please refresh the page.");
    } finally {
      syncState.current.isUpdating = false;
    }
  }, [
    gameId,
    supabase,
    isValidFen,
    calculateCapturedPieces,
    showNotification,
    updateCheckHighlights,
  ]);

  // Fetch move history
  const fetchMoveHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("moves")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching move history:", error);
        throw error;
      }

      setGameState((state) => {
        // Only update if we have new data
        if (
          data &&
          (state.moveHistory.length !== data.length || data.length === 0)
        ) {
          let lastMoveTime = state.lastMoveTime;

          // Set the last move time if there are moves
          if (data.length > 0) {
            lastMoveTime = new Date(
              data[data.length - 1].created_at
            ).toLocaleTimeString();
          }

          return {
            ...state,
            moveHistory: data,
            lastMoveTime,
          };
        }

        return state;
      });
    } catch (error) {
      console.error("Error fetching move history:", error);
    }
  }, [gameId, supabase]);

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
          const losingColor = gameInstance.turn();
          const kingSquare = findKingPosition(gameInstance, losingColor);
          const attackingSquares = findCheckingPieces(gameInstance);

          // Update checkmate highlight info
          const highlightInfo = JSON.stringify({
            kingSquare,
            attackingSquares,
            winningColor: losingColor === "w" ? "b" : "w",
          });

          // Update local state
          setGameState((state) => ({
            ...state,
            checkmateHighlight: highlightInfo,
            showRematchDialog: true,
          }));

          // Show checkmate notification
          showNotification(
            `♚ CHECKMATE! ${losingColor === "w" ? "Black" : "White"} wins the game! ♚`,
            0 // Don't auto-clear checkmate notification
          );
        } else if (gameInstance.isDraw()) {
          newStatus = "draw";
          showNotification("Game ended in a draw", 0);

          // Show rematch dialog for draw as well
          setGameState((state) => ({
            ...state,
            showRematchDialog: true,
          }));
        } else if (gameInstance.isCheck()) {
          // Update check highlight if not checkmate
          const defendingColor = gameInstance.turn();
          const kingSquare = findKingPosition(gameInstance, defendingColor);
          const attackingSquares = findCheckingPieces(gameInstance);

          const highlightInfo = JSON.stringify({
            kingSquare,
            attackingSquares,
          });

          setGameState((state) => ({
            ...state,
            checkHighlight: highlightInfo,
          }));

          // Show check notification
          showNotification(
            `${defendingColor === "w" ? "White" : "Black"} is in check!`,
            3000
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
          showNotification(conversionMessage);
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
    [
      gameId,
      userId,
      supabase,
      findKingPosition,
      findCheckingPieces,
      showNotification,
      gameState,
      playerColor,
    ]
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
        showNotification("You can only move your own pieces!", 3000);
        return false;
      }

      // Check if this move is already pending
      const isPending = syncState.current.pendingMoves.some(
        (m) => m.from === sourceSquare && m.to === targetSquare
      );

      if (isPending) {
        showNotification("Move already in progress", 1000);
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
            showNotification("That move is not allowed.", 2000);
            return false;
          }
        } catch (moveError) {
          // Chess.js threw an error for this move
          showNotification("That move is not allowed.", 2000);
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
        let conversionData: ConversionData | null = null;
        let conversionMessage: string | null = null;

        // Handle white losing 8+ pieces and conversion hasn't happened yet
        // For white conversion:
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
            conversionMessage = `Black converted a ${formatPieceType(type)} at ${square}!`

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
              showNotification("Move failed. Please try again.", 3000);

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
        showNotification("That move is not allowed right now.", 3000);
        return false;
      }
    },
    [
      playerColor,
      gameState,
      calculateCapturedPieces,
      convertRandomEnemyPiece,
      formatPieceType,
      showNotification,
      updateDatabaseAfterMove,
    ]
  );

  // Handle skipping a turn
  const handleSkipTurn = useCallback(async () => {
    if (
      !playerColor ||
      gameState.data?.turn !== playerColor ||
      gameState.data?.status !== "active"
    ) {
      showNotification("You can't skip a turn right now.", 3000);
      return;
    }

    try {
      syncState.current.isUpdating = true;

      // Create a new game instance with the current position
      const gameCopy = new Chess(gameState.chess.fen());

      // Check if the game is in a checkmate or draw state before skipping
      if (gameCopy.isCheckmate()) {
        showNotification("Cannot skip turn in checkmate position.", 3000);
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
        showNotification("Unable to skip turn: invalid game state.", 3000);
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
        showNotification("Unable to skip turn: invalid position.", 3000);
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
            3000
          );
        }

        // Check if the opponent is now in check after skipping
        const newChessCopy = new Chess(newFen);
        if (newChessCopy.isCheck()) {
          const defendingColor = newChessCopy.turn();
          const kingSquare = findKingPosition(newChessCopy, defendingColor);
          const attackingSquares = findCheckingPieces(newChessCopy);

          // Update check highlight
          const highlightInfo = JSON.stringify({
            kingSquare,
            attackingSquares,
          });

          setGameState((state) => ({
            ...state,
            checkHighlight: highlightInfo,
          }));

          // Show check notification
          showNotification(
            `${defendingColor === "w" ? "White" : "Black"} is in check!`,
            3000
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
        showNotification("Failed to skip turn. Please try again.", 3000);
      }
    } catch (error) {
      console.error("Error in skip turn:", error);
      showNotification("Error skipping turn. Please try again.", 3000);
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
    findKingPosition,
    findCheckingPieces,
    showNotification,
  ]);

  // Handle resigning
  // TypeScript-safe client-side workaround for resignation without profiles table
  // Final solution for handleResign function - this avoids the profiles table issue
  // Replace the existing handleResign function in hooks/useChessGame.tsx with this version

  const handleResign = useCallback(async () => {
    try {
      // First check if the game is already over
      if (gameState.data?.status !== "active") {
        showNotification("Game is already complete.", 3000);
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
      showNotification("You have resigned the game.", 0);

      // Try a direct game update - this may fail due to profiles table issue
      try {
        const { error: updateError } = await supabase
          .from("games")
          .update({
            status: "resigned",
            winner: winner,
            updated_at: timestamp,
            // Do not include end_time if it causes issues
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
      } catch (error: unknown) {
        console.warn("Expected error updating game:", error);
      }

      // Display a rematch dialog even if the database update failed
      toggleRematchDialog(true);
    } catch (error: unknown) {
      console.error("Error in resign handler:", error);
      showNotification(
        "Game has been resigned locally. Database update failed.",
        5000
      );
    }
  }, [
    gameId,
    userId,
    supabase,
    gameState.data,
    gameState.chess,
    showNotification,
    toggleRematchDialog,
  ]);

  // Setup realtime subscriptions and auto-sync
  useEffect(() => {
    // Initial loading of game data
    const initialLoad = async () => {
      await fetchGameState();
      await fetchMoveHistory();
    };

    initialLoad();

    // Set up realtime subscription for game updates
    const gameChannel = supabase
      .channel(`game-${gameId}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log("Game update received via realtime");

          // If we're already updating, queue the update to prevent conflicts
          if (!syncState.current.isUpdating) {
            fetchGameState();
          }
        }
      )
      .subscribe((status) => {
        console.log(`Game channel status: ${status}`);
      });

    // Set up realtime subscription for move updates
    const moveChannel = supabase
      .channel(`moves-${gameId}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moves",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("New move received via realtime");

          // Immediately fetch game state to ensure board is in sync
          fetchGameState();
          fetchMoveHistory();
        }
      )
      .subscribe();

    // Set up auto-sync timer as a backup - checks every 5 seconds
    const autoSyncTimer = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - syncState.current.lastUpdateTime;

      if (timeSinceLastUpdate > 5000 && !syncState.current.isUpdating) {
        fetchGameState();
        fetchMoveHistory();
      }
    }, 5000);

    // Store subscription references
    subscriptions.current = {
      gameChannel,
      moveChannel,
      autoSyncTimer,
    };

    // Cleanup function
    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(moveChannel);
      clearInterval(autoSyncTimer);
    };
  }, [gameId, supabase, fetchGameState, fetchMoveHistory]);

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
    conversionSquare: gameState.conversionSquare, // Add this line
    lastConversionMessage: gameState.lastConversionMessage, // Add this line
  };
}
