import Link from "next/link";
import Image from "next/image";
import { Search, LayoutGrid, TrendingUp } from "lucide-react";
import HeaderAuthProfile from "@/components/header-auth";
import Logo from "@/public/SupaChessLogo.png";
import { createClient } from "@/utils/supabase/client";

export default async function Navbar() {
  const supabase = createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Define nav links - My Games is conditionally included based on authentication
  const NAV_LINKS = [
    { href: "/matchmaking", label: "Find Match", icon: Search },
    // Only include My Games if user is authenticated
    ...(user ? [{ href: "/dashboard", label: "My Games", icon: LayoutGrid }] : []),
    { href: "/leaderboard", label: "Leaderboard", icon: TrendingUp },
  ];

  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={Logo}
              alt="Supa Chess Logo"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="font-semibold">Supa Chess</span>
          </Link>
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="text-foreground hover:underline flex items-center gap-1 font-semibold"
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