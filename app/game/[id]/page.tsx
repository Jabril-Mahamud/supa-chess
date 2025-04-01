import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import GameClient from './game-client';
import { GameData } from '@/lib/types/Chess';
import { Button } from '@/components/ui/button';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';

interface GamePageParams {
  params: {
    id: string;
  };
}

export default async function GamePage({ params }: GamePageParams) {
  const { id } = params;
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return redirect('/sign-in');
  }
  
  // Fetch the game data
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();
    
  if (gameError || !gameData) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Game Not Found</CardTitle>
            <CardDescription>
              Sorry, the game you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="default">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Cast the game data to our type
  const game = gameData as GameData;

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chess Game</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
      
      <GameClient 
        gameId={id} 
        game={game} 
        userId={user.id} 
      />
    </div>
  );
}