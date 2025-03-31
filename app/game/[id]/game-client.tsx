"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import ChessBoard from "@/components/chess/ChessBoard";

// Define a proper type for the game object based on the actual database schema
export type Game = {
  id: string;
  created_at: string;
  updated_at: string;
  white_player: string | null;
  black_player: string | null;
  current_position: string;
  status: 'waiting' | 'active' | 'resigned' | 'completed';
  winner: string | null;
  turn: 'w' | 'b';
  white_conversion_done: boolean;
  black_conversion_done: boolean;
  last_conversion: string | null;
};

// Define explicit props interface for GameClient component
export interface GameClientProps {
  gameId: string;
  game: Game;
  userId: string;
}

export default function GameClient({ gameId, game: initialGame, userId }: GameClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [game, setGame] = useState<Game>(initialGame);

  useEffect(() => {
    console.log("Setting up realtime for game:", gameId);

    // Fetch fresh data immediately
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (!error && data) {
        console.log("Fresh game data:", data);
        setGame(data as Game);
      }
    };

    fetchGame();

    // Set up realtime subscription with better debugging
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log("Game update received:", payload.new);
          setGame(payload.new as Game);
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const getPlayerRole = (): "w" | "b" | undefined => {
    if (game.white_player === userId) return "w";
    if (game.black_player === userId) return "b";
    return undefined;
  };

  const handleJoinGame = async () => {
    // Determine which role the user should take
    const role = !game.white_player ? "white_player" : "black_player";

    try {
      console.log("Joining as:", role, "User ID:", userId);

      const { data, error } = await supabase
        .from("games")
        .update({
          [role]: userId,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId)
        .select();

      if (error) {
        console.error("Join error:", error);
        alert(`Failed to join: ${error.message}`);
        return;
      }

      console.log("Join success, updated game:", data);

      // Force a refresh of the game data
      router.refresh();
    } catch (error) {
      console.error("Join error:", error);
      alert("Failed to join the game");
    }
  };

  const handleResignGame = async () => {
    if (!confirm("Are you sure you want to resign?")) return;

    try {
      const { error } = await supabase
        .from("games")
        .update({
          status: "resigned",
          winner:
            game.white_player === userId
              ? game.black_player
              : game.white_player,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId);

      if (error) throw error;
    } catch (error) {
      console.error("Error resigning game:", error);
      alert("Failed to resign the game");
    }
  };

  const playerRole = getPlayerRole();
  const canJoin =
    game.status === "waiting" &&
    ((game.white_player === null && game.black_player !== userId) ||
      (game.black_player === null && game.white_player !== userId));

  return (
    <div className="space-y-6">
      <div className="bg-accent p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Game Information</h2>
        <p>Status: {game.status}</p>
        <p>Current Turn: {game.turn === 'w' ? 'White' : 'Black'}</p>
        <p>
          White Player:{" "}
          {game.white_player
            ? game.white_player === userId
              ? "You"
              : "Opponent"
            : "Waiting..."}
        </p>
        <p>
          Black Player:{" "}
          {game.black_player
            ? game.black_player === userId
              ? "You"
              : "Opponent"
            : "Waiting..."}
        </p>

        {canJoin && (
          <button
            onClick={handleJoinGame}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded font-bold"
          >
            Join as {!game.white_player ? "White" : "Black"}
          </button>
        )}

        {game.status === "active" && playerRole && (
          <button
            onClick={handleResignGame}
            className="mt-4 ml-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition"
          >
            Resign
          </button>
        )}
      </div>

      {/* Only pass the props that ChessBoard expects */}
      <ChessBoard 
        gameId={gameId} 
        userId={userId} 
        playerColor={playerRole} 
      />
    </div>
  );
}