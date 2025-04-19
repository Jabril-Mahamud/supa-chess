// lib/types/Ranks.ts

export interface RankInfo {
  name: string; // Rank tier name (Bronze, Silver, etc.)
  count: number; // Number of players in this rank
  minElo: number; // Minimum ELO required for this rank
  maxElo: number; // Maximum ELO for this rank
  percentage?: number; // Percentage of players in this rank
}

export interface RankTier {
  name: string;
  minElo: number;
  maxElo: number;
  color: string;
  icon?: React.ReactNode;
}

// Define all available rank tiers and their requirements
export const RANK_TIERS: RankTier[] = [
  {
    name: "Bronze",
    minElo: 0,
    maxElo: 1199,
    color: "#CD7F32",
  },
  {
    name: "Silver",
    minElo: 1200,
    maxElo: 1399,
    color: "#A7A7AD",
  },
  {
    name: "Gold",
    minElo: 1400,
    maxElo: 1599,
    color: "#FFD700",
  },
  {
    name: "Platinum",
    minElo: 1600,
    maxElo: 1799,
    color: "#00BFFF",
  },
  {
    name: "Diamond",
    minElo: 1800,
    maxElo: 1999,
    color: "#1E90FF",
  },
  {
    name: "Master",
    minElo: 2000,
    maxElo: 2199,
    color: "#9370DB",
  },
  {
    name: "Grandmaster",
    minElo: 2200,
    maxElo: 3000,
    color: "#FF4500",
  },
];
