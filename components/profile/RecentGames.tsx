// components/profile/RecentGames.tsx
'use client';

import { RecentGame } from "@/lib/types/Profile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEloChange } from "@/lib/utils";

interface RecentGamesProps {
  games: RecentGame[];
  userId: string;
}

export default function RecentGames({ games, userId }: RecentGamesProps) {
  if (games.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No games played yet.</p>
      </div>
    );
  }

  // Helper function to get badge variant based on game result
  const getBadgeVariant = (result: string | null) => {
    if (!result) return "secondary";
    switch (result) {
      case "win": return "default"; // Use "default" instead of "success"
      case "loss": return "destructive";
      case "draw": return "outline";
      default: return "secondary";
    }
  };

  // Helper function to get game status text
  const getGameStatusText = (game: RecentGame) => {
    if (game.status === 'waiting') return "Waiting for opponent";
    if (game.status === 'active') return "Game in progress";
    
    if (game.result === 'win') return "Victory";
    if (game.result === 'loss') return "Defeated";
    if (game.result === 'draw') return "Draw";
    
    return "Unknown";
  };

  // Helper for custom badge styling
  const getCustomClass = (result: string | null) => {
    if (result === 'win') return "bg-green-500 text-white hover:bg-green-600";
    return "";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Recent Games</h3>
      
      <div className="space-y-3">
        {games.map(game => (
          <Card 
            key={game.id} 
            className={`p-4 hover:bg-accent/20 transition-colors ${
              game.result === 'win' 
                ? 'border-green-500/30' 
                : game.result === 'loss' 
                  ? 'border-red-500/30' 
                  : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getBadgeVariant(game.result)}
                    className={cn(getCustomClass(game.result))}
                  >
                    {getGameStatusText(game)}
                  </Badge>
                  
                  <Badge variant="outline">
                    {game.player_color === 'white' ? 'White' : 'Black'}
                  </Badge>
                  
                  {/* Game Mode Badge */}
                  {game.mode && (
                    <Badge 
                      variant={game.mode === 'ranked' ? 'secondary' : 'outline'}
                      className="flex items-center gap-1"
                    >
                      {game.mode === 'ranked' ? (
                        <>
                          <Trophy className="h-3 w-3" /> Ranked
                        </>
                      ) : (
                        <>
                          <Medal className="h-3 w-3" /> Casual
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                
                {/* Show ELO change for ranked games */}
                {game.mode === 'ranked' && game.elo_change !== undefined && game.elo_change !== null && (
                  <div className="text-sm font-medium">
                    <span className={formatEloChange(game.elo_change).colorClass}>
                      {formatEloChange(game.elo_change).text} ELO
                    </span>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  {new Date(game.updated_at).toLocaleDateString()}{' '}
                  {new Date(game.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <Button asChild variant="ghost" size="sm">
                <Link href={`/game/${game.id}`} className="flex items-center gap-1">
                  {game.status === 'waiting' ? 'Join' : 
                   game.status === 'active' ? 'Play' : 'View'}
                  <ChevronRight size={16} />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}