// components/profile/ProfileStats.tsx
'use client';

import { Profile } from "@/lib/types/Profile";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/chess/RankBadge";
import { 
  Trophy, 
  Award, 
  Swords, 
  Flame, 
  GraduationCap,
  Minus, 
  PieChart,
  TrendingUp,
  BarChart,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileStatsProps {
  profile: Profile;
}

export default function ProfileStats({ profile }: ProfileStatsProps) {
  const stats = [
    {
      label: "Games Played",
      value: profile.games_played,
      icon: <GraduationCap className="h-5 w-5 text-primary" />, 
      color: "bg-primary/10"
    },
    {
      label: "Wins",
      value: profile.wins,
      icon: <Trophy className="h-5 w-5 text-green-500" />,
      color: "bg-green-500/10"
    },
    {
      label: "Losses",
      value: profile.losses,
      icon: <Swords className="h-5 w-5 text-red-500" />,
      color: "bg-red-500/10"
    },
    {
      label: "Draws",
      value: profile.draws,
      icon: <Minus className="h-5 w-5 text-yellow-500" />,
      color: "bg-yellow-500/10"
    },
    {
      label: "Win Rate",
      value: `${profile.win_rate}%`,
      icon: <PieChart className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-500/10"
    },
    {
      label: "Current Streak",
      value: profile.current_streak,
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      color: "bg-orange-500/10"
    },
    {
      label: "Best Streak",
      value: profile.best_streak,
      icon: <Award className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-500/10"
    }
  ];

  // Check if player has ranked games
  const hasRankedGames = (profile.ranked_games_played || 0) > 0;

  // New ELO-specific stats to add
  const eloStats = [
    {
      label: "ELO Rating",
      value: profile.elo_rating || 1200,
      icon: <BarChart className="h-5 w-5 text-indigo-500" />,
      color: "bg-indigo-500/10"
    },
    {
      label: "Highest ELO",
      value: profile.highest_elo || 1200,
      icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
      color: "bg-emerald-500/10"
    }
  ];

  // Combine all stats
  const allStats = [...stats];
  
  // Only add ELO stats if player has played ranked games
  if (hasRankedGames) {
    allStats.push(...eloStats);
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Player Statistics</h3>
      
      {/* Rank and ELO section */}
      <div className="mb-6 p-6 rounded-lg bg-accent/20 border border-accent">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-lg font-semibold">Rank</h4>
            <RankBadge
              rankTier={profile.rank_tier}
              eloRating={profile.elo_rating}
              gamesPlayed={profile.games_played}
              rankedGamesPlayed={profile.ranked_games_played}
              showElo={true}
              isPlacement={profile.is_placement}
              placementGamesPlayed={profile.placement_games_played}
              size="lg"
            />
          </div>
          {hasRankedGames && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current ELO</div>
              <div className="text-3xl font-bold">{profile.elo_rating || 1200}</div>
            </div>
          )}
        </div>
        
        {/* Placement matches indicator */}
        {profile.is_placement && (profile.placement_games_played || 0) < 10 && 
          (profile.ranked_games_played || 0) > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Placement Matches</span>
              <span className="text-xs">{profile.placement_games_played || 0}/10</span>
            </div>
            <Progress value={(profile.placement_games_played || 0) * 10} className="h-2" />
          </div>
        )}
        
        {/* Message for players who haven't played ranked games */}
        {!hasRankedGames && (
          <Alert className="mt-3 border-dashed border-muted-foreground/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Play ranked games to earn an ELO rating and rank tier.
              Complete 10 placement matches to establish your initial ranking.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Progress to next rank - only show if ranked games played */}
        {hasRankedGames && profile.rank_tier && profile.rank_tier !== "Grandmaster" && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Progress to next rank</span>
              {profile.elo_rating && (
                <span className="text-xs font-mono">{getProgressToNextRank(profile.rank_tier, profile.elo_rating)}</span>
              )}
            </div>
            <Progress 
              value={calculateProgressPercentage(profile.rank_tier, profile.elo_rating || 1200)} 
              className="h-2" 
            />
          </div>
        )}
      </div>
      
      {/* Win rate progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Win Rate</span>
          <span className="text-sm font-medium">{profile.win_rate}%</span>
        </div>
        <Progress 
          value={profile.win_rate} 
          className="h-2"
        />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allStats.map(stat => (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className={`p-4 flex items-center gap-4 ${stat.color}`}>
              <div className="p-2 rounded-md bg-background/80">
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance breakdown */}
      {profile.games_played > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-medium mb-4">Performance Breakdown</h4>
          <div className="h-6 w-full flex rounded-md overflow-hidden">
            {/* Win segment */}
            <div 
              className="bg-green-500 h-full transition-all duration-500"
              style={{ 
                width: `${(profile.wins / profile.games_played) * 100}%`,
              }}
            />
            {/* Draw segment */}
            <div 
              className="bg-yellow-500 h-full transition-all duration-500"
              style={{ 
                width: `${(profile.draws / profile.games_played) * 100}%`,
              }}
            />
            {/* Loss segment */}
            <div 
              className="bg-red-500 h-full transition-all duration-500"
              style={{ 
                width: `${(profile.losses / profile.games_played) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
              <span>Wins ({profile.wins})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
              <span>Draws ({profile.draws})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-sm" />
              <span>Losses ({profile.losses})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate progress to next rank
function getProgressToNextRank(rankTier: string, elo: number): string {
  switch (rankTier) {
    case 'Bronze':
      return `${elo}/1200 to Silver`;
    case 'Silver':
      return `${elo - 1200}/200 to Gold`;
    case 'Gold':
      return `${elo - 1400}/200 to Platinum`;
    case 'Platinum':
      return `${elo - 1600}/200 to Diamond`;
    case 'Diamond':
      return `${elo - 1800}/200 to Master`;
    case 'Master':
      return `${elo - 2000}/200 to Grandmaster`;
    case 'Grandmaster':
      return `${elo} (Max Rank)`;
    default:
      return `${elo}/1200 to Silver`;
  }
}

// Helper function to calculate percentage progress to next rank
function calculateProgressPercentage(rankTier: string, elo: number): number {
  switch (rankTier) {
    case 'Bronze':
      return (elo / 1200) * 100;
    case 'Silver':
      return ((elo - 1200) / 200) * 100;
    case 'Gold':
      return ((elo - 1400) / 200) * 100;
    case 'Platinum':
      return ((elo - 1600) / 200) * 100;
    case 'Diamond':
      return ((elo - 1800) / 200) * 100;
    case 'Master':
      return ((elo - 2000) / 200) * 100;
    case 'Grandmaster':
      return 100;
    default:
      return 0;
  }
}