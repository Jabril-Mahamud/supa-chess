# Supa Chess

A real-time multiplayer chess application with a unique twist built with Next.js, React, and Supabase.

## Features

- **Real-time Multiplayer Chess**: Play chess with others in real-time using Supabase's real-time capabilities
- **Special "Conversion" Rule**: When a player loses 8 pieces, they can convert one random enemy piece to their side (excluding the king)
- **Turn Skipping**: Strategic option to skip a turn
- **Move History**: Complete history of all moves made in the game
- **Game State Persistence**: Games are saved in the database and can be resumed
- **Spectator Mode**: Watch games without participating

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: Custom chess board using react-chessboard
- **Game Logic**: chess.js for move validation and game state management
- **Backend/Database**: Supabase (PostgreSQL)
- **Real-time Communication**: Supabase Realtime

## Special Rules

This chess variant includes unique gameplay mechanics:

1. **Piece Conversion**:
   - When a player loses 8 pieces, they can automatically convert one random enemy piece to their side
   - Converted pieces maintain their position but change allegiance
   - Kings cannot be converted
   - Each player can only perform one conversion per game

2. **Turn Skipping**:
   - Players have the option to skip their turn
   - This can be used strategically to force the opponent to make moves

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/supa-chess.git
   cd supa-chess
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following tables in Supabase:

### `games` Table

- `id`: UUID (primary key)
- `white_player`: UUID (foreign key to users)
- `black_player`: UUID (foreign key to users)
- `current_position`: String (FEN notation)
- `turn`: String ('w' or 'b')
- `status`: String ('active', 'completed', 'draw', 'resigned')
- `winner`: UUID (foreign key to users, nullable)
- `white_conversion_done`: Boolean
- `black_conversion_done`: Boolean
- `last_conversion`: String (nullable)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### `moves` Table

- `id`: UUID (primary key)
- `game_id`: UUID (foreign key to games)
- `user_id`: UUID (foreign key to users)
- `move_notation`: String
- `position_after`: String (FEN notation)
- `created_at`: Timestamp

## Component Architecture

The main chess component is composed of:

- `ChessBoard`: Main component for the chessboard UI and game logic
- Supabase client for real-time communication and database access
- react-chessboard for visual representation
- chess.js for move validation and game state tracking

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [react-chessboard](https://github.com/Clariity/react-chessboard) for the chessboard UI
- [chess.js](https://github.com/jhlywa/chess.js) for chess logic
- [Supabase](https://supabase.com) for backend and real-time capabilities
- [Next.js](https://nextjs.org) for the React framework
