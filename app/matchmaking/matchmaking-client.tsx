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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Debug logging function
  const logDebug = (message: string) => {
    console.log(`[Matchmaking] ${message}`);
    setDebugInfo(prev => [...prev.slice(-9), message]); // Keep last 10 messages
  };
  
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
  
  // MAIN GAME DETECTION SYSTEM
  useEffect(() => {
    if (!isSearching || !matchmakingId) return;
    
    logDebug(`Starting game detection for matchmaking ID: ${matchmakingId}`);
    
    // Create references we'll need for cleanup
    let pollInterval: NodeJS.Timeout | null = null;
    let matchmakingChannel: any = null;
    let gamesChannel: any = null;
    let isRedirecting = false; // Flag to prevent multiple redirects
    
    // Function to redirect to a game
    const redirectToGame = (gameId: string, source: string) => {
      if (isRedirecting) return; // Prevent multiple redirects
      
      isRedirecting = true;
      logDebug(`🎮 Redirecting to game ${gameId} (source: ${source})`);
      
      // Clean up listeners before redirect
      if (pollInterval) clearInterval(pollInterval);
      if (matchmakingChannel) supabase.removeChannel(matchmakingChannel);
      if (gamesChannel) supabase.removeChannel(gamesChannel);
      
      // Navigate to game
      router.push(`/game/${gameId}`);
      setIsSearching(false);
    };
    
    // Function to check for game via multiple methods
    const checkForGame = async () => {
      if (isRedirecting) return; // Skip if already redirecting
      
      try {
        logDebug("🔍 Checking for game...");
        
        // METHOD 1: Check matchmaking entry for game_id
        const { data: matchEntry } = await supabase
          .from('matchmaking')
          .select('game_id, is_active')
          .eq('id', matchmakingId)
          .single();
          
        if (matchEntry?.game_id) {
          logDebug(`✓ Found game via matchmaking entry: ${matchEntry.game_id}`);
          redirectToGame(matchEntry.game_id, "matchmaking-entry");
          return true;
        }
        
        // METHOD 2: Check for direct player games
        const { data: games } = await supabase
          .from('games')
          .select('id, status, created_at')
          .or(`white_player.eq.${user.id},black_player.eq.${user.id}`)
          .in('status', ['active', 'waiting'])
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (games && games.length > 0) {
          // Find newest active game
          const recentGames = games.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          if (recentGames[0].id) {
            logDebug(`✓ Found game via player check: ${recentGames[0].id}`);
            redirectToGame(recentGames[0].id, "player-games");
            return true;
          }
        }
        
        // No game found
        return false;
      } catch (error) {
        console.error("Error checking for game:", error);
        return false;
      }
    };
    
    // 1. SETUP POLLING - Check immediately and regularly afterward
    checkForGame(); // Initial check
    
    pollInterval = setInterval(async () => {
      if (isRedirecting) {
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
      
      const gameFound = await checkForGame();
      if (gameFound && pollInterval) clearInterval(pollInterval);
    }, 2000); // Every 2 seconds
    
    // 2. SETUP REAL-TIME SUBSCRIPTIONS
    
    // Listen for matchmaking entry updates (most reliable method)
    matchmakingChannel = supabase
      .channel(`matchmaking-updates-${matchmakingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only listen for updates
          schema: 'public',
          table: 'matchmaking',
          filter: `id=eq.${matchmakingId}`,
        },
        (payload) => {
          logDebug(`⚡ Matchmaking entry updated: ${JSON.stringify(payload.new)}`);
          
          if (payload.new?.game_id) {
            redirectToGame(payload.new.game_id, "matchmaking-sub");
          } else if (payload.new?.is_active === false) {
            // Entry inactive but no game_id - check for games
            logDebug("Matchmaking entry inactive, checking for games...");
            checkForGame();
          }
        }
      )
      .subscribe((status) => {
        logDebug(`Matchmaking subscription status: ${status}`);
      });
    
    // Also listen for new games where user is a player (backup method)
    gamesChannel = supabase
      .channel(`games-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games',
          filter: `or(white_player.eq.${user.id},black_player.eq.${user.id})`,
        },
        (payload) => {
          logDebug(`⚡ New game created: ${JSON.stringify(payload.new)}`);
          
          if (payload.new?.id) {
            redirectToGame(payload.new.id, "games-sub");
          }
        }
      )
      .subscribe((status) => {
        logDebug(`Games subscription status: ${status}`);
      });
      
    // 3. SETUP FALLBACK - If all else fails, check if matchmaking entry still exists
    const checkEntryExists = async () => {
      if (isRedirecting) return;
      
      try {
        const { data, error } = await supabase
          .from('matchmaking')
          .select('id')
          .eq('id', matchmakingId)
          .single();
          
        if (error || !data) {
          logDebug("Matchmaking entry no longer exists, checking for games...");
          checkForGame();
        }
      } catch (error) {
        console.error("Error checking if entry exists:", error);
      }
    };
    
    // Check if entry still exists every 10 seconds (fallback)
    const fallbackInterval = setInterval(checkEntryExists, 10000);
    
    // Cleanup function
    return () => {
      logDebug("Cleaning up matchmaking listeners");
      if (pollInterval) clearInterval(pollInterval);
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (matchmakingChannel) supabase.removeChannel(matchmakingChannel);
      if (gamesChannel) supabase.removeChannel(gamesChannel);
    };
  }, [isSearching, matchmakingId, user.id, supabase, router]);
  
  // Check if user is already in queue when component loads
  useEffect(() => {
    const checkExistingQueue = async () => {
      logDebug("Checking for existing queue entry");
      
      const { data, error } = await supabase
        .from('matchmaking')
        .select('*, game_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      
      if (error) {
        console.error("Error checking existing queue:", error);
        return;
      }
        
      if (data && data.length > 0) {
        logDebug(`Found existing queue entry: ${data[0].id}`);
        
        // If already has game_id, go straight to the game
        if (data[0].game_id) {
          logDebug(`Entry already has game_id: ${data[0].game_id}, redirecting...`);
          router.push(`/game/${data[0].game_id}`);
          return;
        }
        
        setIsSearching(true);
        setSelectedMode(data[0].mode);
        setMatchmakingId(data[0].id);
        
        // Calculate how long they've been in queue
        const joinedTime = new Date(data[0].joined_at).getTime();
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - joinedTime) / 1000);
        setSearchTime(elapsedSeconds);
      } else {
        logDebug("No existing queue entry found");
      }
    };
    
    checkExistingQueue();
  }, [user.id, supabase, router]);
  
  const handleJoinQueue = async (mode: 'casual' | 'ranked') => {
    try {
      logDebug(`Joining ${mode} queue...`);
      
      setSelectedMode(mode);
      setIsSearching(true);
      setSearchTime(0);
      
      const result = await joinMatchmakingAction(
        new FormData(), 
        mode,
        user.id,
        mode === 'ranked' ? eloRating : undefined
      );
      
      if (!result) {
        logDebug("Error joining queue - no result returned");
        setIsSearching(false);
        setSelectedMode(null);
        return;
      }
      
      logDebug(`Queue join successful: ${JSON.stringify(result)}`);
      
      // If game was already found, redirect immediately
      if (result.game_id) {
        logDebug(`Match found immediately! Redirecting to game: ${result.game_id}`);
        router.push(`/game/${result.game_id}`);
        return;
      }
      
      // Otherwise store matchmaking ID for polling/subscriptions
      setMatchmakingId(result.id);
      
    } catch (error) {
      console.error("Error joining queue:", error);
      logDebug(`Error joining queue: ${error}`);
      setIsSearching(false);
      setSelectedMode(null);
    }
  };
  
  const handleCancel = async () => {
    if (!matchmakingId) return;
    
    try {
      logDebug("Canceling matchmaking...");
      await cancelMatchmakingAction(new FormData(), matchmakingId);
      setIsSearching(false);
      setSelectedMode(null);
      setMatchmakingId(null);
      setSearchTime(0);
      logDebug("Matchmaking canceled");
    } catch (error) {
      console.error("Error canceling matchmaking:", error);
      logDebug(`Error canceling matchmaking: ${error}`);
    }
  };
  
  const rankColor = getRankColor(rankTier);
  
  return (
    <div className="space-y-6">
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
      </div>
      
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