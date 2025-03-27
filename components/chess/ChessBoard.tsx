'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { createClient } from '@/utils/supabase/client';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';

export default function ChessBoard({
  gameId,
  userId,
  playerColor,
}: {
  gameId: string;
  userId: string;
  playerColor?: 'w' | 'b';
}) {
  const supabase = createClient();
  const [game, setGame] = useState<any>(new Chess());
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whiteCapturedCount, setWhiteCapturedCount] = useState(0);
  const [blackCapturedCount, setBlackCapturedCount] = useState(0);
  const [whiteConversionDone, setWhiteConversionDone] = useState(false);
  const [blackConversionDone, setBlackConversionDone] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [lastMoveTime, setLastMoveTime] = useState<string | null>(null);
  const [checkmateHighlight, setCheckmateHighlight] = useState<string | null>(null);
  const [gameEndTime, setGameEndTime] = useState<string | null>(null);
  
  // Refs to track game state and subscription status
  const currentFen = useRef<string>('');
  const lastUpdateTime = useRef<number>(Date.now());
  const isUpdating = useRef<boolean>(false);
  const gameChannel = useRef<any>(null);
  const moveChannel = useRef<any>(null);
  const autoSyncTimer = useRef<any>(null);

  // Function to count pieces of a color on the board
  const countPieces = (fen: string, color: 'w' | 'b') => {
    const position = fen.split(' ')[0];
    const pattern = color === 'w' ? /[PNBRQK]/g : /[pnbrqk]/g;
    const matches = position.match(pattern);
    return matches ? matches.length : 0;
  };

  // Calculate missing pieces based on initial piece count
  const calculateCapturedPieces = (currentFen: string) => {
    const whitePieces = countPieces(currentFen, 'w');
    const blackPieces = countPieces(currentFen, 'b');
    // Initial piece count is 16 for each side
    const whiteCaptured = 16 - whitePieces;
    const blackCaptured = 16 - blackPieces;

    setWhiteCapturedCount(whiteCaptured);
    setBlackCapturedCount(blackCaptured);

    return { whiteCaptured, blackCaptured };
  };

  // Function to find all pieces of a certain color on the board
  const findPiecesOfColor = (chess: any, color: 'w' | 'b') => {
    const pieces: { square: string; type: string }[] = [];

    // Loop through all squares on the board
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square as any);

        // If square has a piece of the target color and it's not a king
        if (piece && piece.color === color && piece.type !== 'k') {
          pieces.push({ square, type: piece.type });
        }
      }
    }

    return pieces;
  };

  // Function to find the king's position when checkmate occurs
  const findKingPosition = (chess: any, color: 'w' | 'b') => {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square as any);
        if (piece && piece.type === 'k' && piece.color === color) {
          return square;
        }
      }
    }
    return null;
  };

  // Function to find attacking pieces in checkmate
  const findCheckmatingPieces = (chess: any) => {
    const attackingSquares: string[] = [];
    const defendingColor = chess.turn();
    const attackingColor = defendingColor === 'w' ? 'b' : 'w';
    const kingSquare = findKingPosition(chess, defendingColor);
    
    if (!kingSquare) return [];
    
    // Find all attacking pieces
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = chess.get(square as any);
        
        if (piece && piece.color === attackingColor) {
          // Check if this piece is attacking the king
          const moves = chess.moves({
            square: square as any,
            verbose: true
          });
          
          if (moves.some((move: any) => move.to === kingSquare)) {
            attackingSquares.push(square);
          }
        }
      }
    }
    
    return attackingSquares;
  };

  // Function to convert a random enemy piece
  const convertRandomEnemyPiece = (chess: any, playerLosing: 'w' | 'b') => {
    // Determine which color's piece to convert
    const enemyColor = playerLosing === 'w' ? 'b' : 'w';

    // Find all enemy pieces excluding the king
    const enemyPieces = findPiecesOfColor(chess, enemyColor);

    if (enemyPieces.length === 0) {
      console.log('No enemy pieces to convert');
      return null;
    }

    // Select a random enemy piece
    const randomIndex = Math.floor(Math.random() * enemyPieces.length);
    const pieceToConvert = enemyPieces[randomIndex];

    // Remove the piece from its square
    chess.remove(pieceToConvert.square as any);

    // Add the converted piece of the opposite color
    chess.put(
      {
        type: pieceToConvert.type,
        color: playerLosing,
      },
      pieceToConvert.square as any
    );

    return {
      square: pieceToConvert.square,
      type: pieceToConvert.type,
      from: enemyColor,
      to: playerLosing,
    };
  };

  // Enhanced fetch game state with retry logic
  const fetchGameState = async () => {
    // Prevent concurrent updates
    if (isUpdating.current) return;
    
    isUpdating.current = true;
    
    try {
      // Fetch the game data
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;

      // Only update if the position has changed or it's been more than 5 seconds
      const shouldUpdate = 
        data.current_position !== currentFen.current ||
        Date.now() - lastUpdateTime.current > 5000;
        
      if (shouldUpdate) {
        setGameData(data);
        currentFen.current = data.current_position;
        lastUpdateTime.current = Date.now();

        // Initialize the chess instance with the current position
        const chess = new Chess();
        if (
          data.current_position &&
          data.current_position !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        ) {
          chess.load(data.current_position);
        }
        setGame(chess);

        // Calculate captured pieces
        calculateCapturedPieces(chess.fen());

        // Set conversion state from game data
        setWhiteConversionDone(data.white_conversion_done || false);
        setBlackConversionDone(data.black_conversion_done || false);

        // If there's a conversion message, show it
        if (data.last_conversion) {
          setNotification(data.last_conversion);
          // Clear notification after 5 seconds
          setTimeout(() => setNotification(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      isUpdating.current = false;
      setLoading(false);
    }
  };

  // Fetch the move history with optimistic updates
  const fetchMoveHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('moves')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Only update if we have new data
      if (data && (moveHistory.length !== data.length || data.length === 0)) {
        setMoveHistory(data);
        
        // Set the last move time if there are moves
        if (data.length > 0) {
          setLastMoveTime(new Date(data[data.length - 1].created_at).toLocaleTimeString());
        }
      }
    } catch (error) {
      console.error('Error fetching move history:', error);
    }
  };

  // Setup realtime subscriptions and auto-sync
  useEffect(() => {
    // Initial loading of game data
    const initialLoad = async () => {
      await fetchGameState();
      await fetchMoveHistory();
    };
    
    initialLoad();

    // Set up realtime subscription for game updates
    gameChannel.current = supabase
      .channel(`game-${gameId}-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game update received via realtime:', payload.new);
          
          // If we're already updating, ignore this update to prevent conflicts
          if (!isUpdating.current) {
            fetchGameState();
          }
        }
      )
      .subscribe((status) => {
        console.log(`Game channel status: ${status}`);
        
        // If subscription failed, fallback to polling more frequently
        if (status !== 'SUBSCRIBED') {
          console.warn('Realtime subscription failed, using polling fallback');
        }
      });

    // Set up realtime subscription for move updates
    moveChannel.current = supabase
      .channel(`moves-${gameId}-realtime`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moves',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('New move received via realtime:', payload.new);
          
          // Immediately fetch game state to ensure board is in sync
          fetchGameState();
          fetchMoveHistory();
        }
      )
      .subscribe();

    // Set up auto-sync timer as a backup - checks every 3 seconds
    autoSyncTimer.current = setInterval(() => {
      // Only sync if we're not spectating and it's been more than 3 seconds since last update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
      
      if (timeSinceLastUpdate > 3000 && !isUpdating.current) {
        console.log('Auto-sync: Checking for updates...');
        fetchGameState();
        fetchMoveHistory();
      }
    }, 3000);

    // Cleanup function
    return () => {
      if (gameChannel.current) supabase.removeChannel(gameChannel.current);
      if (moveChannel.current) supabase.removeChannel(moveChannel.current);
      if (autoSyncTimer.current) clearInterval(autoSyncTimer.current);
    };
  }, [gameId, supabase]);

  const onDrop = (sourceSquare: Square, targetSquare: Square, piece: Piece) => {
    console.log(
      `Attempting move from ${sourceSquare} to ${targetSquare}, piece: ${piece}`
    );

    // Don't allow moves if not the player's turn or if spectating
    if (!playerColor || gameData?.turn !== playerColor) {
      console.log('Not your turn or you\'re spectating');
      return false;
    }

    // Don't allow moves if the game is not active
    if (gameData?.status !== 'active') {
      console.log('Game is not active');
      return false;
    }

    // Check if player is moving their own piece
    // The piece format is like "wP" (white pawn) or "bQ" (black queen)
    const pieceColor = piece.charAt(0) as 'w' | 'b';
    if (pieceColor !== playerColor) {
      console.log(
        `Trying to move ${pieceColor} piece but player is ${playerColor}`
      );
      setNotification('You can only move your own pieces!');
      setTimeout(() => setNotification(null), 3000);
      return false;
    }

    try {
      // Make a copy of the game to try the move
      const gameCopy = new Chess(game.fen());

      // Check if there was a piece on the target square (capture)
      const targetPiece = gameCopy.get(targetSquare as any);
      const isCapture = targetPiece !== null;
      
      if (isCapture && targetPiece) {
        console.log(`Attempting to capture ${targetPiece.color}${targetPiece.type} at ${targetSquare}`);
      }

      // Try to make the move
      const move = gameCopy.move({
        from: sourceSquare as string,
        to: targetSquare as string,
        promotion: 'q', // Always promote to queen for simplicity
      });

      // Invalid move
      if (move === null) {
        console.log('Invalid move according to chess rules');
        setNotification('Invalid move');
        setTimeout(() => setNotification(null), 2000);
        return false;
      }

      console.log('Valid move:', move);
      console.log('Move flags:', move.flags);
      console.log('Was capture? ', move.flags.includes('c'));

      // Calculate captured pieces after the move
      const { whiteCaptured, blackCaptured } = calculateCapturedPieces(
        gameCopy.fen()
      );

      // Check if we need to convert a piece
      let conversionData = null;
      let conversionMessage = null;

      // Handle white losing 8+ pieces and conversion hasn't happened yet
      if (whiteCaptured >= 8 && !whiteConversionDone) {
        conversionData = convertRandomEnemyPiece(gameCopy, 'w');
        setWhiteConversionDone(true);
        if (conversionData) {
          conversionMessage = `White converted a ${formatPieceType(
            conversionData.type
          )} at ${conversionData.square}!`;
        }
      }

      // Handle black losing 8+ pieces and conversion hasn't happened yet
      if (blackCaptured >= 8 && !blackConversionDone) {
        conversionData = convertRandomEnemyPiece(gameCopy, 'b');
        setBlackConversionDone(true);
        if (conversionData) {
          conversionMessage = `Black converted a ${formatPieceType(
            conversionData.type
          )} at ${conversionData.square}!`;
        }
      }

      // Update the local game state optimistically
      setGame(gameCopy);
      currentFen.current = gameCopy.fen();
      
      // Save the current state in case we need to revert
      const previousGameState = game;
      const previousGameData = { ...gameData };

      // Handle database updates separately
      handleMoveInDatabase(gameCopy, move, conversionMessage)
        .catch((error) => {
          // If there's an error, revert to previous state
          console.error('Move failed, reverting to previous state');
          setGame(previousGameState);
          setGameData(previousGameData);
          currentFen.current = previousGameState.fen();
          setNotification('Move failed. Please try again.');
          setTimeout(() => setNotification(null), 3000);
        });

      return true;
    } catch (error) {
      console.error('Error processing move:', error);
      setNotification('An error occurred. Please try again.');
      setTimeout(() => setNotification(null), 3000);
      return false;
    }
  };

  // Function to handle the async database operations
  const handleMoveInDatabase = async (
    gameInstance: any,
    move: any,
    conversionMessage: string | null
  ) => {
    try {
      isUpdating.current = true;
      console.log('Updating database with move:', move);

      // Determine if the game is over
      let newStatus = 'active';
      let winner = null;

      if (gameInstance.isCheckmate()) {
        newStatus = 'completed';
        winner =
          playerColor === 'w' ? gameData.white_player : gameData.black_player;
          
        // Get checkmate information for LOCAL visualization only
        const losingColor = gameInstance.turn();
        const kingSquare = findKingPosition(gameInstance, losingColor);
        const attackingSquares = findCheckmatingPieces(gameInstance);
        
        // Store checkmate info in local state (not database)
        setCheckmateHighlight(JSON.stringify({
          kingSquare,
          attackingSquares,
          winningColor: losingColor === 'w' ? 'b' : 'w'
        }));
        setGameEndTime(new Date().toLocaleTimeString());
        
        // Create checkmate notification
        setNotification(`♚ CHECKMATE! ${losingColor === 'w' ? 'Black' : 'White'} wins the game! ♚`);
      } else if (gameInstance.isDraw()) {
        newStatus = 'draw';
        setGameEndTime(new Date().toLocaleTimeString());
        setNotification('Game ended in a draw');
      }

      // Save the move to database - keep only existing fields
      const { error: moveError } = await supabase.from('moves').insert({
        game_id: gameId,
        user_id: userId,
        move_notation: move.san,
        position_after: gameInstance.fen(),
      });

      if (moveError) {
        console.error('Error saving move:', moveError);
        throw moveError;
      }

      // Update the game in database - keep only existing fields
      const { error: gameError } = await supabase
        .from('games')
        .update({
          current_position: gameInstance.fen(),
          turn: gameInstance.turn(),
          status: newStatus,
          winner: winner,
          white_conversion_done: whiteConversionDone || whiteCapturedCount >= 8,
          black_conversion_done: blackConversionDone || blackCapturedCount >= 8,
          last_conversion: conversionMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      if (gameError) {
        console.error('Error updating game:', gameError);
        throw gameError;
      }

      console.log('Database updated successfully');
      lastUpdateTime.current = Date.now();
      
      // Update move history optimistically
      const newMove = {
        id: Date.now().toString(), // Temporary ID
        game_id: gameId,
        user_id: userId,
        move_notation: move.san,
        position_after: gameInstance.fen(),
        created_at: new Date().toISOString(),
      };
      
      setMoveHistory((prev) => [...prev, newMove]);
      setLastMoveTime(new Date().toLocaleTimeString());

      if (conversionMessage && newStatus === 'active') {
        setNotification(conversionMessage);
        // Clear notification after 5 seconds (only for non-checkmate notifications)
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error('Error updating database:', error);
      throw error; // Re-throw to handle in the calling function
    } finally {
      isUpdating.current = false;
    }
  };

  // Function to handle skipping a turn (only for demonstration purposes)
  const handleSkipTurn = async () => {
    // In real chess, you can't skip turns, but for your special variant:
    if (
      !playerColor ||
      gameData.turn !== playerColor ||
      gameData.status !== 'active'
    ) {
      return;
    }

    try {
      isUpdating.current = true;
      // Create a new game instance with the current position
      const gameCopy = new Chess(game.fen());

      // Toggle the turn without making a move
      const newTurn = playerColor === 'w' ? 'b' : 'w';

      // Generate a FEN with the turn toggled
      const fenParts = gameCopy.fen().split(' ');
      fenParts[1] = newTurn;
      const newFen = fenParts.join(' ');

      // Update local state optimistically
      const newGameCopy = new Chess(newFen);
      setGame(newGameCopy);
      currentFen.current = newFen;
      
      // Save the current state in case we need to revert
      const previousGameState = game;
      const previousGameData = { ...gameData };

      try {
        // Update the game state in the database
        const { error } = await supabase
          .from('games')
          .update({
            current_position: newFen,
            turn: newTurn,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gameId);

        if (error) throw error;

        // Add a "skipped turn" entry to moves
        await supabase.from('moves').insert({
          game_id: gameId,
          user_id: userId,
          move_notation: 'Skipped turn',
          position_after: newFen,
        });

        // Update move history optimistically
        const newMove = {
          id: Date.now().toString(),
          game_id: gameId,
          user_id: userId,
          move_notation: 'Skipped turn',
          position_after: newFen,
          created_at: new Date().toISOString(),
        };
        
        setMoveHistory((prev) => [...prev, newMove]);
        setLastMoveTime(new Date().toLocaleTimeString());

        // Set notification
        setNotification(
          `${playerColor === 'w' ? 'White' : 'Black'} skipped their turn`
        );
        setTimeout(() => setNotification(null), 3000);
        
        lastUpdateTime.current = Date.now();
      } catch (error) {
        // Revert to previous state if error
        console.error('Error skipping turn:', error);
        setGame(previousGameState);
        setGameData(previousGameData);
        currentFen.current = previousGameState.fen();
        setNotification('Failed to skip turn. Please try again.');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error in skip turn:', error);
      setNotification('Error skipping turn. Please try again.');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      isUpdating.current = false;
    }
  };

  // Format the piece type for display
  const formatPieceType = (type: string) => {
    switch (type) {
      case 'p':
        return 'Pawn';
      case 'r':
        return 'Rook';
      case 'n':
        return 'Knight';
      case 'b':
        return 'Bishop';
      case 'q':
        return 'Queen';
      case 'k':
        return 'King';
      default:
        return type;
    }
  };

  // Custom square styles for highlighting checkmate
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    if (checkmateHighlight) {
      try {
        const { kingSquare, attackingSquares, winningColor } = JSON.parse(checkmateHighlight);
        
        if (kingSquare) {
          styles[kingSquare] = {
            backgroundColor: 'rgba(255, 0, 0, 0.5)',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 8px 4px rgba(255, 0, 0, 0.6)'
          };
        }
        
        if (attackingSquares && attackingSquares.length > 0) {
          attackingSquares.forEach((square: string) => {
            styles[square] = {
              backgroundColor: 'rgba(255, 215, 0, 0.5)',
              boxShadow: 'inset 0 0 8px 4px rgba(255, 215, 0, 0.6)'
            };
          });
        }
      } catch (e) {
        console.error('Error parsing checkmate highlight data:', e);
      }
    }
    
    return styles;
  }, [checkmateHighlight]);

  // Enhanced Game Over Message Component
  const GameOverMessage = () => {
    if (!game.isGameOver()) return null;
    
    return (
      <div className="mt-6 p-5 bg-gray-800 text-white rounded-lg border-2 border-yellow-500 shadow-lg animate-pulse">
        <h2 className="font-bold text-xl mb-3 text-center">Game Over</h2>
        {game.isCheckmate() && (
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">♚ CHECKMATE! ♚</p>
            <p className="text-lg">{game.turn() === 'w' ? 'Black' : 'White'} wins the game!</p>
            {gameEndTime && (
              <p className="text-sm mt-3 text-gray-300">Game ended at: {gameEndTime}</p>
            )}
          </div>
        )}
        {game.isDraw() && (
          <div className="text-center">
            <p className="text-xl font-bold mb-2">Draw!</p>
            <p className="text-base mb-3">The game ended in a draw.</p>
            <p className="text-sm mt-1 text-gray-300">
              {game.isStalemate() && 
                "Stalemate - the player to move has no legal moves and is not in check."}
              {game.isInsufficientMaterial() && 
                "Insufficient material - neither player has enough pieces to checkmate."}
              {game.isThreefoldRepetition() && 
                "Threefold repetition - the same position has occurred three times."}
              {game.isDraw() && 
                !game.isStalemate() && 
                !game.isInsufficientMaterial() && 
                !game.isThreefoldRepetition() && 
                "50-move rule - 50 moves have been made without a pawn move or capture."}
            </p>
            {gameEndTime && (
              <p className="text-sm mt-3 text-gray-300">Game ended at: {gameEndTime}</p>
            )}
          </div>
        )}
        <div className="mt-4 flex justify-center space-x-4">
          <button 
            onClick={() => window.location.href = '/games'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Games
          </button>
          <button 
            onClick={() => {
              // Here you would add logic to create a rematch game
              // This is just a placeholder
              alert('Rematch functionality would go here');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Rematch
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xl">Loading chess board...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Could not load the game data. Please try refreshing the page.
      </div>
    );
  }

  // Determine if it's the current player's turn
  const isPlayerTurn = playerColor && gameData.turn === playerColor;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {/* Game status and notifications */}
          <div className="mb-4">
            <div
              className={`p-3 rounded-lg font-medium mb-2 ${
                gameData.status === 'active'
                  ? isPlayerTurn
                    ? 'bg-green-100 border border-green-400 text-green-700'
                    : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
                  : 'bg-gray-100 border border-gray-400 text-gray-700'
              }`}
            >
              {gameData.status === 'active' &&
                (isPlayerTurn
                  ? '🎮 Your turn!'
                  : `⏳ Waiting for ${gameData.turn === 'w' ? 'White' : 'Black'}'s move...`)}
              {gameData.status === 'completed' && '🏆 Game over - Checkmate!'}
              {gameData.status === 'draw' && '🤝 Game over - Draw!'}
              {gameData.status === 'resigned' && '🏳️ Game over - Resignation!'}
            </div>

            {notification && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
                {notification}
              </div>
            )}
          </div>

          {/* Chessboard */}
          <div className="mb-4">
            <Chessboard
              id={gameId}
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={playerColor === 'b' ? 'black' : 'white'}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              customSquareStyles={customSquareStyles}
              areArrowsAllowed={true}
            />
          </div>

          {/* Game controls */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-medium">
                {gameData.turn === 'w' ? 'White' : 'Black'}'s turn
              </div>
              {lastMoveTime && (
                <div className="text-sm text-gray-600">
                  Last move at: {lastMoveTime}
                </div>
              )}
            </div>

            <div className="space-x-2">
              {isPlayerTurn && gameData.status === 'active' && (
                <button
                  onClick={handleSkipTurn}
                  className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                >
                  Skip Turn
                </button>
              )}

              {gameData.status === 'active' && (
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to resign?')) {
                      await supabase
                        .from('games')
                        .update({
                          status: 'resigned',
                          winner:
                            gameData.white_player === userId
                              ? gameData.black_player
                              : gameData.white_player,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', gameId);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Resign
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Game info sidebar */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-3">Game Information</h2>

          {/* Captured pieces */}
          <div className="mb-4">
            <h3 className="font-medium mb-1">Captured Pieces</h3>
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium text-white bg-gray-800 px-2 py-1 rounded mb-1">
                  White
                </div>
                <div className="text-lg">{whiteCapturedCount}/16</div>
                {whiteCapturedCount >= 8 && (
                  <div
                    className={`text-xs mt-1 ${
                      whiteConversionDone
                        ? 'text-gray-500'
                        : 'text-green-600 font-medium'
                    }`}
                  >
                    {whiteConversionDone
                      ? 'Conversion used'
                      : 'Conversion available!'}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-white bg-gray-800 px-2 py-1 rounded mb-1">
                  Black
                </div>
                <div className="text-lg">{blackCapturedCount}/16</div>
                {blackCapturedCount >= 8 && (
                  <div
                    className={`text-xs mt-1 ${
                      blackConversionDone
                        ? 'text-gray-500'
                        : 'text-green-600 font-medium'
                    }`}
                  >
                    {blackConversionDone
                      ? 'Conversion used'
                      : 'Conversion available!'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Special rule explanation */}
          <div className="mb-4 bg-blue-50 p-3 rounded-lg text-sm">
            <h3 className="font-medium mb-1 text-blue-700">Special Rules</h3>
            <p>
              When a player loses 8 pieces, they can convert one random enemy
              piece to their side (excluding the king). Each player can only do
              this once per game.
            </p>
          </div>

          {/* Move history */}
          <div>
            <h3 className="font-medium mb-2">Move History</h3>
            <div className="bg-white border rounded max-h-96 overflow-y-auto">
              {moveHistory.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No moves yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Move</th>
                      <th className="p-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moveHistory.map((move, index) => (
                      <tr key={move.id} className="border-t">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2 font-mono">{move.move_notation}</td>
                        <td className="p-2 text-xs">
                          {new Date(move.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Game Over Message */}
      <GameOverMessage />
    </div>
  );
}