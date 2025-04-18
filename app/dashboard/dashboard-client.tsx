'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RankBadge } from '@/components/chess/RankBadge';
import { 
  Plus, 
  Crown,
  Trophy, 
  Users, 
  Clock,
  Search,
  Swords
} from 'lucide-react';

export default function DashboardClient({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
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
  
  // Format rank tier for display
  const rankTier = profile?.rank_tier || 'Bronze';
  const eloRating = profile?.elo_rating || 1200;
  const gamesPlayed = profile?.games_played || 0;
  const wins = profile?.wins || 0;
  const losses = profile?.losses || 0;
  const draws = profile?.draws || 0;
  
  return (
    <div className="space-y-6">
      {/* Featured Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Quick Match Card */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-2">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Quick Match
                </h3>
                <p className="text-sm text-muted-foreground">
                  Find an opponent instantly through matchmaking
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <Button 
                  onClick={() => router.push('/matchmaking')}
                  className="w-full"
                >
                  Find Match
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Custom Game Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-2">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-blue-500" /> {/* Changed from ChessPiece to Crown */}
                  Custom Game
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create a custom game and invite friends
                </p>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleCreateGame}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? 'Creating...' : 'Create Game'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Rank Status Card */}
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
          <CardContent className="p-6">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-2">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Your Rank
                </h3>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Rank</span>
                    <RankBadge rankTier={rankTier} eloRating={eloRating} showElo={true} size="md" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Record</span>
                    <div className="text-sm">
                      <span className="text-green-600">{wins}</span>W - 
                      <span className="text-red-600">{losses}</span>L - 
                      <span className="text-yellow-500">{draws}</span>D
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/leaderboard')}
                >
                  <Swords className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <GamesList userId={user.id} />
    </div>
  );
}

function GamesList({ userId }: { userId: string }) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .or(`white_player.eq.${userId},black_player.eq.${userId}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setGames(data || []);
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setLoading(false);
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
          if (game.white_player === userId || game.black_player === userId) {
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
  }, [userId, supabase]);
  
  if (loading) {
    return <div className="py-4">Loading your games...</div>;
  }
  
  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          You don't have any games yet. Create one to get started!
        </CardContent>
      </Card>
    );
  }
  
  // Filter games into active and completed
  const activeGames = games.filter(game => 
    game.status === 'active' || game.status === 'waiting'
  );
  
  const completedGames = games.filter(game => 
    game.status === 'completed' || game.status === 'draw' || game.status === 'resigned'
  );
  
  return (
    <div>
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
                You don't have any active games. Create a new game to start playing!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeGames.map((game) => (
                <GameCard key={game.id} game={game} userId={userId} />
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
                <GameCard key={game.id} game={game} userId={userId} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GameCard({ game, userId }: { game: any, userId: string }) {
  const getGameStatus = () => {
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
  
  const getPlayerRole = () => {
    if (game.white_player === userId) return 'White';
    if (game.black_player === userId) return 'Black';
    return 'Spectator';
  };

  const isYourTurn = () => {
    if (game.status !== 'active') return false;
    return (game.turn === 'w' && game.white_player === userId) || 
           (game.turn === 'b' && game.black_player === userId);
  };

  const isGameOver = game.status === 'completed' || game.status === 'draw' || game.status === 'resigned';
  
  const didYouWin = isGameOver && game.winner === userId;
  
  // Format ELO change for display
  const getEloChangeDisplay = () => {
    if (game.mode !== 'ranked' || !isGameOver) return null;
    
    let eloChange = 0;
    
    if (game.white_player === userId && game.white_elo_change !== null) {
      eloChange = game.white_elo_change;
    } else if (game.black_player === userId && game.black_elo_change !== null) {
      eloChange = game.black_elo_change;
    } else {
      return null;
    }
    
    const textColor = eloChange > 0 
      ? 'text-green-600 dark:text-green-500' 
      : eloChange < 0 
        ? 'text-red-600 dark:text-red-500' 
        : 'text-gray-600 dark:text-gray-400';
        
    const sign = eloChange > 0 ? '+' : '';
    
    return (
      <span className={`text-xs font-mono ${textColor}`}>
        {sign}{eloChange} ELO
      </span>
    );
  };
  
  return (
    <Card className={`${isYourTurn() ? 'border-green-500 dark:border-green-700' : ''}`}>
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
              {getGameStatus()}
            </Badge>
            
            {isYourTurn() && (
              <Badge variant="default" className="animate-pulse">Your Turn</Badge>
            )}
            
            {didYouWin && (
              <Badge variant="outline">You Won</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Playing as {getPlayerRole()}
              {game.status !== 'waiting' && ' • '}
              {game.status !== 'waiting' && new Date(game.updated_at).toLocaleDateString()}
            </p>
            {getEloChangeDisplay()}
          </div>
        </div>
        
        <Button 
          asChild 
          variant={isYourTurn() ? "default" : "secondary"}
          size="sm"
          className="gap-1"
        >
          <Link href={`/game/${game.id}`}>
            {game.status === 'waiting' 
              ? <><Users className="h-4 w-4 mr-1" /> Join</>
              : isYourTurn() 
                ? <><Clock className="h-4 w-4 mr-1" /> Play</> 
                : <><Crown className="h-4 w-4 mr-1" /> View</>} {/* Changed from ChessPiece to Crown */}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}