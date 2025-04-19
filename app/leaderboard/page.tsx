import { createClient } from "@/utils/supabase/server";
import LeaderboardClient from "./leaderboard-client";
import { RankInfo } from "@/lib/types/Ranks";

// Define the type for rank distribution data
type RankDistributionData = {
  rank_tier: string;
  count: number | string;
};

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
    { name: 'Bronze', count: 0, minElo: 0, maxElo: 1199, percentage: 0 },
    { name: 'Silver', count: 0, minElo: 1200, maxElo: 1399, percentage: 0 },
    { name: 'Gold', count: 0, minElo: 1400, maxElo: 1599, percentage: 0 },
    { name: 'Platinum', count: 0, minElo: 1600, maxElo: 1799, percentage: 0 },
    { name: 'Diamond', count: 0, minElo: 1800, maxElo: 1999, percentage: 0 },
    { name: 'Master', count: 0, minElo: 2000, maxElo: 2199, percentage: 0 },
    { name: 'Grandmaster', count: 0, minElo: 2200, maxElo: 3000, percentage: 0 }
  ];

  try {
    // Use the stored procedure for rank distribution
    const { data: rankDistribution, error: rankError } = await supabase
      .rpc('get_rank_distribution');
    
    if (rankError) throw rankError;
      
    // Process data from the RPC
    rankDistribution.forEach((rank: RankDistributionData) => {
      const foundRank = rankInfo.find(r => r.name === rank.rank_tier);
      if (foundRank) {
        foundRank.count = Number(rank.count);
      } else if (rank.rank_tier) {
        // Handle any new ranks that might be added in the future
        const defaultEloRange = { minElo: 0, maxElo: 0 };
        rankInfo.push({
          name: rank.rank_tier,
          count: Number(rank.count),
          minElo: defaultEloRange.minElo,
          maxElo: defaultEloRange.maxElo,
          percentage: 0
        });
      }
    });
  } catch (error) {
    // Only log the error, no console message about fallback
    console.error("Error with rank distribution RPC:", error);
    
    // Fetch all profiles with games played for counting
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('rank_tier')
      .gt('games_played', 0);
      
    if (!profilesError && allProfiles) {
      // Count manually
      allProfiles.forEach(profile => {
        const rankTier = profile.rank_tier || 'Bronze';
        const foundRank = rankInfo.find(r => r.name === rankTier);
        if (foundRank) {
          foundRank.count++;
        }
      });
    } else {
      console.error("Error fetching profiles for rank distribution:", profilesError);
    }
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