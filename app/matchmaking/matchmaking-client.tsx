'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  Medal,
  Trophy,
  Users,
  X,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { joinMatchmakingAction, cancelMatchmakingAction } from "@/app/actions";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRankColor } from '@/lib/utils';

interface MatchmakingClientProps {
  user: any;
  isNewPlayer: boolean;
  placementGames: number;
  eloRating: number;
  highestElo: number;
  rankTier: string;
}

export default function MatchmakingClient({ 
  user, 
  isNewPlayer,
  placementGames,
  eloRating,
  highestElo,
  rankTier
}: MatchmakingClientProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedMode, setSelectedMode] = useState<'casual' | 'ranked' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [matchmakingId, setMatchmakingId] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState<{casual: number, ranked: number}>({ casual: 0, ranked: 0 });
  const [showPlacementInfo, setShowPlacementInfo] = useState(false);
  
  // Time formatter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  // Update queue counts
  useEffect(() => {
    const fetchQueueCounts = async () => {
      const { data: casualCount } = await supabase
        .from('matchmaking')
        .select('count')
        .eq('mode', 'casual')
        .eq('is_active', true);
        
      const { data: rankedCount } = await supabase
        .from('matchmaking')
        .select('count')
        .eq('mode', 'ranked')
        .eq('is_active', true);
        
      setQueueCount({
        casual: casualCount?.length || 0,
        ranked: rankedCount?.length || 0
      });
    };
    
    fetchQueueCounts();
    const interval = setInterval(fetchQueueCounts, 10000);
    return () => clearInterval(interval);
  }, [supabase]);
  
  // Handle search timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSearching]);
  
  // Check for game creation
  useEffect(() => {
    if (!isSearching || !matchmakingId) return;
    
    const checkForGame = async () => {
      const { data: games } = await supabase
        .from('games')
        .select('id')
        .eq('matchmaking_id', matchmakingId)
        .limit(1);
        
      if (games && games.length > 0) {
        // Game created, navigate to it
        router.push(`/game/${games[0].id}`);
        setIsSearching(false);
      }
    };
    
    const interval = setInterval(checkForGame, 2000);
    return () => clearInterval(interval);
  }, [isSearching, matchmakingId, supabase, router]);
  
  // Check if user is already in queue when component loads
  useEffect(() => {
    const checkExistingQueue = async () => {
      const { data } = await supabase
        .from('matchmaking')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
        
      if (data && data.length > 0) {
        setIsSearching(true);
        setSelectedMode(data[0].mode);
        setMatchmakingId(data[0].id);
        
        // Calculate how long they've been in queue
        const joinedTime = new Date(data[0].joined_at).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - joinedTime) / 1000);
        setSearchTime(elapsedSeconds);
      }
    };
    
    checkExistingQueue();
  }, [user.id, supabase]);
  
  // Set up realtime listener for the matchmaking queue
  useEffect(() => {
    if (!matchmakingId) return;
    
    const channel = supabase
      .channel(`matchmaking-${matchmakingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking',
          filter: `id=eq.${matchmakingId}`,
        },
        (payload) => {
          if (payload.new && !payload.new.is_active) {
            // Queue was deactivated - a match was found!
            // Listen for game creation handled by the other effect
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchmakingId, supabase]);
  
  const handleJoinQueue = async (mode: 'casual' | 'ranked') => {
    try {
      setSelectedMode(mode);
      setIsSearching(true);
      setSearchTime(0);
      
      const result = await joinMatchmakingAction(
        new FormData(), 
        mode,
        user.id,
        mode === 'ranked' ? eloRating : undefined
      );
      
      if (result && result.id) {
        setMatchmakingId(result.id);
      } else {
        // Handle error
        setIsSearching(false);
        setSelectedMode(null);
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      setIsSearching(false);
      setSelectedMode(null);
    }
  };
  
  const handleCancel = async () => {
    if (!matchmakingId) return;
    
    try {
      await cancelMatchmakingAction(new FormData(), matchmakingId);
      setIsSearching(false);
      setSelectedMode(null);
      setMatchmakingId(null);
      setSearchTime(0);
    } catch (error) {
      console.error("Error canceling matchmaking:", error);
    }
  };
  
  const rankColor = getRankColor(rankTier);
  
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      {/* Ranked Card */}
      <Card className={`${selectedMode === 'ranked' ? 'border-primary' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranked Mode
          </CardTitle>
          <CardDescription>
            Play competitive games that affect your ELO rating and rank
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Current ELO</span>
              <span className="font-bold">{eloRating}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Rank</span>
              <Badge 
                className={`${rankColor} font-semibold`}
              >
                {rankTier}
              </Badge>
            </div>
            
            {isNewPlayer && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Placement Games</span>
                  <span className="font-medium">{placementGames}/10</span>
                </div>
                <Progress value={placementGames * 10} className="h-2 mt-1" />
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-xs mt-1"
                  onClick={() => setShowPlacementInfo(!showPlacementInfo)}
                >
                  What are placement games?
                </Button>
                
                {showPlacementInfo && (
                  <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded-md">
                    You must complete 10 placement games to establish your initial rank. 
                    During this period, your ELO will adjust more dramatically based on your
                    performance.
                  </div>
                )}
              </div>
            )}
            
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users size={14} /> <span>{queueCount.ranked} players in queue</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {isSearching && selectedMode === 'ranked' ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock size={16} /> Searching for {formatTime(searchTime)}
                </span>
                <Badge variant="outline" className="animate-pulse">
                  Finding opponent...
                </Badge>
              </div>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleCancel}
              >
                <X className="mr-2 h-4 w-4" /> Cancel Search
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full"
              onClick={() => handleJoinQueue('ranked')}
              disabled={isSearching}
            >
              <Zap className="mr-2 h-4 w-4" /> Find Ranked Match
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Casual Card */}
      <Card className={`${selectedMode === 'casual' ? 'border-primary' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-blue-500" /> 
            Casual Mode
          </CardTitle>
          <CardDescription>
            Play casual games that don't affect your ranking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Casual games do not affect your ELO rating or rank. Perfect for trying new strategies or just having fun!
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users size={14} /> <span>{queueCount.casual} players in queue</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {isSearching && selectedMode === 'casual' ? (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock size={16} /> Searching for {formatTime(searchTime)}
                </span>
                <Badge variant="outline" className="animate-pulse">
                  Finding opponent...
                </Badge>
              </div>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleCancel}
              >
                <X className="mr-2 h-4 w-4" /> Cancel Search
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleJoinQueue('casual')}
              disabled={isSearching}
            >
              <Users className="mr-2 h-4 w-4" /> Find Casual Match
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Custom Game Option */}
      {isSearching ? null : (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Custom Game</CardTitle>
            <CardDescription>
              Create a custom game and invite a friend
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Create Custom Game
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}