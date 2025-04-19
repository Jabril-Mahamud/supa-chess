// components/layout/navbar.tsx
import Link from "next/link";
import { Search, LayoutGrid, TrendingUp } from "lucide-react";
import HeaderAuthProfile from "@/components/header-auth";

const NAV_LINKS = [
  { href: "/matchmaking", label: "Find Match", icon: Search },
  { href: "/dashboard", label: "My Games", icon: LayoutGrid },
  { href: "/leaderboard", label: "Leaderboard", icon: TrendingUp },
];

export default function Navbar() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href="/">Supa Chess</Link>
          
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="text-foreground hover:underline flex items-center gap-1"
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
        
        <HeaderAuthProfile />
      </div>
    </nav>
  );
}