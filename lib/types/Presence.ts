export interface PlayerPresence {
  gameId: string;
  userId: string;
  lastActive: string; // ISO timestamp
  status: "online" | "offline" | "away";
}
