'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MoveHistory from './MoveHistory';
import { GameInfoProps } from '@//lib/types/Chess';

export function GameInfo({
  gameData,
  moveHistory,
  whiteCapturedCount,
  blackCapturedCount,
  whiteConversionDone,
  blackConversionDone,
  lastConversionMessage,
}: GameInfoProps) {
  return (
    <Card className="bg-accent/20">
      <CardHeader>
        <CardTitle>Game Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversion alert */}
        {lastConversionMessage && (
          <Alert 
            variant="default" 
            className="bg-yellow-50 dark:bg-yellow-900 border-yellow-500 dark:border-yellow-700 animate-pulse"
          >
            <AlertDescription className="font-medium text-yellow-800 dark:text-yellow-200">
              {lastConversionMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Captured pieces */}
        <div>
          <h3 className="font-medium mb-2">Captured Pieces</h3>
          <div className="flex justify-between text-sm">
            <div>
              <div className="font-medium text-white bg-gray-800 dark:bg-gray-700 px-2 py-1 rounded mb-1">
                White
              </div>
              <div className="text-lg">{whiteCapturedCount}/16</div>
              {whiteCapturedCount >= 8 && (
                <div
                  className={`text-xs mt-1 ${
                    whiteConversionDone
                      ? 'text-muted-foreground'
                      : 'text-green-600 dark:text-green-500 font-medium animate-pulse'
                  }`}
                >
                  {whiteConversionDone
                    ? 'Conversion used'
                    : 'Conversion available!'}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-white bg-gray-800 dark:bg-gray-700 px-2 py-1 rounded mb-1">
                Black
              </div>
              <div className="text-lg">{blackCapturedCount}/16</div>
              {blackCapturedCount >= 8 && (
                <div
                  className={`text-xs mt-1 ${
                    blackConversionDone
                      ? 'text-muted-foreground'
                      : 'text-green-600 dark:text-green-500 font-medium animate-pulse'
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

        {/* Special rule explanation with highlight if conversion available */}
        <Card 
          className={`bg-primary/10 border-primary/20 ${
            (whiteCapturedCount >= 8 && !whiteConversionDone) || 
            (blackCapturedCount >= 8 && !blackConversionDone)
              ? 'border-green-500 dark:border-green-700'
              : ''
          }`}
        >
          <CardContent className="p-3 text-sm">
            <h3 className="font-medium mb-1 text-primary">Special Rules</h3>
            <p>
              When a player loses 8 pieces, they can convert one random enemy
              piece to their side (excluding the king). Each player can only do
              this once per game.
            </p>
          </CardContent>
        </Card>

        {/* Move history */}
        <div>
          <h3 className="font-medium mb-2">Move History</h3>
          {gameData.id && <MoveHistory gameId={gameData.id} />}
        </div>
      </CardContent>
    </Card>
  );
}