// ELO rating system utilities

/**
 * Calculate the expected score of player A against player B
 *
 * @param ratingA - ELO rating of player A
 * @param ratingB - ELO rating of player B
 * @returns A value between 0 and 1 representing the expected score
 */
export function calculateExpectedScore(
  ratingA: number,
  ratingB: number
): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate the new ELO rating after a match
 *
 * @param currentRating - Current ELO rating
 * @param expectedScore - Expected score (between 0 and 1)
 * @param actualScore - Actual score (1 for win, 0.5 for draw, 0 for loss)
 * @param kFactor - K-factor determines how much ratings change (higher = more volatile)
 * @returns New ELO rating
 */
export function calculateNewRating(
  currentRating: number,
  expectedScore: number,
  actualScore: number,
  kFactor: number = 32
): number {
  const change = Math.round(kFactor * (actualScore - expectedScore));
  return currentRating + change;
}

/**
 * Get the K-factor based on player details
 *
 * @param isPlacement - Whether player is in placement matches
 * @param currentRating - Current ELO rating
 * @returns Appropriate K-factor
 */
export function getKFactor(
  isPlacement: boolean,
  currentRating: number
): number {
  if (isPlacement) {
    // Higher K-factor for placement matches to quickly place players
    return 64;
  }

  if (currentRating < 2100) {
    return 32; // Standard K-factor
  } else if (currentRating < 2400) {
    return 24; // Lower K-factor for higher rated players
  } else {
    return 16; // Lowest K-factor for very high rated players
  }
}

/**
 * Calculate ELO changes for both players after a match
 *
 * @param whiteRating - White player's current rating
 * @param blackRating - Black player's current rating
 * @param whiteResult - Result of the match for white player
 * @param whiteIsPlacement - Whether white player is in placement matches
 * @param blackIsPlacement - Whether black player is in placement matches
 * @returns Object with new ratings and changes
 */
export function calculateEloChange(
  whiteRating: number,
  blackRating: number,
  whiteResult: "win" | "loss" | "draw",
  whiteIsPlacement: boolean = false,
  blackIsPlacement: boolean = false
): {
  newRatingWhite: number;
  newRatingBlack: number;
  whiteChange: number;
  blackChange: number;
} {
  // Determine actual score for white player (1 for win, 0.5 for draw, 0 for loss)
  const whiteActualScore =
    whiteResult === "win" ? 1 : whiteResult === "draw" ? 0.5 : 0;

  // Black's actual score is the opposite of white's
  const blackActualScore = 1 - whiteActualScore;

  // Calculate expected scores
  const whiteExpectedScore = calculateExpectedScore(whiteRating, blackRating);
  const blackExpectedScore = calculateExpectedScore(blackRating, whiteRating);

  // Get appropriate K-factors
  const whiteKFactor = getKFactor(whiteIsPlacement, whiteRating);
  const blackKFactor = getKFactor(blackIsPlacement, blackRating);

  // Calculate new ratings
  const newWhiteRating = calculateNewRating(
    whiteRating,
    whiteExpectedScore,
    whiteActualScore,
    whiteKFactor
  );

  const newBlackRating = calculateNewRating(
    blackRating,
    blackExpectedScore,
    blackActualScore,
    blackKFactor
  );

  // Calculate changes
  const whiteChange = newWhiteRating - whiteRating;
  const blackChange = newBlackRating - blackRating;

  return {
    newRatingWhite: newWhiteRating,
    newRatingBlack: newBlackRating,
    whiteChange,
    blackChange,
  };
}
