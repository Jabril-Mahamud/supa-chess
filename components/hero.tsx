'use client'
import Image from "next/image";
import Link from "next/link";
import { Gamepad2, Clock, History } from "lucide-react";
import ChessboardDemo from "./chess/demo/chessboard-demo";
import SupabaseLogo from "./supabase-logo";
import NextLogo from "./next-logo";

export default function ImprovedHero() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-7xl">
      {/* Hero Content Container */}
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Content */}
        <div className="space-y-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <Image 
              src="/SupaChessLogo.png" 
              alt="Supa-Chess Logo" 
              width={64} 
              height={64} 
              className="rounded-lg shadow-md"
            />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Supa-Chess
            </h1>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <p className="text-xl text-gray-600 dark:text-gray-300">
              A revolutionary multiplayer chess experience with unique strategic twists, 
              powered by cutting-edge real-time technologies.
            </p>

            {/* Special Rule Highlight */}
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Gamepad2 className="text-blue-600 dark:text-blue-400" />
                Unique Game Mechanic
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                When a player loses 8 pieces, they can convert one random enemy piece 
                to their side (excluding the king). Strategic turn-skipping adds 
                an extra layer of tactical depth.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
              <Clock className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Real-time Multiplayer
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Instant moves and live game updates
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
              <History className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Comprehensive Move Tracking
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Detailed game history and analysis
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center justify-center px-6 py-3 
              border border-transparent text-base font-medium rounded-md 
              text-white bg-blue-600 hover:bg-blue-700 
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-300 ease-in-out"
            >
              Create Game
            </Link>
            <Link 
              href="/protected" 
              className="inline-flex items-center justify-center px-6 py-3 
              border border-gray-300 dark:border-gray-700 
              text-base font-medium rounded-md 
              text-gray-700 dark:text-gray-300 
              bg-white dark:bg-gray-800 
              hover:bg-gray-50 dark:hover:bg-gray-700
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-300 ease-in-out"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Right Column: Chess Illustration */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 
            dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 
            rounded-2xl blur-2xl opacity-50 -z-10"></div>
          
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 
            rounded-2xl shadow-2xl p-6 transform transition-all hover:scale-105 flex flex-col items-center justify-center">
            <ChessboardDemo />
          </div>
        </div>
      </div>

      {/* Powered By Section */}
      <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-70 hover:opacity-100 transition-opacity">
        <a
          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <SupabaseLogo />
        </a>
        <span className="h-6 border-l rotate-45" />
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <NextLogo />
        </a>
      </div>
    </div>
  );
}