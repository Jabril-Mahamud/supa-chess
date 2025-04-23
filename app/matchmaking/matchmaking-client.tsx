// app/matchmaking/matchmaking-client.tsx (updated)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/chess/RankBadge";
import { joinMatchmakingAction, cancelMatchmakingAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle, Clock, Medal, Trophy, 
  Users, X, Zap, HelpCircle, Plus, Crown
} from 'lucide-react';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";

interface MatchmakingClientProps {
  user: any;
  profile: any;
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
  profile,
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('find-match');
  const [games, setGames] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  // Handle game creation
  const handleCreateGame = async () => {
    setLoading(true);
    
    try {
      // Randomly choose if the current user is white or black
      const isWhite = Math.random() > 0.5;
      
      const { data, error } = await supabase
        .from('games')
        .insert({
          white_player: isWhite ? user.id : null,
          black_player: isWhite ? null : user.id,
          status: 'waiting',
          mode: 'casual', // Set default mode to casual for custom games
        })
        .select();
      
      if (error) throw error;
      
      // Redirect to the game page
      router.push(`/game/${data[0].id}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Error creating game');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setGamesLoading(true);
        
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .or(`white_player.eq.${user.id},black_player.eq.${user.id}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setGames(data || []);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setGamesLoading(false);
      }
    };
    
    fetchGames();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('table-db-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Check if the game involves the current user
          const game = payload.new;
          if (game.white_player === user.id || game.black_player === user.id) {
            setGames((prev) => [game, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          // Update the game in the list
          setGames((prev) => 
            prev.map((game) => 
              game.id === payload.new.id ? payload.new : game
            )
          );
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, supabase]);
  
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
  
  // Check if user is already in queue when component loads
  useEffect(() => {
    const checkExistingQueue = async () => {
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
        // If already has game_id, go straight to the game
        if (data[0].game_id) {
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
      }
    };
    
    checkExistingQueue();
  }, [user.id, supabase, router]);
  
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
      
      if (!result) {
        setIsSearching(false);
        setSelectedMode(null);
        return;
      }
      
      // If game was already found, redirect immediately
      if (result.game_id) {
        router.push(`/game/${result.game_id}`);
        return;
      }
      
      // Otherwise store matchmaking ID for polling/subscriptions
      setMatchmakingId(result.id);
      
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
  
  // Filter games into active and completed
  const activeGames = games.filter(game => 
    game.status === 'active' || game.status === 'waiting'
  );
  
  const completedGames = games.filter(game => 
    game.status === 'completed' || game.status === 'draw' || game.status === 'resigned'
  );
  
  // Helper function to get game status text
  const getGameStatus = (game: any) => {
    switch (game.status) {
      case 'waiting':
        return 'Waiting for opponent';
      case 'active':
        return game.turn === 'w' ? 'White to move' : 'Black to move';
      case 'completed':
        return 'Checkmate';
      case 'draw':
        return 'Draw';
      case 'resigned':
        return 'Resigned';
      default:
        return 'Unknown status';
    }
  };
  
  // Determine if user is white or black in a game
  const getPlayerRole = (game: any) => {
    if (game.white_player === user.id) return 'White';
    if (game.black_player === user.id) return 'Black';
    return 'Spectator';
  };
  
  // Check if it's the user's turn in a game
  const isYourTurn = (game: any) => {
    if (game.status !== 'active') return false;
    return (game.turn === 'w' && game.white_player === user.id) || 
           (game.turn === 'b' && game.black_player === user.id);
  };
  
  return (
    <Tabs defaultValue="find-match" onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="find-match">Find Match</TabsTrigger>
        <TabsTrigger value="my-games">
          My Games
          {activeGames.length > 0 && (
            <Badge variant="secondary" className="ml-2">{activeGames.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="find-match" className="space-y-6">
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription className="text-sm">
                    Play competitive games that affect your ELO rating and rank
                  </AlertDescription>
                </Alert>

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
                  </div>
                )}
                
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
              </div>
            </CardContent>
          </Card>
          
          {/* Casual Card */}
          <Card className={`${selectedMode === 'casual' ? 'border-primary' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-blue-500" /> 
                Casual Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Casual games do not affect your ELO rating or rank. Perfect for trying new strategies or just having fun!
                  </AlertDescription>
                </Alert>
                
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
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Custom Game Option */}
        {isSearching ? null : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-blue-500" />
                Custom Game
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Create a custom game and invite friends to play</p>
                <Button
                  onClick={handleCreateGame}
                  disabled={loading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {loading ? 'Creating...' : 'Create Custom Game'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
      
      <TabsContent value="my-games">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Your Games</h2>
          
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active">
                Active Games
                {activeGames.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{activeGames.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed Games
                {completedGames.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{completedGames.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-0">
              {activeGames.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    You don't have any active games. Create a new game or find a match to start playing!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeGames.map((game) => (
                    <Card key={game.id} className={`${isYourTurn(game) ? 'border-green-500 dark:border-green-700' : ''}`}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            Game #{game.id.substring(0, 8)}
                            {game.mode === 'ranked' && (
                              <Badge variant="secondary" className="text-xs">Ranked</Badge>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 my-1">
                            <Badge 
                              variant={
                                game.status === 'waiting' ? 'secondary' : 
                                game.status === 'active' ? 'default' :
                                'outline'
                              }
                            >
                              {getGameStatus(game)}
                            </Badge>
                            
                            {isYourTurn(game) && (
                              <Badge variant="default" className="animate-pulse">Your Turn</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Playing as {getPlayerRole(game)}
                            {game.status !== 'waiting' && ' • '}
                            {game.status !== 'waiting' && new Date(game.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <Button 
                          asChild 
                          variant={isYourTurn(game) ? "default" : "secondary"}
                          size="sm"
                          className="gap-1"
                        >
                          <Link href={`/game/${game.id}`}>
                            {game.status === 'waiting' 
                              ? 'Join'
                              : isYourTurn(game) 
                                ? 'Play' 
                                : 'View'}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              {completedGames.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    You don't have any completed games yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {completedGames.map((game) => (
                    <Card key={game.id}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            Game #{game.id.substring(0, 8)}
                            {game.mode === 'ranked' && (
                              <Badge variant="secondary" className="text-xs">Ranked</Badge>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 my-1">
                            <Badge variant="outline">
                              {getGameStatus(game)}
                            </Badge>
                            
                            {game.winner === user.id && (
                              <Badge variant="outline">You Won</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Played as {getPlayerRole(game)} • {new Date(game.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <Button 
                          asChild 
                          variant="secondary"
                          size="sm"
                        >
                          <Link href={`/game/${game.id}`}>
                            View
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </TabsContent>
    </Tabs>
  );
}