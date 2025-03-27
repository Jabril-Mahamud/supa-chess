import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GameClient from "./game-client";
import { Game } from "../../../lib/types/Games";

// Instead of using function params, we'll use explicit function
export default async function GamePage(context: any) {
  // Extract params manually
  const params = context.params;
  const id = params?.id;

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return redirect("/sign-in");
  }
  
  // Fetch the game data
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();
    
  if (gameError || !gameData) {
    return (
      <div className="flex-1 w-full flex flex-col gap-6 p-4 md:p-8">
        <h1 className="text-2xl font-bold">Game Not Found</h1>
        <p>Sorry, the game you're looking for doesn't exist or you don't have permission to view it.</p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Cast the game data to our type
  const game = gameData as Game;

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chess Game</h1>
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
      
      <GameClient 
        gameId={id} 
        game={game} 
        userId={user.id} 
      />
    </div>
  );
}