"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { calculateEloChange } from "@/lib/types/Elo";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};


export const discordSignInAction = async () => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${origin}/auth/callback`
    }
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
};

export const googleSignInAction = async () => {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`
    }
  });
  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }
  if (data.url) {
    redirect(data.url);
  }
};

// Matchmaking actions
export const joinMatchmakingAction = async (
  formData: FormData,
  mode: 'casual' | 'ranked',
  userId: string,
  eloRating?: number
) => {
  const supabase = await createClient();
  
  try {
    // First, check if the user is already in an active queue
    const { data: existingQueue, error: existingError } = await supabase
      .from('matchmaking')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
      
    if (existingError) {
      console.error('Error checking existing queue:', existingError);
      return null;
    }
    
    if (existingQueue && existingQueue.length > 0) {
      // User is already in queue, return that entry
      return existingQueue[0];
    }
    
    // Not in queue, create a new entry
    const { data, error } = await supabase
      .from('matchmaking')
      .insert({
        user_id: userId,
        mode: mode,
        elo_rating: mode === 'ranked' ? eloRating : null,
        region: 'global',
        is_active: true,
        joined_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error('Error joining matchmaking:', error);
      return null;
    }
    
    // After adding to queue, check if there's a match
    if (data && data.length > 0) {
      const matchmakingId = data[0].id;
      
      // For simplicity, let's just find another player in the queue
      // In a real system, you'd have more complex matching logic
      const { data: opponents, error: opponentsError } = await supabase
        .from('matchmaking')
        .select('*')
        .eq('mode', mode)
        .eq('is_active', true)
        .neq('user_id', userId)
        .limit(1);
        
      if (opponentsError) {
        console.error('Error finding opponent:', opponentsError);
        return data[0];
      }
      
      if (opponents && opponents.length > 0) {
        const opponent = opponents[0];
        
        // Found a match! Create a game
        const isWhite = Math.random() > 0.5; // Random side assignment
        
        const gameData: any = {
          white_player: isWhite ? userId : opponent.user_id,
          black_player: isWhite ? opponent.user_id : userId,
          status: 'active',
          turn: 'w',
          current_position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          mode: mode,
          matchmaking_id: matchmakingId,
          white_conversion_done: false,
          black_conversion_done: false
        };
        
        // Add ELO tracking for ranked games
        if (mode === 'ranked') {
          gameData.initial_white_elo = isWhite ? eloRating : opponent.elo_rating;
          gameData.initial_black_elo = isWhite ? opponent.elo_rating : eloRating;
        }
        
        // Create the game
        const { error: gameError } = await supabase
          .from('games')
          .insert(gameData);
          
        if (gameError) {
          console.error('Error creating game:', gameError);
        }
      }
      
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Matchmaking error:', error);
    return null;
  }
};

export const cancelMatchmakingAction = async (
  formData: FormData,
  matchmakingId: string
) => {
  const supabase = await createClient();
  
  try {
    const { error } = await supabase
      .from('matchmaking')
      .update({ is_active: false })
      .eq('id', matchmakingId);
      
    if (error) {
      console.error('Error canceling matchmaking:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Cancel matchmaking error:', error);
    return false;
  }
};

export const updateGameResultWithEloAction = async (
  gameId: string,
  winnerId: string | null,
  isDraw: boolean = false
) => {
  const supabase = await createClient();
  
  try {
    // First get the game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
      
    if (gameError || !game) {
      console.error('Error fetching game for ELO update:', gameError);
      return;
    }
    
    // Only update ELO for ranked games
    if (game.mode !== 'ranked') return;
    
    const whitePlayerId = game.white_player;
    const blackPlayerId = game.black_player;
    
    if (!whitePlayerId || !blackPlayerId) return;
    
    // Get player profiles to get current ELO
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, elo_rating, is_placement, placement_games_played')
      .in('id', [whitePlayerId, blackPlayerId]);
      
    if (profilesError || !profiles || profiles.length !== 2) {
      console.error('Error fetching profiles for ELO update:', profilesError);
      return;
    }
    
    // Find white and black player profiles
    const whiteProfile = profiles.find(p => p.id === whitePlayerId);
    const blackProfile = profiles.find(p => p.id === blackPlayerId);
    
    if (!whiteProfile || !blackProfile) return;
    
    // Determine the result
    let whiteResult: 'win' | 'loss' | 'draw';
    let blackResult: 'win' | 'loss' | 'draw';
    
    if (isDraw) {
      whiteResult = 'draw';
      blackResult = 'draw';
    } else if (winnerId === whitePlayerId) {
      whiteResult = 'win';
      blackResult = 'loss';
    } else {
      whiteResult = 'loss';
      blackResult = 'win';
    }
    
    // Calculate ELO changes
    const {
      newRatingWhite,
      newRatingBlack,
      whiteChange,
      blackChange
    } = calculateEloChange(
      whiteProfile.elo_rating,
      blackProfile.elo_rating,
      whiteResult,
      whiteProfile.is_placement,
      blackProfile.is_placement
    );
    
    // Update game with ELO changes
    await supabase
      .from('games')
      .update({
        white_elo_change: whiteChange,
        black_elo_change: blackChange
      })
      .eq('id', gameId);
    
    // Update player profiles with new ELO
    await supabase
      .from('profiles')
      .update({
        elo_rating: newRatingWhite,
        is_placement: whiteProfile.is_placement && whiteProfile.placement_games_played < 9,
        placement_games_played: whiteProfile.is_placement 
          ? whiteProfile.placement_games_played + 1 
          : whiteProfile.placement_games_played
      })
      .eq('id', whitePlayerId);
      
    await supabase
      .from('profiles')
      .update({
        elo_rating: newRatingBlack,
        is_placement: blackProfile.is_placement && blackProfile.placement_games_played < 9,
        placement_games_played: blackProfile.is_placement 
          ? blackProfile.placement_games_played + 1 
          : blackProfile.placement_games_played
      })
      .eq('id', blackPlayerId);
  } catch (error) {
    console.error('Error updating ELO:', error);
  }
};