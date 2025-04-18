// components/dashboard/DashboardStats.tsx
'use client';

import { Profile } from "@/lib/types/Profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Swords, GraduationCap, Medal } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardStatsProps {
  profile: Profile;
}

export default function DashboardStats({ profile }: DashboardStatsProps) {
  // Define the stats to display
  const stats = [
    {
      label: "Games Played",
      value: profile.games_played,
      icon: <GraduationCap className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-500/10"
    },
    {
      label: "Wins",
      value: profile.wins,
      icon: <Trophy className="h-5 w-5 text-green-500" />,
      color: "bg-green-500/10"
    },
    {
      label: "Win Rate",
      value: `${profile.win_rate}%`,
      icon: <Medal className="h-5 w-5 text-amber-500" />,
      color: "bg-amber-500/10"
    },
    {
      label: "Losses",
      value: profile.losses,
      icon: <Swords className="h-5 w-5 text-red-500" />,
      color: "bg-red-500/10"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Stats</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/protected">View Full Profile</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div 
              key={stat.label}
              className={`p-3 rounded-md flex flex-col items-center justify-center ${stat.color}`}
            >
              <div className="mb-1">{stat.icon}</div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}