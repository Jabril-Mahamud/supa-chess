// components/profile/ProfileStats.tsx
'use client';

import { Profile } from "@/lib/types/Profile";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Award, 
  Swords, 
  Flame, 
  GraduationCap, // Using GraduationCap instead of ChessKnight
  Minus, 
  PieChart 
} from 'lucide-react';

interface ProfileStatsProps {
  profile: Profile;
}

export default function ProfileStats({ profile }: ProfileStatsProps) {
  const stats = [
    {
      label: "Games Played",
      value: profile.games_played,
      icon: <GraduationCap className="h-5 w-5 text-primary" />, // Fixed icon
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

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Player Statistics</h3>
      
      {/* Win rate progress bar - Fixed by removing indicatorClassName */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Win Rate</span>
          <span className="text-sm font-medium">{profile.win_rate}%</span>
        </div>
        <Progress 
          value={profile.win_rate} 
          className={`h-2 ${
            profile.win_rate > 60 
              ? "bg-green-500" 
              : profile.win_rate > 40 
                ? "bg-yellow-500" 
                : "bg-red-500"
          }`}
        />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(stat => (
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