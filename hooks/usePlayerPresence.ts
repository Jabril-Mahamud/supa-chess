import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { PlayerPresence } from "@/lib/types/Presence";

/**
 * Hook to track and manage player presence in a game
 */
export function usePlayerPresence(gameId: string, userId: string) {
  const supabase = createClient();
  const [opponentPresence, setOpponentPresence] = useState<{
    isOnline: boolean;
    lastActive: string | null;
  }>({
    isOnline: false,
    lastActive: null,
  });
  const [rematchAvailable, setRematchAvailable] = useState<boolean>(false);

  // Update player's own presence record
  useEffect(() => {
    if (!gameId || !userId) return;

    // Create or update presence record
    const updatePresence = async () => {
      try {
        const { error } = await supabase.from("player_presence").upsert(
          {
            game_id: gameId,
            user_id: userId,
            last_active: new Date().toISOString(),
            status: "online",
          },
          {
            onConflict: "game_id,user_id",
          }
        );

        if (error) {
          console.error("Error updating presence:", error);
        }
      } catch (err) {
        console.error("Error in presence update:", err);
      }
    };

    // Initial presence update
    updatePresence();

    // Set up periodic updates (every 30 seconds)
    const presenceInterval = setInterval(updatePresence, 30000);

    // Set up a listener for browser tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up when leaving the game
    const handleBeforeUnload = () => {
      // We can't await this as the page is unloading
      supabase
        .from("player_presence")
        .update({ status: "offline", last_active: new Date().toISOString() })
        .eq("game_id", gameId)
        .eq("user_id", userId);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(presenceInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Mark as offline when component unmounts
      supabase
        .from("player_presence")
        .update({ status: "offline", last_active: new Date().toISOString() })
        .eq("game_id", gameId)
        .eq("user_id", userId);
    };
  }, [gameId, userId, supabase]);

  // Subscribe to opponent's presence changes
  useEffect(() => {
    if (!gameId || !userId) return;

    // Get the initial state of the opponent
    const fetchOpponentPresence = async () => {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("white_player, black_player")
          .eq("id", gameId)
          .single();

        if (gameError) {
          console.error("Error fetching game data:", gameError);
          return;
        }

        // Determine opponent's user ID
        const opponentId =
          gameData.white_player === userId
            ? gameData.black_player
            : gameData.white_player;

        if (!opponentId) {
          // No opponent yet, or game not fully set up
          setOpponentPresence({ isOnline: false, lastActive: null });
          setRematchAvailable(false);
          return;
        }

        // Get opponent's presence
        const { data: presenceData, error: presenceError } = await supabase
          .from("player_presence")
          .select("*")
          .eq("game_id", gameId)
          .eq("user_id", opponentId)
          .single();

        if (presenceError && presenceError.code !== "PGRST116") {
          // PGRST116 is "no rows returned" - expected if opponent hasn't connected yet
          console.error("Error fetching opponent presence:", presenceError);
          return;
        }

        if (presenceData) {
          // Check if opponent is online (active within last 2 minutes)
          const lastActiveTime = new Date(presenceData.last_active).getTime();
          const now = new Date().getTime();
          const isRecentlyActive = now - lastActiveTime < 2 * 60 * 1000; // 2 minutes

          setOpponentPresence({
            isOnline: presenceData.status === "online" && isRecentlyActive,
            lastActive: presenceData.last_active,
          });

          setRematchAvailable(
            presenceData.status === "online" && isRecentlyActive
          );
        } else {
          // No presence record yet for opponent
          setOpponentPresence({ isOnline: false, lastActive: null });
          setRematchAvailable(false);
        }
      } catch (err) {
        console.error("Error fetching opponent presence:", err);
      }
    };

    fetchOpponentPresence();

    // Subscribe to changes in the player_presence table
    const presenceChannel = supabase
      .channel(`presence-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_presence",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          // Refetch presence data when there's any change
          fetchOpponentPresence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [gameId, userId, supabase]);

  return {
    opponentPresence,
    rematchAvailable,
  };
}
