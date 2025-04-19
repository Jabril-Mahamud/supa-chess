# Supa Chess Database Documentation

This document provides detailed information about the database structure, relationships, and security policies for the Supa Chess application.

## Database Overview

Supa Chess uses Supabase (PostgreSQL) as its database and relies on several interconnected tables to manage game state, user profiles, matchmaking, and more. The database also implements Row Level Security (RLS) to ensure data security.

## Table Schema

### `games` Table

Stores the core game information including player assignments, board state, and game status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `white_player` | UUID | Reference to white player's user ID |
| `black_player` | UUID | Reference to black player's user ID |
| `current_position` | TEXT | Current board position in FEN notation |
| `turn` | TEXT | Current turn ('w' or 'b') |
| `status` | TEXT | Game status ('waiting', 'active', 'completed', 'draw', 'resigned') |
| `winner` | UUID | Reference to winner's user ID (nullable) |
| `white_conversion_done` | BOOLEAN | Whether white has used their piece conversion |
| `black_conversion_done` | BOOLEAN | Whether black has used their piece conversion |
| `last_conversion` | TEXT | Message about the most recent conversion (nullable) |
| `created_at` | TIMESTAMP | When the game was created |
| `updated_at` | TIMESTAMP | When the game was last updated |
| `end_time` | TIMESTAMP | When the game ended (nullable) |
| `mode` | TEXT | Game mode ('casual' or 'ranked') |
| `initial_white_elo` | INTEGER | Starting ELO rating for white (ranked games) |
| `initial_black_elo` | INTEGER | Starting ELO rating for black (ranked games) |
| `white_elo_change` | INTEGER | ELO change for white player (nullable) |
| `black_elo_change` | INTEGER | ELO change for black player (nullable) |
| `matchmaking_id` | UUID | Reference to matchmaking entry (nullable) |

### `moves` Table

Records each move made in a game for history and replay purposes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `game_id` | UUID | Reference to games table |
| `user_id` | UUID | User who made the move |
| `move_notation` | TEXT | Chess move in SAN notation |
| `position_after` | TEXT | Board position in FEN notation after the move |
| `created_at` | TIMESTAMP | When the move was made |

### `profiles` Table

Stores user profile information and statistics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (matches auth.users.id) |
| `username` | TEXT | User's display name |
| `avatar_url` | TEXT | URL to avatar image (nullable) |
| `created_at` | TIMESTAMP | When profile was created |
| `updated_at` | TIMESTAMP | When profile was last updated |
| `games_played` | INTEGER | Total number of games played |
| `wins` | INTEGER | Number of games won |
| `losses` | INTEGER | Number of games lost |
| `draws` | INTEGER | Number of draws |
| `current_streak` | INTEGER | Current win streak |
| `best_streak` | INTEGER | Best win streak |
| `win_rate` | FLOAT | Win percentage (0-100) |
| `elo_rating` | INTEGER | Current ELO rating |
| `highest_elo` | INTEGER | Highest ELO rating achieved |
| `rank_tier` | TEXT | Rank tier ('Bronze', 'Silver', 'Gold', etc.) |
| `is_placement` | BOOLEAN | Whether user is in placement matches |
| `placement_games_played` | INTEGER | Number of placement games completed |

### `matchmaking` Table

Manages the matchmaking queue for finding game opponents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reference to user ID |
| `mode` | TEXT | Matchmaking mode ('casual' or 'ranked') |
| `elo_rating` | INTEGER | Player's ELO rating (for ranked matching) |
| `joined_at` | TIMESTAMP | When player joined the queue |
| `region` | TEXT | Matchmaking region (default: 'global') |
| `is_active` | BOOLEAN | Whether entry is active or matched |
| `game_id` | UUID | Reference to created game (nullable) |
| `matched_at` | TIMESTAMP | When player was matched (nullable) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### `player_presence` Table

Tracks player online status for presence features.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `game_id` | UUID | Reference to game ID |
| `user_id` | UUID | Reference to user ID |
| `last_active` | TIMESTAMP | When user was last active |
| `status` | TEXT | User status ('online', 'offline', 'away') |
| `created_at` | TIMESTAMP | When presence record was created |
| `updated_at` | TIMESTAMP | When presence record was updated |

## Database Relationships

```text
auth.users (Supabase Auth)
 │
 ├──► profiles
 │     │
 │     └──► matchmaking
 │           │
 └─────┬─────┘
       │
       ▼
     games ◄──── player_presence
       │
       ▼
     moves
```

- Each user has one profile record
- Users can join the matchmaking queue
- Games reference both white and black players
- Moves are linked to games and the user who made them
- Player presence tracks online status in each game

## Row Level Security (RLS) Policies

Supa Chess implements RLS policies to secure data access. Below are the key policies for each table:

### Games Table RLS

