"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRankColor } from "@/lib/utils";
import { RANK_TIERS } from "@/lib/types/Ranks";

interface RankBadgeProps {
  rankTier: string;
  eloRating?: number;
  showElo?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RankBadge({
  rankTier,
  eloRating,
  showElo = false,
  size = "md",
  className = "",
}: RankBadgeProps) {
  // Find the rank tier info
  const rankInfo = RANK_TIERS.find((r) => r.name === rankTier);

  // Get the appropriate class for the badge
  const rankColorClass = getRankColor(rankTier);

  // Determine size classes
  const sizeClasses = {
    sm: "text-xs py-0 px-1.5",
    md: "text-sm",
    lg: "text-base py-1 px-3",
  };

  const badgeContent = (
    <Badge
      className={`${rankColorClass} ${sizeClasses[size]} ${className} 
        ${showElo && eloRating ? "flex items-center gap-1" : ""}`}
    >
      {rankTier}
      {showElo && eloRating && (
        <span className="font-mono ml-1">({eloRating})</span>
      )}
    </Badge>
  );

  // If no rank info, just return the badge without tooltip
  if (!rankInfo) {
    return badgeContent;
  }

  // With tooltip showing ELO range
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{rankTier}</p>
          <p className="text-xs text-muted-foreground">
            ELO Range: {rankInfo.minElo} - {rankInfo.maxElo}
          </p>
          {eloRating && <p className="text-xs">Your ELO: {eloRating}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
