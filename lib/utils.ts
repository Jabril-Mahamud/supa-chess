import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the appropriate color for a rank tier
 * @param rankTier - The rank tier ('Bronze', 'Silver', etc.)
 * @returns Tailwind CSS class for the rank color
 */
export function getRankColor(rankTier: string): string {
  switch (rankTier) {
    case 'Bronze':
      return 'bg-amber-700 text-white';
    case 'Silver':
      return 'bg-gray-400 text-gray-900';
    case 'Gold':
      return 'bg-yellow-500 text-yellow-950';
    case 'Platinum':
      return 'bg-cyan-600 text-white';
    case 'Diamond':
      return 'bg-blue-600 text-white';
    case 'Master':
      return 'bg-purple-600 text-white';
    case 'Grandmaster':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Get the rank icon for a given tier
 * @param rankTier - The rank tier
 * @returns JSX element with the appropriate icon
 */
export function getRankIcon(rankTier: string) {
  // You can implement this if you want to add icons for each rank tier
  // For example, using Lucide icons or custom SVGs
  return null;
}

/**
 * Format ELO change as a string with sign
 * @param eloChange - The ELO change value
 * @returns Formatted string with sign and color class
 */
export function formatEloChange(eloChange: number | null | undefined): { text: string, colorClass: string } {
  if (eloChange === undefined || eloChange === null) {
    return { text: '-', colorClass: 'text-gray-500' };
  }
  
  if (eloChange > 0) {
    return { text: `+${eloChange}`, colorClass: 'text-green-600 dark:text-green-500' };
  } else if (eloChange < 0) {
    return { text: `${eloChange}`, colorClass: 'text-red-600 dark:text-red-500' };
  } else {
    return { text: '±0', colorClass: 'text-gray-500' };
  }
}