```sql
-- Users can view their own games and games they're playing in
CREATE POLICY "Users can view their own games"
  ON games
  FOR SELECT
  USING (
    auth.uid() = white_player OR 
    auth.uid() = black_player OR
    status = 'waiting'
  );

-- Users can insert games they're a part of
CREATE POLICY "Users can create games"
  ON games
  FOR INSERT
  WITH CHECK (
    auth.uid() = white_player OR 
    auth.uid() = black_player
  );

-- Users can update games they're a part of
CREATE POLICY "Users can update games they're playing in"
  ON games
  FOR UPDATE
  USING (
    auth.uid() = white_player OR 
    auth.uid() = black_player
  );
```

### Moves Table RLS

```sql
-- Anyone can view moves for games they can view
CREATE POLICY "Users can view moves for their games"
  ON moves
  FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM games 
      WHERE auth.uid() = white_player OR 
            auth.uid() = black_player OR
            status = 'waiting'
    )
  );

-- Users can insert moves for their own games when it's their turn
CREATE POLICY "Users can create moves for their games when it's their turn"
  ON moves
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    game_id IN (
      SELECT id FROM games 
      WHERE (auth.uid() = white_player AND turn = 'w') OR 
            (auth.uid() = black_player AND turn = 'b')
    )
  );
```

### Matchmaking Table RLS

```sql
-- Users can view their own matchmaking entries and active ones
CREATE POLICY "Users can view their own matchmaking entries and active ones"
  ON matchmaking
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_active = true
  );

-- Users can insert their own matchmaking entries
CREATE POLICY "Users can add themselves to the matchmaking queue"
  ON matchmaking
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Users can update only their own matchmaking entries
CREATE POLICY "Users can update only their own matchmaking entries"
  ON matchmaking
  FOR UPDATE
  USING (
    auth.uid() = user_id
  );
```

### Player Presence Table RLS

```sql
-- Users can view presence info for games they're in
CREATE POLICY "Users can view presence for their games"
  ON player_presence
  FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM games 
      WHERE auth.uid() = white_player OR 
            auth.uid() = black_player
    )
  );

-- Users can update only their own presence
CREATE POLICY "Users can update their own presence"
  ON player_presence
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );
```

### Profiles Table RLS

```sql
-- Everyone can view all profiles (needed for leaderboard)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

-- Users can only update their own profiles
CREATE POLICY "Users can update their own profiles"
  ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id
  );
```

## Database Functions and Triggers

### Rank Distribution Function

This function is used by the leaderboard to get rank distribution statistics:

```sql
CREATE OR REPLACE FUNCTION get_rank_distribution()
RETURNS TABLE(
    rank_tier TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.rank_tier,
        COUNT(p.id)::BIGINT
    FROM 
        profiles p
    WHERE 
        p.games_played > 0
    GROUP BY 
        p.rank_tier
    ORDER BY 
        CASE p.rank_tier
            WHEN 'Bronze' THEN 1
            WHEN 'Silver' THEN 2
            WHEN 'Gold' THEN 3
            WHEN 'Platinum' THEN 4
            WHEN 'Diamond' THEN 5
            WHEN 'Master' THEN 6
            WHEN 'Grandmaster' THEN 7
            ELSE 8
        END;
END;
$$ LANGUAGE plpgsql;
```

## Database Triggers

Triggers play a crucial role in the Supa Chess database architecture, automating various processes and maintaining data integrity.

### Timestamp Update Triggers

Each table with `updated_at` columns has an automatic trigger to update timestamps:

```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Applied to games table
CREATE TRIGGER update_games_timestamp
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Applied to profiles table
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Applied to matchmaking table
CREATE TRIGGER update_matchmaking_timestamp
BEFORE UPDATE ON matchmaking
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Applied to player_presence table
CREATE TRIGGER update_player_presence_timestamp
BEFORE UPDATE ON player_presence
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

### Profile Creation Trigger

Automatically creates a profile when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO profiles (
    id, 
    username, 
    games_played, 
    wins, 
    losses, 
    draws, 
    current_streak, 
    best_streak, 
    win_rate, 
    elo_rating, 
    highest_elo,
    rank_tier,
    is_placement,
    placement_games_played,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Chess Player ' || substr(NEW.id::text, 1, 8)),
    0, 0, 0, 0, 0, 0, 0,
    1200, 1200, 'Bronze', true, 0,
    NOW(), NOW()
  );
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_user();
```

### Game Stats Update Triggers

Updates player statistics when games are completed:

