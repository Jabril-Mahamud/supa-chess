'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import ChessBoard from '@/components/chess/ChessBoard';
import { GameData, PlayerColor, GameClientProps } from '@/lib/types/Chess';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function GameClient({ gameId, game: initialGame, userId }: GameClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [game, setGame] = useState<GameData>(initialGame);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');

  useEffect(() => {
    // Fetch fresh data immediately
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (!error && data) {
        setGame(data as GameData);
      }
    };

    fetchGame();

    // Set up realtime subscription
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          setGame(payload.new as GameData);
        }
      )
      .subscribe((status) => {
        setSubscriptionStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const getPlayerRole = (): PlayerColor | undefined => {
    if (game.white_player === userId) return 'w';
    if (game.black_player === userId) return 'b';
    return undefined;
  };

  const handleJoinGame = async () => {
    // Determine which role the user should take
    const role = !game.white_player ? 'white_player' : 'black_player';

    try {
      const { error } = await supabase
        .from('games')
        .update({
          [role]: userId,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (error) {
        console.error('Join error:', error);
        return;
      }

      // Force a refresh of the game data
      router.refresh();
    } catch (error) {
      console.error('Join error:', error);
    }
  };

  const playerRole = getPlayerRole();
  const canJoin =
    game.status === 'waiting' &&
    ((game.white_player === null && game.black_player !== userId) ||
      (game.black_player === null && game.white_player !== userId));

  // Determine connection status for display
  const isConnected = subscriptionStatus === 'SUBSCRIBED';
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Game Information</CardTitle>
            <Badge variant={isConnected ? "default" : "destructive"} className="ml-2">
              {isConnected ? "Connected" : "Reconnecting..."}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="font-medium">
                <Badge variant={game.status === 'active' ? "default" : 
                              game.status === 'completed' ? "outline" : 
                              game.status === 'waiting' ? "secondary" : "destructive"}>
                  {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                </Badge>
              </p>
            </div>
            {game.status === 'active' && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Turn</p>
                <p className="font-medium">{game.turn === 'w' ? 'White' : 'Black'}</p>
              </div>
            )}
            {game.status !== 'active' && game.winner && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Winner</p>
                <p className="font-medium">
                  {game.winner === userId ? (
                    <span className="text-green-600 dark:text-green-500 font-bold">You</span>
                  ) : (
                    <span>Opponent</span>
                  )}
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">White Player</p>
              <p className="font-medium">
                {game.white_player
                  ? game.white_player === userId
                    ? 'You'
                    : 'Opponent'
                  : 'Waiting...'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Black Player</p>
              <p className="font-medium">
                {game.black_player
                  ? game.black_player === userId
                    ? 'You'
                    : 'Opponent'
                  : 'Waiting...'}
              </p>
            </div>
          </div>

          {canJoin && (
            <Button 
              onClick={handleJoinGame}
              className="w-full mt-2"
            >
              Join as {!game.white_player ? 'White' : 'Black'}
            </Button>
          )}
          
          {/* Game instructions for players who joined */}
          {playerRole && game.status === 'waiting' && (
            <Alert>
              <AlertDescription>
                Waiting for an opponent to join. Share the game link to invite someone.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Show the game over summary when the game is completed/resigned/draw */}
      {(game.status === 'completed' || game.status === 'resigned' || game.status === 'draw') && (
        <Card className="border-2 border-yellow-500 dark:border-yellow-600 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>
              {game.status === 'completed' ? '♚ Game Over - Checkmate! ♚' : 
               game.status === 'draw' ? '🤝 Game Over - Draw!' :
               '🏳️ Game Over - Resignation!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {game.winner && (
              <p className="text-lg font-medium mb-3">
                {game.winner === userId ? (
                  <span className="text-green-600 dark:text-green-500">You won!</span>
                ) : (
                  <span>Your opponent won.</span>
                )}
              </p>
            )}
            {game.status === 'draw' && (
              <p className="text-lg font-medium mb-3">The game ended in a draw.</p>
            )}
            <p className="text-muted-foreground mb-4">
              You can view the final position and moves below.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              variant="default"
            >
              Return to Dashboard
            </Button>
            <Button
              onClick={() => {
                // Here you would add logic to create a rematch
                alert('Rematch functionality would go here');
              }}
              variant="outline"
            >
              Request Rematch
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Render the chess board for active games or as a read-only display for completed games */}
      {game.status !== 'waiting' && (
        <div className={game.status !== 'active' ? "opacity-90 pointer-events-none" : ""}>
          <ChessBoard 
            gameId={gameId} 
            userId={userId} 
            playerColor={playerRole} 
          />
        </div>
      )}
      
      {/* If game is waiting and user hasn't joined, show instructions */}
      {game.status === 'waiting' && !playerRole && !canJoin && (
        <Alert>
          <AlertDescription>
            You are viewing this game as a spectator. The game hasn't started yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}