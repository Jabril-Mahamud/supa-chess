import Link from "next/link";
import Image from "next/image";
import NextLogo from "./next-logo";
import SupabaseLogo from "./supabase-logo";
import Logo from "@/public/ChatGPT Image Mar 29, 2025, 02_04_32 PM.png"

export default function Hero() {
  return (
    <div className="flex flex-col items-center justify-center w-full px-4 py-16 space-y-12 text-center md:py-24">
      {/* Logos */}
      <div className="flex items-center justify-center gap-8">
        <a
          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <SupabaseLogo />
        </a>
        <span className="h-6 border-l rotate-45" />
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <NextLogo />
        </a>
      </div>

      {/* Title and Description */}
      <div className="max-w-3xl space-y-6">
        <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
          Supa-Chess
        </h1>
        <p className="text-xl text-foreground/80 md:text-2xl">
          A real-time multiplayer chess application with unique rules,
          <br /> powered by{" "}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-4 hover:text-foreground"
          >
            Supabase
          </a>{" "}
          and{" "}
          <a
            href="https://nextjs.org"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-4 hover:text-foreground"
          >
            Next.js
          </a>
        </p>
      </div>

      {/* Feature Highlights with Tooltip */}
      <div className="flex flex-col items-center gap-6 max-w-2xl">
        <div className="p-6 border rounded-lg bg-background/50 w-full">
          <h3 className="mb-2 text-xl font-semibold">
            Just like chess, but with one simple twist
          </h3>
          <div className="relative group cursor-help">
            <p className="text-foreground/80 underline decoration-dotted">
              Hover to see the special rule
            </p>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-4 bg-foreground text-background rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <p className="text-sm">
                When a player loses 8 pieces, they can convert one random enemy
                piece to their side (excluding the king). Players can also
                strategically skip a turn.
              </p>
              <div className="absolute w-3 h-3 bg-foreground transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6 w-full">
          <div className="p-4 border rounded-lg bg-background/50 flex-1 min-w-[200px]">
            <h3 className="mb-1 text-lg font-semibold">
              Real-time Multiplayer
            </h3>
            <p className="text-foreground/70 text-sm">
              Play with friends with real-time updates
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-background/50 flex-1 min-w-[200px]">
            <h3 className="mb-1 text-lg font-semibold">Move History</h3>
            <p className="text-foreground/70 text-sm">
              Track all moves and game events
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="flex flex-wrap gap-4">
        <Link
          href="/play"
          className="px-8 py-3 text-lg font-medium text-background bg-foreground rounded-md hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-foreground/50"
        >
          Play Now
        </Link>
      </div>

      {/* Chess Graphic/Illustration Placeholder */}
      <div className="relative w-full max-w-lg aspect-square">
        <div className="absolute top-0 left-0 w-full h-full blur-3xl opacity-20 bg-gradient-to-br from-blue-500 via-purple-500 to-red-500 rounded-full -z-10"></div>
        <Image
          src={Logo}
          alt="Picture of the author"
        />
      </div>

      {/* Subtle divider */}
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  );
}
