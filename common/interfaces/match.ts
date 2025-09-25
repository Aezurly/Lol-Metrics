export enum Role {
  TOP = "TOP",
  JUNGLE = "JGL",
  MID = "MID",
  ADC = "ADC",
  SUPPORT = "SUP",
  UNKNOWN = "UNKNOWN",
}

export const MATCH_ID_PARTS_NUMBER = 4;

export interface Match {
  id: string;
  playerIds: string[];
  teamIds: number[];
  victoriousTeamSide: number; // 1 (for 100) or 2 (for 200)
  victoriousTeamId: number;
  duration: number;
  raw?: RawMatchData;
  stats: Record<string, PlayerMatchData>;
  isOfficial?: boolean;
}

export interface RawMatchData {
  participants?: Array<{
    PUUID?: string;
    RIOT_ID_GAME_NAME?: string;
    [key: string]: unknown;
  }>;
  gameDuration?: number;
  [key: string]: unknown;
}

export interface Player {
  uid: string;
  name: string;
  teamId?: number;
  matchIds: string[];
  role: Role;
  stats: PlayerStat;
}

export interface Team {
  id: number;
  name: string;
  playersIds: string[];
  matchIds: string[];
}

export interface PlayerStat {
  championPlayed: Record<string, number>;
  wins: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamageDealt: number;
  totalVisionScore: number;
  totalControlWardsPurchased?: number;
  totalGoldEarned: number;
  totalMinionsKilled: number;
  totalTimePlayed: number;
  totalTeamKills: number;
}

export interface CombatStats {
  kills: number;
  deaths: number;
  assists: number;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  ccScore?: number;
  ccTime?: number;
  totalCCTime?: number;
  longestTimeSpentAlive?: number;
  timeSpentDead?: number;
}

export interface DamageStats {
  totalDamageToChampions: number;
  physicalDamageToChampions?: number;
  magicDamageToChampions?: number;
  trueDamageToChampions?: number;
  totalDamageTaken?: number;
  physicalDamageTaken?: number;
  magicDamageTaken?: number;
  trueDamageTaken?: number;
  totalHealingDone?: number;
  totalHealingDoneToTeammates?: number;
  totalDamageShieldedToTeammates?: number;
}

export interface VisionStats {
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWardPurchased: number;
}

export interface IncomeStats {
  goldEarned: number;
  goldFromPlates?: number;
  goldFromStructures?: number;
  goldSpent?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  neutralMinionsKilledTeamJungle?: number;
  neutralMinionsKilledEnemyJungle?: number;
}

export interface ObjectiveStats {
  turretsKilled?: number;
  turretPlatesDestroyed?: number;
  totalDamageToTurrets?: number;
  totalDamageToObjectives?: number;
  ObjectivesStolen?: number;
  voidGrubKills?: number;
  riftHeraldKills?: number;
  dragonKills?: number;
  baronKills?: number;
}

export interface PlayerMatchData {
  teamSideNumber: number;
  championPlayed: string;
  win: boolean;
  combat: CombatStats;
  damage: DamageStats;
  vision: VisionStats;
  income: IncomeStats;
  objectives: ObjectiveStats;
}