```sql
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $
DECLARE
  white_id UUID;
  black_id UUID;
  is_draw BOOLEAN;
  winner_id UUID;
BEGIN
  -- Only process when a game status changes to completed, resigned, or draw
  IF (TG_OP = 'UPDATE' AND 
     (NEW.status IN ('completed', 'resigned', 'draw') AND OLD.status = 'active')) THEN
    
    white_id := NEW.white_player;
    black_id := NEW.black_player;
    is_draw := (NEW.status = 'draw');
    winner_id := NEW.winner;
    
    -- Update white player stats
    IF white_id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        games_played = games_played + 1,
        wins = CASE WHEN white_id = winner_id THEN wins + 1 ELSE wins END,
        losses = CASE WHEN white_id != winner_id AND NOT is_draw THEN losses + 1 ELSE losses END,
        draws = CASE WHEN is_draw THEN draws + 1 ELSE draws END,
        current_streak = CASE 
          WHEN white_id = winner_id THEN current_streak + 1
          WHEN is_draw THEN 0
          ELSE 0
          END,
        best_streak = CASE 
          WHEN white_id = winner_id AND current_streak + 1 > best_streak THEN current_streak + 1
          ELSE best_streak
          END,
        win_rate = CASE
          WHEN games_played + 1 > 0 THEN 
            ROUND((CASE WHEN white_id = winner_id THEN wins + 1 ELSE wins END)::numeric / (games_played + 1) * 100)
          ELSE 0
          END,
        placement_games_played = CASE
          WHEN is_placement THEN placement_games_played + 1
          ELSE placement_games_played
          END,
        is_placement = CASE
          WHEN is_placement AND placement_games_played + 1 >= 10 THEN false
          ELSE is_placement
          END
      WHERE id = white_id;
    END IF;
    
    -- Update black player stats
    IF black_id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        games_played = games_played + 1,
        wins = CASE WHEN black_id = winner_id THEN wins + 1 ELSE wins END,
        losses = CASE WHEN black_id != winner_id AND NOT is_draw THEN losses + 1 ELSE losses END,
        draws = CASE WHEN is_draw THEN draws + 1 ELSE draws END,
        current_streak = CASE 
          WHEN black_id = winner_id THEN current_streak + 1
          WHEN is_draw THEN 0
          ELSE 0
          END,
        best_streak = CASE 
          WHEN black_id = winner_id AND current_streak + 1 > best_streak THEN current_streak + 1
          ELSE best_streak
          END,
        win_rate = CASE
          WHEN games_played + 1 > 0 THEN 
            ROUND((CASE WHEN black_id = winner_id THEN wins + 1 ELSE wins END)::numeric / (games_played + 1) * 100)
          ELSE 0
          END,
        placement_games_played = CASE
          WHEN is_placement THEN placement_games_played + 1
          ELSE placement_games_played
          END,
        is_placement = CASE
          WHEN is_placement AND placement_games_played + 1 >= 10 THEN false
          ELSE is_placement
          END
      WHERE id = black_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_game_completion
AFTER UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_player_stats();
```

### ELO Rating Update Trigger

Updates player ELO ratings when a ranked game completes:

```sql
CREATE OR REPLACE FUNCTION update_elo_ratings()
RETURNS TRIGGER AS $
DECLARE
  white_id UUID;
  black_id UUID;
  white_elo INTEGER;
  black_elo INTEGER;
  white_rating_change INTEGER;
  black_rating_change INTEGER;
  is_white_winner BOOLEAN;
  is_black_winner BOOLEAN;
  is_draw BOOLEAN;
  white_is_placement BOOLEAN;
  black_is_placement BOOLEAN;
BEGIN
  -- Only process when a ranked game status changes to completed, resigned, or draw
  IF (TG_OP = 'UPDATE' AND 
     (NEW.status IN ('completed', 'resigned', 'draw') AND OLD.status = 'active' AND
      NEW.mode = 'ranked' AND NEW.white_elo_change IS NULL AND NEW.black_elo_change IS NULL)) THEN
    
    white_id := NEW.white_player;
    black_id := NEW.black_player;
    is_draw := (NEW.status = 'draw');
    is_white_winner := (NEW.winner = white_id);
    is_black_winner := (NEW.winner = black_id);
    
    -- Get current ELO ratings
    SELECT elo_rating, is_placement INTO white_elo, white_is_placement FROM profiles WHERE id = white_id;
    SELECT elo_rating, is_placement INTO black_elo, black_is_placement FROM profiles WHERE id = black_id;
    
    -- Calculate ELO changes
    IF is_draw THEN
      -- Handle draw case
      white_rating_change := calculate_elo_change(white_elo, black_elo, 0.5, white_is_placement);
      black_rating_change := calculate_elo_change(black_elo, white_elo, 0.5, black_is_placement);
    ELSIF is_white_winner THEN
      -- White won
      white_rating_change := calculate_elo_change(white_elo, black_elo, 1, white_is_placement);
      black_rating_change := calculate_elo_change(black_elo, white_elo, 0, black_is_placement);
    ELSIF is_black_winner THEN
      -- Black won
      white_rating_change := calculate_elo_change(white_elo, black_elo, 0, white_is_placement);
      black_rating_change := calculate_elo_change(black_elo, white_elo, 1, black_is_placement);
    END IF;
    
    -- Update the game with ELO changes
    UPDATE games
    SET 
      white_elo_change = white_rating_change,
      black_elo_change = black_rating_change
    WHERE id = NEW.id;
    
    -- Update player ELO ratings
    UPDATE profiles
    SET 
      elo_rating = elo_rating + white_rating_change,
      highest_elo = GREATEST(elo_rating + white_rating_change, highest_elo),
      rank_tier = calculate_rank_tier(elo_rating + white_rating_change)
    WHERE id = white_id;
    
    UPDATE profiles
    SET 
      elo_rating = elo_rating + black_rating_change,
      highest_elo = GREATEST(elo_rating + black_rating_change, highest_elo),
      rank_tier = calculate_rank_tier(elo_rating + black_rating_change)
    WHERE id = black_id;
    
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_ranked_game_completion
AFTER UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_elo_ratings();
```

