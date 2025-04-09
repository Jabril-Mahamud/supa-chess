// hooks/chess/useChessSync.ts
import { useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Chess } from 'chess.js';
import { calculateCapturedPieces, isValidFen } from './chess/utils/boardUtils';
import { generateCheckHighlight } from './chess/utils/highlightUtils';
import { showNotification } from './chess/utils/notificationUtils';
import { useChessState } from './useChessState';

export function useChessSync(
  gameId: string,
  userId: string,
  { gameState, setGameState, syncState, subscriptions }: ReturnType<typeof useChessState>
) {
  const supabase = createClient();

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
        .from('games')
        .select('*')
        .eq('id', gameId)
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

          // Update check highlight if in check
          const checkHighlight = generateCheckHighlight(chess);
          if (checkHighlight) {
            setGameState((state) => ({
              ...state,
              checkHighlight,
            }));
          }

          // If there's a conversion message, show it
          if (data.last_conversion) {
            showNotification(data.last_conversion, 5000, setGameState);
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

          showNotification("Error loading game position. Using default position.", 5000, setGameState);
        }
      }
    } catch (error) {
      console.error("Error fetching game state:", error);

      // Set loading to false even on error
      setGameState((state) => ({
        ...state,
        loading: false,
      }));

      showNotification("Error loading game data. Please refresh the page.", 0, setGameState);
    } finally {
      syncState.current.isUpdating = false;
    }
  }, [gameId, supabase, setGameState, syncState]);

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
  }, [gameId, supabase, setGameState]);

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
        () => {
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
        () => {
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
  }, [gameId, supabase, fetchGameState, fetchMoveHistory, syncState, subscriptions]);

  return {
    fetchGameState,
    fetchMoveHistory,
  };
}