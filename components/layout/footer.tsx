// components/layout/footer.tsx
import Image from "next/image";
import { Linkedin } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Logo from "@/public/SupaChessLogo.png";

const FOOTER_LINKS = [
  {
    href: "https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs",
    label: "Powered by Supabase",
    icon: (
      <svg
        viewBox="0 0 109 113"
        className="h-4 w-4"
        fill="currentColor"
      >
        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" />
        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" />
        <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64036 72.2922 -2.92824 62.8321 2.16463 56.4175L45.317 2.07103Z" />
      </svg>
    ),
  },
  {
    href: "https://github.com/Jabril-Mahamud/supa-chess",
    label: "GitHub",
    icon: (
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/in/jabril-mahamud/",
    label: "Built by Jabril",
    icon: <Linkedin className="w-4 h-4" />,
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-t-foreground/10 py-6">
      <div className="max-w-5xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Image 
            src={Logo} 
            alt="Supa Chess Logo" 
            width={24} 
            height={24} 
            className="w-6 h-6"
          />
          <span className="text-sm">
            Supa Chess © {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {FOOTER_LINKS.map(({ href, label, icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              className="text-xs hover:underline flex items-center gap-1"
              rel="noreferrer"
            >
              {icon}
              {label}
            </a>
          ))}
          
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}