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
      "Email and password are required"
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
      "Thanks for signing up! Please check your email for a verification link."
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
      "Could not reset password"
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
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
      "Password and confirm password are required"
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match"
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed"
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
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
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
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }
  if (data.url) {
    redirect(data.url);
  }
};

// Updated joinMatchmakingAction function for app/actions.ts
export const joinMatchmakingAction = async (
  formData: FormData,
  mode: "casual" | "ranked",
  userId: string,
  eloRating?: number
) => {
  const supabase = await createClient();

  try {
    console.log(
      `[Matchmaking] User ${userId} attempting to join ${mode} queue`
    );

    // First, check if the user is already in an active queue
    const { data: existingQueue, error: existingError } = await supabase
      .from("matchmaking")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (existingError) {
      console.error("Error checking existing queue:", existingError);
      return null;
    }

    if (existingQueue && existingQueue.length > 0) {
      console.log(
        `[Matchmaking] User already in queue: ${existingQueue[0].id}`
      );

      // Check if a game has already been created for them
      const { data: existingGames } = await supabase
        .from("games")
        .select("id, created_at")
        .or(`white_player.eq.${userId},black_player.eq.${userId}`)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingGames && existingGames.length > 0) {
        console.log(
          `[Matchmaking] User has active game: ${existingGames[0].id}`
        );

        // Update the matchmaking entry with the game ID if not already set
        if (!existingQueue[0].game_id) {
          await supabase
            .from("matchmaking")
            .update({
              is_active: false,
              matched_at: new Date().toISOString(),
              game_id: existingGames[0].id,
            })
            .eq("id", existingQueue[0].id);
        }

        // Return with a game_id so client can redirect
        return { ...existingQueue[0], game_id: existingGames[0].id };
      }

      // Otherwise, return the existing queue entry
      return existingQueue[0];
    }

    console.log(`[Matchmaking] Creating new queue entry for user ${userId}`);

    // Not in queue, create a new entry
    const { data, error } = await supabase
      .from("matchmaking")
      .insert({
        user_id: userId,
        mode: mode,
        elo_rating: mode === "ranked" ? eloRating : null,
        region: "global",
        is_active: true,
        joined_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("Error joining matchmaking:", error);
      return null;
    }

    // After adding to queue, check if there's a match
    if (data && data.length > 0) {
      const currentPlayerMatchmakingId = data[0].id;
      console.log(
        `[Matchmaking] Queue entry created: ${currentPlayerMatchmakingId}`
      );

      // For simplicity, let's just find another player in the queue
      const { data: opponents, error: opponentsError } = await supabase
        .from("matchmaking")
        .select("*")
        .eq("mode", mode)
        .eq("is_active", true)
        .neq("user_id", userId)
        .limit(1);

      if (opponentsError) {
        console.error("Error finding opponent:", opponentsError);
        return data[0];
      }

      if (opponents && opponents.length > 0) {
        const opponent = opponents[0];
        const opponentMatchmakingId = opponent.id;

        console.log(
          `[Matchmaking] Found opponent: ${opponent.user_id} (entry: ${opponentMatchmakingId})`
        );

        // Found a match! Create a game
        const isWhite = Math.random() > 0.5; // Random side assignment
        const timestamp = new Date().toISOString();

        // Create game data object
        const newGameData: any = {
          white_player: isWhite ? userId : opponent.user_id,
          black_player: isWhite ? opponent.user_id : userId,
          status: "active",
          turn: "w",
          current_position:
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          mode: mode,
          white_conversion_done: false,
          black_conversion_done: false,
          created_at: timestamp,
          updated_at: timestamp,
        };

        // Add ELO tracking for ranked games
        if (mode === "ranked") {
          newGameData.initial_white_elo = isWhite
            ? eloRating
            : opponent.elo_rating;
          newGameData.initial_black_elo = isWhite
            ? opponent.elo_rating
            : eloRating;
        }

        // Create the game
        const { data: createdGame, error: gameError } = await supabase
          .from("games")
          .insert(newGameData)
          .select();

        if (gameError) {
          console.error("Error creating game:", gameError);
          return data[0];
        }

        if (!createdGame || createdGame.length === 0) {
          console.error("Game was not created properly");
          return data[0];
        }

        const gameId = createdGame[0].id;
        console.log(`[Matchmaking] Created game: ${gameId}`);

        // Important: Update the matchmaking entries with retries to ensure they get updated
        const updateMatchmaking = async (
          id: string,
          retries = 3
        ): Promise<boolean> => {
          try {
            const { error } = await supabase
              .from("matchmaking")
              .update({
                is_active: false,
                matched_at: timestamp,
                game_id: gameId,
              })
              .eq("id", id);

            if (error) {
              console.error(`Error updating matchmaking ${id}:`, error);
              if (retries > 0) {
                console.log(
                  `Retrying update for ${id}, ${retries} attempts left`
                );
                return await updateMatchmaking(id, retries - 1);
              }
              return false;
            }

            return true;
          } catch (err) {
            console.error(`Exception updating matchmaking ${id}:`, err);
            if (retries > 0) {
              return await updateMatchmaking(id, retries - 1);
            }
            return false;
          }
        };

        // Update both entries - first the current player
        const currentPlayerUpdate = await updateMatchmaking(
          currentPlayerMatchmakingId
        );

        // Then the opponent
        const opponentUpdate = await updateMatchmaking(opponentMatchmakingId);

        console.log(
          `[Matchmaking] Updated matchmaking entries: current=${currentPlayerUpdate}, opponent=${opponentUpdate}`
        );

        // Return with the game ID for immediate redirect
        return { ...data[0], game_id: gameId };
      }

      return data[0];
    }

    return null;
  } catch (error) {
    console.error("Matchmaking error:", error);
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
      .from("matchmaking")
      .update({ is_active: false })
      .eq("id", matchmakingId);

    if (error) {
      console.error("Error canceling matchmaking:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Cancel matchmaking error:", error);
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
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Error fetching game for ELO update:", gameError);
      return;
    }

    // Only update ELO for ranked games
    if (game.mode !== "ranked") return;

    const whitePlayerId = game.white_player;
    const blackPlayerId = game.black_player;

    if (!whitePlayerId || !blackPlayerId) return;

    // Get player profiles to get current ELO
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, elo_rating, is_placement, placement_games_played")
      .in("id", [whitePlayerId, blackPlayerId]);

    if (profilesError || !profiles || profiles.length !== 2) {
      console.error("Error fetching profiles for ELO update:", profilesError);
      return;
    }

    // Find white and black player profiles
    const whiteProfile = profiles.find((p) => p.id === whitePlayerId);
    const blackProfile = profiles.find((p) => p.id === blackPlayerId);

    if (!whiteProfile || !blackProfile) return;

    // Determine the result
    let whiteResult: "win" | "loss" | "draw";
    let blackResult: "win" | "loss" | "draw";

    if (isDraw) {
      whiteResult = "draw";
      blackResult = "draw";
    } else if (winnerId === whitePlayerId) {
      whiteResult = "win";
      blackResult = "loss";
    } else {
      whiteResult = "loss";
      blackResult = "win";
    }

    // Calculate ELO changes
    const { newRatingWhite, newRatingBlack, whiteChange, blackChange } =
      calculateEloChange(
        whiteProfile.elo_rating,
        blackProfile.elo_rating,
        whiteResult,
        whiteProfile.is_placement,
        blackProfile.is_placement
      );

    // Update game with ELO changes
    await supabase
      .from("games")
      .update({
        white_elo_change: whiteChange,
        black_elo_change: blackChange,
      })
      .eq("id", gameId);

    // Update player profiles with new ELO
    await supabase
      .from("profiles")
      .update({
        elo_rating: newRatingWhite,
        is_placement:
          whiteProfile.is_placement && whiteProfile.placement_games_played < 9,
        placement_games_played: whiteProfile.is_placement
          ? whiteProfile.placement_games_played + 1
          : whiteProfile.placement_games_played,
      })
      .eq("id", whitePlayerId);

    await supabase
      .from("profiles")
      .update({
        elo_rating: newRatingBlack,
        is_placement:
          blackProfile.is_placement && blackProfile.placement_games_played < 9,
        placement_games_played: blackProfile.is_placement
          ? blackProfile.placement_games_played + 1
          : blackProfile.placement_games_played,
      })
      .eq("id", blackPlayerId);
  } catch (error) {
    console.error("Error updating ELO:", error);
  }
};
