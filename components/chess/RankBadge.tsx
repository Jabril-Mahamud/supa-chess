// components/chess/RankBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRankColor } from "@/lib/utils";

interface RankBadgeProps {
  rankTier?: string | null;
  eloRating?: number | null;
  gamesPlayed?: number;
  rankedGamesPlayed?: number;
  showElo?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  isPlacement?: boolean;
  placementGamesPlayed?: number;
}

export function RankBadge({
  rankTier,
  eloRating,
  gamesPlayed = 0,
  rankedGamesPlayed = 0,
  showElo = false,
  size = "md",
  className = "",
  isPlacement = false,
  placementGamesPlayed = 0,
}: RankBadgeProps) {
  // Determine if we should show rank information
  const shouldShowRank = rankedGamesPlayed > 0 || gamesPlayed > 0;
  
  // Get appropriate message based on player status
  const getStatusMessage = () => {
    if (rankedGamesPlayed === 0) {
      return "Play ranked games to earn a rank";
    }
    if (isPlacement) {
      return `Placement matches: ${placementGamesPlayed}/10`;
    }
    return `${rankTier} • ${eloRating} ELO`;
  };

  // Determine size classes
  const sizeClasses = {
    sm: "text-xs py-0 px-1.5",
    md: "text-sm",
    lg: "text-base py-1 px-3",
  };

  // If no rank data or no games played, show "Unranked"
  if (!shouldShowRank || !rankTier) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`${sizeClasses[size]} ${className}`}
            >
              Unranked
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Play ranked games to earn a rank</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // For placement matches
  if (isPlacement) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`${sizeClasses[size]} ${className} border-dashed`}
            >
              Placement {placementGamesPlayed}/10
              {showElo && eloRating && (
                <span className="font-mono ml-1">({eloRating})</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Placement Matches</p>
            <p className="text-xs">
              Complete 10 ranked games to establish your permanent rank
            </p>
            {eloRating && <p className="text-xs">Current ELO: {eloRating}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal rank badge with tooltip
  const rankColorClass = getRankColor(rankTier);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`${rankColorClass} ${sizeClasses[size]} ${className} 
              ${showElo && eloRating ? "flex items-center gap-1" : ""}`}
          >
            {rankTier}
            {showElo && eloRating && (
              <span className="font-mono ml-1">({eloRating})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{rankTier}</p>
          {eloRating && <p className="text-xs">Your ELO: {eloRating}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}