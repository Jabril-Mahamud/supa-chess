'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function MoveHistory({ gameId }: { gameId: string }) {
  const supabase = createClient();
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    const fetchMoves = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching moves for game:", gameId);
       
        // First try with the join to get user emails
        const { data, error } = await supabase
          .from('moves')
          .select('id, move_notation, created_at, game_id, user_id')
          .eq('game_id', gameId)
          .order('created_at', { ascending: true });
         
        if (error) {
          console.error('Error fetching moves:', error);
          setError(`Error loading moves: ${error.message}`);
          throw error;
        }
       
        console.log(`Successfully loaded ${data?.length || 0} moves`);
        setMoves(data || []);
      } catch (err) {
        console.error('Error in fetchMoves:', err);
        // Don't set error state again if already set
        if (!error) {
          setError('Failed to load move history');
        }
      } finally {
        setLoading(false);
      }
    };
   
    fetchMoves();
   
    // Set up real-time subscription for new moves
    const channel = supabase
      .channel(`moves-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moves',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        console.log("New move received:", payload.new);
        setMoves((prev) => [...prev, payload.new]);
      })
      .subscribe();
     
    return () => {
      console.log("Cleaning up move history subscription");
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);
 
  if (loading) {
    return <div className="p-4 text-center">Loading move history...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }
 
  if (moves.length === 0) {
    return <div className="p-4 text-center text-gray-500">No moves yet.</div>;
  }
 
  // Group moves by pair (white and black)
  const movesByPair = [];
  for (let i = 0; i < moves.length; i += 2) {
    movesByPair.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
    });
  }
 
  return (
    <div className="overflow-y-auto max-h-96 border rounded p-4">
      <h2 className="text-lg font-semibold mb-2">Move History</h2>
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">White</th>
            <th className="text-left p-2">Black</th>
          </tr>
        </thead>
        <tbody>
          {movesByPair.map((pair) => (
            <tr key={pair.number} className="border-t hover:bg-gray-50">
              <td className="p-2">{pair.number}.</td>
              <td className="p-2 font-mono">{pair.white?.move_notation}</td>
              <td className="p-2 font-mono">{pair.black?.move_notation || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}