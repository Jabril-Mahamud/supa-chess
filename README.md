# Supa Chess

A real-time multiplayer chess application with unique game mechanics built with Next.js, React, and Supabase.

![Supa Chess Logo](./public/SupaChessLogo.png)

## Features

- **Real-time Multiplayer Chess**: Play chess with others in real-time using Supabase's real-time capabilities
- **Ranked & Casual Matchmaking**: Find opponents through an ELO-based matchmaking system
- **Special "Conversion" Rule**: When a player loses 8 pieces, they can convert one random enemy piece to their side (excluding the king)
- **Turn Skipping**: Strategic option to skip a turn
- **Move History**: Complete history of all moves made in the game
- **Game State Persistence**: Games are saved in the database and can be resumed
- **Spectator Mode**: Watch games without participating
- **Player Profiles**: Track your stats, ELO rating, and rank
- **Leaderboard**: See how you stack up against other players

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: Shadcn UI with custom chess board using react-chessboard
- **Game Logic**: chess.js for move validation and game state management
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password and OAuth providers
- **Real-time Communication**: Supabase Realtime for game state and presence
- **Styling**: Tailwind CSS for responsive design

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

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setting Up the Database

Supa Chess requires several tables and RLS (Row Level Security) policies in Supabase. For detailed instructions on setting up the database, see [Database.md](./Database.md).

## Project Structure

```text
supa-chess/
├── app/ - Next.js app router pages and layouts
│   ├── actions.ts - Server actions for auth and game actions
│   ├── auth/ - Authentication callback handling
│   ├── dashboard/ - User dashboard
│   ├── game/ - Game page and components
│   ├── leaderboard/ - Leaderboard page
│   ├── matchmaking/ - Matchmaking page
│   └── protected/ - Protected routes
├── components/ - Reusable React components
│   ├── chess/ - Chess-specific components
│   ├── profile/ - User profile components
│   └── ui/ - UI components from shadcn
├── hooks/ - Custom React hooks
│   ├── chess/ - Chess game logic hooks
│   └── usePlayerPresence.ts - Player online status tracking
├── lib/ - Utility functions and types
│   └── types/ - TypeScript type definitions
├── public/ - Static assets
└── utils/ - Helper utilities
    └── supabase/ - Supabase client utilities
```

## Key Components

### Game System

- **ChessBoard**: Main component for the chess board UI and game logic
- **useChessGame**: Custom hook managing game state, rules, and synchronization
- **matchmaking system**: Pairs players based on ELO rating and availability

### Database Integration

- **Supabase Realtime**: Used for synchronizing game state between players
- **RLS Policies**: Ensure secure access to game data
- **Server Actions**: Handle database operations securely

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
- [shadcn/ui](https://ui.shadcn.com) for UI components
