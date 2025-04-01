'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function DashboardClient({ user }: { user: any }) {
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
  
  return (
    <div className="space-y-6">
      <div>
        <Button
          onClick={handleCreateGame}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create New Game'}
        </Button>
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
  
  return (
    <Card className={`${isYourTurn() ? 'border-green-500 dark:border-green-700' : ''}`}>
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <h3 className="font-medium">Game #{game.id.substring(0, 8)}</h3>
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
          <p className="text-sm text-muted-foreground">
            Playing as {getPlayerRole()}
            {game.status !== 'waiting' && ' • '}
            {game.status !== 'waiting' && new Date(game.updated_at).toLocaleDateString()}
          </p>
        </div>
        
        <Button 
          asChild 
          variant={isYourTurn() ? "default" : "secondary"}
          size="sm"
        >
          <Link href={`/game/${game.id}`}>
            {game.status === 'waiting' ? 'Join' : 
             isYourTurn() ? 'Play' : 'View'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}