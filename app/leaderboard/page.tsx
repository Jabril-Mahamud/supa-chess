import { createClient } from "@/utils/supabase/server";
import LeaderboardClient from "./leaderboard-client";
import { RankInfo } from "@/lib/types/Ranks";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  
  // Get user for highlighting current user in leaderboard
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch top players by ELO rating
  const { data: topPlayers, error } = await supabase
    .from('profiles')
    .select('id, username, elo_rating, rank_tier, wins, losses, draws, games_played')
    .order('elo_rating', { ascending: false })
    .limit(100);
    
  if (error) {
    console.error("Error fetching top players:", error);
  }
  
  // Create initial rank distribution info
  const rankInfo: RankInfo[] = [
    { name: 'Bronze', count: 0, minElo: 0, maxElo: 1199 },
    { name: 'Silver', count: 0, minElo: 1200, maxElo: 1399 },
    { name: 'Gold', count: 0, minElo: 1400, maxElo: 1599 },
    { name: 'Platinum', count: 0, minElo: 1600, maxElo: 1799 },
    { name: 'Diamond', count: 0, minElo: 1800, maxElo: 1999 },
    { name: 'Master', count: 0, minElo: 2000, maxElo: 2199 },
    { name: 'Grandmaster', count: 0, minElo: 2200, maxElo: 3000 }
  ];

  // Fetch rank distribution using a modified query that works with TypeScript
  const { data: rankDistribution, error: rankError } = await (supabase
    .from('profiles')
    .select('rank_tier, count(*)')
    .gt('games_played', 0) as any)
    .groupBy('rank_tier');
  
  if (rankError) {
    console.error("Error fetching rank distribution:", rankError);
  }
  
  // Update counts from actual data
  if (rankDistribution) {
    // Type-safe iteration with explicit type annotation
    rankDistribution.forEach((rank: { rank_tier: string; count: number | string }) => {
      const foundRank = rankInfo.find(r => r.name === rank.rank_tier);
      if (foundRank) {
        foundRank.count = Number(rank.count);
      }
    });
  }
  
  // Fetch total player count
  const { count: totalPlayers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gt('games_played', 0);
  
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
        Showing top players by ELO rating. Complete at least 10 ranked games to appear on the leaderboard.
      </div>
      
      <LeaderboardClient 
        topPlayers={topPlayers || []} 
        rankInfo={rankInfo}
        totalPlayers={totalPlayers || 0}
        currentUserId={user?.id}
      />
    </div>
  );
}