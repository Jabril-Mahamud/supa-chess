'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import { createClient } from '@/utils/supabase/client';
import { Square, Piece } from 'react-chessboard/dist/chessboard/types';
import { 
  PlayerColor, 
  GameData, 
  ConversionData,
  ChessMoveHistory
} from '@/lib/types/Chess';

export function useChessGame(gameId: string, userId: string, playerColor?: 'w' | 'b') {
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
  
  // Refs to track game state and subscription status
  const currentFen = useRef<string>('');
  const lastUpdateTime = useRef<number>(Date.now());
  const isUpdating = useRef<boolean>(false);
  const gameChannel = useRef<any>(null);
  const moveChannel = useRef<any>(null);
  const autoSyncTimer = useRef<any>(null);

  // Calculate if it's player's turn
  const isPlayerTurn = useMemo(() => {
    return playerColor && gameData?.turn === playerColor;
  }, [playerColor, gameData]);

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

  // Handle making a move
  const handleMove = (sourceSquare: Square, targetSquare: Square, piece: Piece) => {
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
        
        // Create checkmate notification
        setNotification(`♚ CHECKMATE! ${losingColor === 'w' ? 'Black' : 'White'} wins the game! ♚`);
      } else if (gameInstance.isDraw()) {
        newStatus = 'draw';
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
          end_time: newStatus !== 'active' ? new Date().toLocaleTimeString() : null,
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

  // Function to handle skipping a turn
  const handleSkipTurn = async () => {
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

  // Function to handle resigning
  const handleResign = async () => {
    if (!confirm('Are you sure you want to resign?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('games')
        .update({
          status: 'resigned',
          winner:
            gameData.white_player === userId
              ? gameData.black_player
              : gameData.white_player,
          updated_at: new Date().toISOString(),
          end_time: new Date().toLocaleTimeString(),
        })
        .eq('id', gameId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resigning:', error);
      setNotification('Failed to resign. Please try again.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Format the piece type for display
  const formatPieceType = (type: string) => {
    switch (type) {
      case 'p': return 'Pawn';
      case 'r': return 'Rook';
      case 'n': return 'Knight';
      case 'b': return 'Bishop';
      case 'q': return 'Queen';
      case 'k': return 'King';
      default: return type;
    }
  };

  // Custom square styles for highlighting checkmate
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    if (checkmateHighlight) {
      try {
        const { kingSquare, attackingSquares } = JSON.parse(checkmateHighlight);
        
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

  return {
    game,
    gameData,
    loading,
    notification,
    moveHistory,
    lastMoveTime,
    isPlayerTurn,
    customSquareStyles,
    handleMove,
    handleSkipTurn,
    handleResign,
    whiteCapturedCount,
    blackCapturedCount,
    whiteConversionDone,
    blackConversionDone,
  };
}