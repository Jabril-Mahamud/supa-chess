// app/game/[id]/game-client.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import ChessBoard from '@/components/chess/ChessBoard';
import { GameData, PlayerColor, GameClientProps } from '@/lib/types/Chess';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GameOverMessage } from '@/components/chess/GameOverMessage'; 
import { Chess } from 'chess.js'; 
import { updateGameResultWithEloAction } from '@/app/actions';
import { Clock, UserRoundX } from 'lucide-react';

export default function GameClient({ gameId, game: initialGame, userId }: GameClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [game, setGame] = useState<GameData>(initialGame);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [chessInstance, setChessInstance] = useState<Chess | null>(null);
  const [whitePlayerUsername, setWhitePlayerUsername] = useState<string | null>(null);
  const [blackPlayerUsername, setBlackPlayerUsername] = useState<string | null>(null);
  const [whitePlayerRank, setWhitePlayerRank] = useState<string | null>(null);
  const [blackPlayerRank, setBlackPlayerRank] = useState<string | null>(null);

  useEffect(() => {
    // Initialize chess.js instance from current_position (FEN string)
    if (game.current_position) {
      try {
        const chess = new Chess();
        // Load the current position from the FEN string
        chess.load(game.current_position);
        setChessInstance(chess);
      } catch (err) {
        console.error("Error initializing chess instance:", err);
      }
    }
  }, [game.current_position]);

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
        
        // Update ELO for ranked games that just completed
        if (data.mode === 'ranked' && 
            (data.status === 'completed' || data.status === 'draw' || data.status === 'resigned') &&
            data.white_elo_change === null && 
            data.black_elo_change === null) {
          
          // Call the server action to calculate and update ELO
          const isDraw = data.status === 'draw';
          updateGameResultWithEloAction(gameId, data.winner, isDraw);
        }
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

  // Fetch player usernames and ranks
  useEffect(() => {
    const fetchPlayerUsernames = async () => {
      // Skip if no players assigned yet
      if (!game.white_player && !game.black_player) return;
      
      // Fetch white player username if exists
      if (game.white_player) {
        const { data } = await supabase
          .from('profiles')
          .select('username, rank_tier')
          .eq('id', game.white_player)
          .single();
          
        setWhitePlayerUsername(data?.username || null);
        setWhitePlayerRank(data?.rank_tier || null);
      }
      
      // Fetch black player username if exists
      if (game.black_player) {
        const { data } = await supabase
          .from('profiles')
          .select('username, rank_tier')
          .eq('id', game.black_player)
          .single();
          
        setBlackPlayerUsername(data?.username || null);
        setBlackPlayerRank(data?.rank_tier || null);
      }
    };
    
    fetchPlayerUsernames();
  }, [game.white_player, game.black_player, supabase]);

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

  // Clean implementation for rematch functionality
  const handleRematch = async () => {
    try {
      console.log("Creating rematch game...");
      
      // Create a clean game object matching exactly your schema
      const rematchGameData = {
        white_player: game.black_player, // Swap colors
        black_player: game.white_player, // Swap colors
        status: 'active' as const,
        turn: 'w' as const, // White always starts
        current_position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        white_conversion_done: false,
        black_conversion_done: false,
        last_conversion: null,
        winner: null,
        mode: game.mode, // Preserve the game mode from the original game
      };
      
      console.log("Rematch game data:", rematchGameData);
      
      const { data, error } = await supabase
        .from('games')
        .insert(rematchGameData)
        .select();

      if (error) {
        console.error('Failed to create rematch:', error);
        return;
      }

      // Navigate to the new game
      if (data && data[0] && data[0].id) {
        console.log("Rematch created, navigating to:", data[0].id);
        router.push(`/game/${data[0].id}`);
      } else {
        console.error("No valid game data returned");
      }
    } catch (error) {
      console.error('Rematch creation error:', error);
    }
  };

  const playerRole = getPlayerRole();
  const canJoin =
    game.status === 'waiting' &&
    ((game.white_player === null && game.black_player !== userId) ||
      (game.black_player === null && game.white_player !== userId));

  // Determine connection status for display
  const isConnected = subscriptionStatus === 'SUBSCRIBED';
  
  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return "default";
      case 'completed':
        return "outline";
      case 'waiting':
        return "secondary";
      case 'resigned':
        return "destructive";
      case 'draw':
        return "outline";
      default:
        return "default";
    }
  };

  // Helper function to format status text
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Check if game is over
  const isGameOver = game.status === 'completed' || game.status === 'resigned' || game.status === 'draw';
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Game Information</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="ml-2">
                {isConnected ? "Connected" : "Reconnecting..."}
              </Badge>
              {game.mode && (
                <Badge variant={game.mode === 'ranked' ? "default" : "outline"} className="ml-2">
                  {game.mode === 'ranked' ? 'Ranked' : 'Casual'}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="font-medium">
                <Badge variant={getStatusBadgeVariant(game.status)}>
                  {formatStatus(game.status)}
                </Badge>
              </div>
            </div>
            {game.status === 'active' && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Turn</p>
                <div className="font-medium">
                  <Badge variant={game.turn === 'w' ? "default" : "secondary"}>
                    {game.turn === 'w' ? 'White' : 'Black'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          
          {/* Player information with usernames and ranks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">White Player</p>
              <div className="font-medium">
                {game.white_player ? (
                  game.white_player === userId ? (
                    <div className="flex items-center gap-2">
                      <span>You ({whitePlayerUsername || '...'})</span>
                      {whitePlayerRank && game.mode === 'ranked' && (
                        <Badge variant="outline" className="text-xs">{whitePlayerRank}</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{whitePlayerUsername || 'Opponent'}</span>
                      {whitePlayerRank && game.mode === 'ranked' && (
                        <Badge variant="outline" className="text-xs">{whitePlayerRank}</Badge>
                      )}
                    </div>
                  )
                ) : (
                  'Waiting...'
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Black Player</p>
              <div className="font-medium">
                {game.black_player ? (
                  game.black_player === userId ? (
                    <div className="flex items-center gap-2">
                      <span>You ({blackPlayerUsername || '...'})</span>
                      {blackPlayerRank && game.mode === 'ranked' && (
                        <Badge variant="outline" className="text-xs">{blackPlayerRank}</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{blackPlayerUsername || 'Opponent'}</span>
                      {blackPlayerRank && game.mode === 'ranked' && (
                        <Badge variant="outline" className="text-xs">{blackPlayerRank}</Badge>
                      )}
                    </div>
                  )
                ) : (
                  'Waiting...'
                )}
              </div>
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

      {/* Use the GameOverMessage component when the game is over */}
      {isGameOver && chessInstance && (
        <GameOverMessage
          game={chessInstance}
          gameData={game}
          currentUserId={userId}
          onRematch={handleRematch}
          gameEndTime={game.end_time ?? game.updated_at}
        />
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