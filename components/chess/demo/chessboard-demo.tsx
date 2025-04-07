'use client'
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useState, useEffect, useCallback } from "react";
import { Move } from "chess.js";

type DemoStage = 'initial' | 'domination' | 'conversion' | 'comeback';

export default function ChessboardDemo() {
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.fen());
  const [piecesCaptured, setPiecesCaptured] = useState(0);
  const [demoStage, setDemoStage] = useState<DemoStage>('initial');
  const [attackingColor, setAttackingColor] = useState<'w' | 'b'>('w');
  const [convertedPiece, setConvertedPiece] = useState<{ type: string, square: string } | null>(null);
  const [highlightedSquare, setHighlightedSquare] = useState<string | null>(null);

  const makeStrategicMove = useCallback(() => {
    const possibleMoves = chess.moves({ verbose: true }) as Move[];

    // Filter moves that capture opponent's pieces based on attacking color
    const captureMoves = possibleMoves.filter(move =>
      move.captured &&
      move.color === attackingColor &&
      move.piece !== 'p'
    );

    let moveToMake: Move | undefined;
    if (captureMoves.length > 0) {
      // Prefer capturing high-value pieces
      const priorityPieces = ['q', 'r', 'b', 'n'];
      moveToMake = captureMoves.find(move =>
        priorityPieces.includes(move.captured ?? '')
      ) || captureMoves[0];
    } else {
      // Fallback to aggressive moves
      const aggressiveMoves = possibleMoves.filter(move =>
        move.color === attackingColor
      );
      moveToMake = aggressiveMoves.length > 0
        ? aggressiveMoves[0]
        : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    if (moveToMake) {
      chess.move(moveToMake);

      // Track pieces captured
      if (moveToMake.captured) {
        setPiecesCaptured(prev => {
          const newCapturedCount = prev + 1;
          if (newCapturedCount >= 8) {
            setDemoStage('conversion');
          }
          return newCapturedCount;
        });
      }

      setBoardPosition(chess.fen());
    }
  }, [chess, attackingColor]);

  const demonstrateConversion = useCallback(() => {
    // Check if conversion is possible (king not in check)
    if (chess.inCheck()) {
      return;
    }

    // Find a piece to convert from the attacking side
    const board = chess.board();
    const conversionPieces = ['Q', 'R', 'B', 'N'];
    let conversionPiece = null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece &&
            piece.color === attackingColor &&
            conversionPieces.includes(piece.type.toUpperCase())) {
          conversionPiece = { row, col, piece };
          break;
        }
      }
      if (conversionPiece) break;
    }

    if (conversionPiece) {
      // Simulate conversion by changing the piece color in the FEN string
      const newFen = chess.fen().split(' ');
      const boardState = newFen[0].split('/');

      const pieceSymbol = conversionPiece.piece.type.toUpperCase();
      const convertedPieceSymbol = pieceSymbol.toLowerCase();

      boardState[7 - conversionPiece.row] = boardState[7 - conversionPiece.row]
        .replace(pieceSymbol, convertedPieceSymbol);

      newFen[0] = boardState.join('/');
      chess.load(newFen.join(' '));
      setBoardPosition(chess.fen());

      // Determine the square notation for the converted piece
      const convertedSquare = `${String.fromCharCode(97 + conversionPiece.col)}${8 - conversionPiece.row}`;
      setConvertedPiece({
        type: conversionPiece.piece.type,
        square: convertedSquare
      });
      setHighlightedSquare(convertedSquare);

      setDemoStage('comeback');
    }
  }, [chess, attackingColor]);

  const demonstrateComebackMoves = useCallback(() => {
    const possibleMoves = chess.moves({ verbose: true }) as Move[];

    // Prioritize moves that lead to checkmate or significant advantage
    const checkmateMove = possibleMoves.find(move => move.san.includes('#'));

    if (checkmateMove) {
      chess.move(checkmateMove);
    } else {
      // If no checkmate, just make a strong move
      const strongMoves = possibleMoves.filter(move =>
        move.captured || move.promotion
      );

      const moveToMake = strongMoves.length > 0
        ? strongMoves[0]
        : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

      chess.move(moveToMake);
    }

    setBoardPosition(chess.fen());
  }, [chess]);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    const startDomination = setTimeout(() => {
      setDemoStage('domination');
    }, 2000);

    const dominationInterval = setInterval(() => {
      if (demoStage === 'domination') {
        makeStrategicMove();
      }
    }, 1200);

    const conversionTimeout = setTimeout(() => {
      if (demoStage === 'domination' && piecesCaptured >= 8) {
        demonstrateConversion();
      }
    }, 12000);

    const comebackInterval = setInterval(() => {
      if (demoStage === 'comeback') {
        demonstrateComebackMoves();
      }
    }, 1500);

    intervals.push(startDomination, dominationInterval, conversionTimeout, comebackInterval);

    return () => {
      intervals.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [
    demoStage,
    makeStrategicMove,
    demonstrateConversion,
    demonstrateComebackMoves,
    piecesCaptured
  ]);

  // Define custom square styles: highlight the converted piece square in green.
  const customSquareStyles = highlightedSquare ? {
    [highlightedSquare]: { backgroundColor: '#4CAF50' } // Green highlight
  } : {};

  return (
    <div className="w-full max-w-[320px] aspect-square flex items-center justify-center relative">
      <Chessboard 
        position={boardPosition}
        boardWidth={320}
        customSquareStyles={customSquareStyles}
        arePiecesDraggable={false}
      />
      {demoStage === 'conversion' && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-blue-100 p-4 rounded-lg shadow-lg text-center">
          {chess.inCheck() 
            ? "Conversion not possible: King is in check!" 
            : `8 pieces lost! Conversion activated: ${convertedPiece?.type.toUpperCase()} converted on ${convertedPiece?.square}`}
        </div>
      )}
      {highlightedSquare && demoStage === 'comeback' && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-green-100 p-4 rounded-lg shadow-lg text-center">
          Converted {convertedPiece?.type.toUpperCase()} on {convertedPiece?.square} helps turn the game around!
        </div>
      )}
    </div>
  );
}
