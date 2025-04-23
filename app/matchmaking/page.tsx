// app/matchmaking/page.tsx (updated)
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MatchmakingClient from "./matchmaking-client";

export default async function MatchmakingPage() {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return redirect('/sign-in');
  }
  
  // Fetch profile data to get ELO rating
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }

  const isNewPlayer = profile?.is_placement ?? true;
  const placementGamesPlayed = profile?.placement_games_played ?? 0;
  const eloRating = profile?.elo_rating ?? 1200;
  const highestElo = profile?.highest_elo ?? 1200;
  const rankTier = profile?.rank_tier ?? 'Bronze';
  const gamesPlayed = profile?.games_played ?? 0;
  const rankedGamesPlayed = profile?.ranked_games_played ?? 0;

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">Game Hub</h1>
      
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
        Find matches and manage your existing games all in one place.
      </div>
      
      <MatchmakingClient 
        user={user} 
        profile={profile}
        isNewPlayer={isNewPlayer}
        placementGamesPlayed={placementGamesPlayed}
        eloRating={eloRating}
        highestElo={highestElo}
        rankTier={rankTier}
        gamesPlayed={gamesPlayed}
        rankedGamesPlayed={rankedGamesPlayed}
      />
    </div>
  );
}