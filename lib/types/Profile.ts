// lib/types/Profile.ts
export interface Profile {
  ranked_games_played: number;
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  
  // Statistics
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  best_streak: number;
  win_rate: number;
  
  // New ELO-related fields
  elo_rating?: number;
  highest_elo?: number;
  rank_tier?: string;
  is_placement?: boolean;
  placement_games_played?: number;
}

export interface ProfileWithGames extends Profile {
  recent_games: RecentGame[];
}

export interface RecentGame {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'waiting' | 'active' | 'completed' | 'draw' | 'resigned';
  winner: string | null;
  white_player: string | null;
  black_player: string | null;
  opponent_username?: string;
  result: 'win' | 'loss' | 'draw';
  player_color?: 'white' | 'black';
  mode?: 'casual' | 'ranked';
  elo_change?: number;
}