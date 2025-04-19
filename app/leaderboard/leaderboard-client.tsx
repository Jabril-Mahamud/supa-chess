'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody,
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { getRankColor } from '@/lib/utils';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { RankInfo } from "@/lib/types/Ranks";

interface Player {
  id: string;
  username: string;
  elo_rating: number;
  rank_tier: string;
  wins: number;
  losses: number;
  draws: number;
  games_played: number;
}

interface LeaderboardClientProps {
  topPlayers: Player[];
  rankInfo: RankInfo[];
  totalPlayers: number;
  currentUserId?: string;
}

export default function LeaderboardClient({ 
  topPlayers, 
  rankInfo,
  totalPlayers,
  currentUserId 
}: LeaderboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPlayers = searchQuery 
    ? topPlayers.filter(player => 
        player.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : topPlayers;
    
  // Set rank colors for chart
  const RANK_COLORS = {
    'Bronze': '#CD7F32',
    'Silver': '#A7A7AD',
    'Gold': '#FFD700',
    'Platinum': '#00BFFF',
    'Diamond': '#1E90FF',
    'Master': '#9370DB',
    'Grandmaster': '#FF4500'
  };
  
  // Prepare data for rank distribution chart
  const rankDistData = rankInfo
    .filter(rank => rank.count > 0)
    .map(rank => ({
      name: rank.name,
      value: rank.count,
      color: RANK_COLORS[rank.name as keyof typeof RANK_COLORS]
    }));
    
  // Calculate percentages for each rank
  rankInfo.forEach(rank => {
    rank.percentage = totalPlayers > 0 ? (rank.count / totalPlayers) * 100 : 0;
  });

  return (
    <Tabs defaultValue="leaderboard">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="leaderboard">Player Rankings</TabsTrigger>
        <TabsTrigger value="distribution">Rank Distribution</TabsTrigger>
      </TabsList>
      
      <TabsContent value="leaderboard" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <CardTitle>Top Players</CardTitle>
                <CardDescription>Ranked by ELO rating</CardDescription>
              </div>
              <div className="relative mt-4 md:mt-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  className="pl-8 w-full md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>ELO</TableHead>
                  <TableHead className="hidden md:table-cell">Tier</TableHead>
                  <TableHead className="text-right hidden md:table-cell">W/L/D</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player, index) => {
                  const isCurrentUser = player.id === currentUserId;
                  const rankColorClass = getRankColor(player.rank_tier).split(' ')[0]; // Just get bg color
                  
                  return (
                    <TableRow 
                      key={player.id}
                      className={isCurrentUser ? 'bg-accent/30' : undefined}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Link 
                          href={`/profile/${player.id}`} 
                          className="hover:underline font-medium flex items-center gap-2"
                        >
                          {player.username}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {player.elo_rating}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={`${rankColorClass} text-white`}>
                          {player.rank_tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <span className="text-green-600 dark:text-green-500">{player.wins}</span>
                        /
                        <span className="text-red-600 dark:text-red-500">{player.losses}</span>
                        /
                        <span className="text-yellow-600 dark:text-yellow-500">{player.draws}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {player.games_played > 0 
                          ? `${Math.round((player.wins / player.games_played) * 100)}%` 
                          : '0%'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No players found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="distribution" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rank Distribution</CardTitle>
              <CardDescription>
                Distribution of players across rank tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-4">
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rankDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {rankDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} Players`, 'Count']}
                      labelFormatter={(name) => `${name}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Rank Requirements</CardTitle>
              <CardDescription>
                ELO rating requirements for each rank tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>ELO Range</TableHead>
                    <TableHead className="text-right">Players</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankInfo.map((rank) => {
                    const rankColorClass = getRankColor(rank.name).split(' ')[0]; // Just get bg color
                    
                    return (
                      <TableRow key={rank.name}>
                        <TableCell>
                          <Badge className={`${rankColorClass} text-white`}>
                            {rank.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rank.minElo} - {rank.maxElo}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {rank.count}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {rank.percentage ? rank.percentage.toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}