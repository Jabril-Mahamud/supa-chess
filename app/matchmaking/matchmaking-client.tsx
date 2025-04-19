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
  Zap,
  HelpCircle
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RankBadge } from "@/components/chess/RankBadge";
import { joinMatchmakingAction, cancelMatchmakingAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface MatchmakingClientProps {
  user: any;
  isNewPlayer: boolean;
  placementGamesPlayed: number;
  eloRating: number;
  highestElo: number;
  rankTier: string;
  rankedGamesPlayed: number;
  gamesPlayed: number;
}

export default function MatchmakingClient({ 
  user, 
  isNewPlayer,
  placementGamesPlayed,
  eloRating,
  highestElo,
  rankTier,
  rankedGamesPlayed,
  gamesPlayed
}: MatchmakingClientProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedMode, setSelectedMode] = useState<'casual' | 'ranked' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [matchmakingId, setMatchmakingId] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState<{casual: number, ranked: number}>({ casual: 0, ranked: 0 });
  const [showPlacementInfo, setShowPlacementInfo] = useState(false);
  const [showRankExplanation, setShowRankExplanation] = useState(false);
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
    
    // Additional code for game detection (omitted for brevity)
    // ...
    
    return () => {
      logDebug("Cleaning up matchmaking listeners");
      if (pollInterval) clearInterval(pollInterval);
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
  
  return (
    <div className="space-y-6">
      {/* Explanation for new players */}
      {rankedGamesPlayed === 0 && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">New to Ranked Chess?</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Play 10 placement matches to determine your initial rank and ELO rating.
            During placement, your rating will fluctuate more as the system determines your skill level.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Ranked Card */}
        <Card className={`${selectedMode === 'ranked' ? 'border-primary' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranked Mode
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowRankExplanation(!showRankExplanation)}>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click for more information about the ranking system</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Play competitive games that affect your ELO rating and rank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {showRankExplanation && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <p className="font-medium">How the ranking system works:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>You must play 10 placement matches to get your initial rank</li>
                      <li>Win against higher-ranked players to gain more ELO</li>
                      <li>Ranks range from Bronze to Grandmaster</li>
                      <li>Your rank updates immediately after each game</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm">Your Rank</span>
                <RankBadge 
                  rankTier={rankTier} 
                  eloRating={eloRating}
                  gamesPlayed={gamesPlayed}
                  rankedGamesPlayed={rankedGamesPlayed}
                  showElo={true}
                  isPlacement={isNewPlayer}
                  placementGamesPlayed={placementGamesPlayed}
                  size="md"
                />
              </div>
              
              {isNewPlayer && rankedGamesPlayed > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Placement Progress</span>
                    <span className="font-medium">{placementGamesPlayed}/10</span>
                  </div>
                  <Progress value={placementGamesPlayed * 10} className="h-2 mt-1" />
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-xs mt-1"
                    onClick={() => setShowPlacementInfo(!showPlacementInfo)}
                  >
                    {showPlacementInfo ? "Hide info" : "What are placement games?"}
                  </Button>
                  
                  {showPlacementInfo && (
                    <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted/50 rounded-md">
                      You must complete 10 placement games to establish your initial rank. 
                      During this period, your ELO will adjust more dramatically based on your
                      performance against players of different skill levels.
                    </div>
                  )}
                </div>
              )}
              
              {rankedGamesPlayed === 0 && (
                <div className="p-3 border border-dashed rounded-md border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    You haven't played any ranked games yet. Complete your first 10 games to earn your rank!
                  </p>
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
              
              <div className="p-3 border border-dashed rounded-md border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  New to chess? Start with casual games to get comfortable with the rules and gameplay.
                </p>
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