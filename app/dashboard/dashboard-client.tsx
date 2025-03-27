'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";
import Link from 'next/link';

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
        <button
          onClick={handleCreateGame}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create New Game'}
        </button>
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
    return <div>Loading your games...</div>;
  }
  
  if (games.length === 0) {
    return <div>You don't have any games yet. Create one to get started!</div>;
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Your Games</h2>
      <div className="grid gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} userId={userId} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game, userId }: { game: any, userId: string }) {
  const getGameStatus = () => {
    switch (game.status) {
      case 'waiting':
        return 'Waiting for opponent';
      case 'active':
        return `${game.turn === 'w' ? 'White' : 'Black'}'s turn`;
      case 'completed':
        return 'Game completed';
      case 'draw':
        return 'Game ended in draw';
      case 'resigned':
        return 'Game resigned';
      default:
        return 'Unknown status';
    }
  };
  
  const getPlayerRole = () => {
    if (game.white_player === userId) return 'White';
    if (game.black_player === userId) return 'Black';
    return 'Spectator';
  };
  
  return (
    <div className="border rounded p-4 flex justify-between items-center">
      <div>
        <h3 className="font-medium">Game #{game.id.substring(0, 8)}</h3>
        <p className="text-sm">{getGameStatus()}</p>
        <p className="text-sm">You're playing as: {getPlayerRole()}</p>
      </div>
      <Link 
        href={`/game/${game.id}`}
        className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition"
      >
        {game.status === 'waiting' ? 'Join Game' : 'View Game'}
      </Link>
    </div>
  );
}