### Matchmaking Cleanup Trigger

Automatically cleans up expired matchmaking entries:

```sql
CREATE OR REPLACE FUNCTION cleanup_expired_matchmaking()
RETURNS TRIGGER AS $
BEGIN
  -- Mark old matchmaking entries as inactive after 30 minutes
  UPDATE matchmaking
  SET is_active = false
  WHERE 
    is_active = true AND
    joined_at < NOW() - INTERVAL '30 minutes' AND
    game_id IS NULL;
    
  RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_matchmaking
AFTER INSERT ON matchmaking
EXECUTE FUNCTION cleanup_expired_matchmaking();
```

### Player Presence Update Trigger

Handles player presence status changes:

```sql
CREATE OR REPLACE FUNCTION handle_presence_changes()
RETURNS TRIGGER AS $
DECLARE
  opponent_id UUID;
  game_record RECORD;
BEGIN
  -- If player goes offline during an active game
  IF (TG_OP = 'UPDATE' AND NEW.status = 'offline' AND OLD.status = 'online') THEN
    
    -- Get game info
    SELECT * INTO game_record 
    FROM games 
    WHERE 
      id = NEW.game_id AND 
      status = 'active';
      
    -- If game exists and is active
    IF FOUND THEN
      -- Determine opponent
      IF game_record.white_player = NEW.user_id THEN
        opponent_id := game_record.black_player;
      ELSE
        opponent_id := game_record.white_player;
      END IF;
      
      -- Update last_active timestamp for opponent tracking
      UPDATE player_presence
      SET last_active = NOW()
      WHERE user_id = NEW.user_id AND game_id = NEW.game_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_presence_change
AFTER UPDATE ON player_presence
FOR EACH ROW
EXECUTE FUNCTION handle_presence_changes();
```

## Setting Up the Database

To set up the database for Supa Chess:

1. Create a new Supabase project
2. Run the table creation scripts for each table
3. Apply the RLS policies for each table
4. Create database functions and triggers
5. Set up authentication providers (email/password, OAuth)

### Required SQL Scripts

The full SQL scripts for creating all tables, functions, and RLS policies are available in the following files:

- `sql/schema.sql` - Creates all tables and indexes
- `sql/functions.sql` - Creates database functions
- `sql/rls_policies.sql` - Sets up Row Level Security
- `sql/triggers.sql` - Creates database triggers

## ELO Rating System

The ELO rating system is implemented in the `calculateEloChange` function in `lib/types/Elo.ts`. Key points:

- Starting ELO: 1200
- Placement matches: First 10 games have higher K-factor (64)
- Regular K-factors:
  - Under 2100: K=32
  - 2100-2399: K=24
  - 2400+: K=16
- Rank tiers:
  - Bronze: 0-1199
  - Silver: 1200-1399
  - Gold: 1400-1599
  - Platinum: 1600-1799
  - Diamond: 1800-1999
  - Master: 2000-2199
  - Grandmaster: 2200+

## Real-time Functionality

Supabase Realtime is used extensively in Supa Chess for several features:

1. **Game state synchronization**: Changes to the game state are broadcast to all players
2. **Move history**: New moves are displayed in real-time
3. **Matchmaking**: Players are matched and redirected to their game
4. **Player presence**: Online status of players is tracked and updated

## Data Migration Considerations

When updating the database schema:

1. Always add new columns as nullable or with default values
2. Update RLS policies when adding tables or changing access patterns
3. Test security by logging in as different users
4. Ensure triggers are working properly for timestamps

## Troubleshooting

Common database issues and solutions:

1. **RLS blocking access**: Verify policies are correct and user is authenticated
2. **Realtime updates not working**: Check subscription syntax and channel names
3. **Missing rows**: Ensure INSERT operations aren't blocked by RLS
4. **Slow queries**: Add indexes for frequently queried columns
