export enum Role {
  TOP = "TOP",
  JUNGLE = "JGL",
  MID = "MID",
  ADC = "ADC",
  SUPPORT = "SUP",
  UNKNOWN = "UNKNOWN",
}

export interface Match {
  id: string;
  playerIds: string[];
  teamIds: number[];
  duration: number;
  raw?: RawMatchData;
  stats: Record<string, PlayerMatchData>;
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
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalDamageDealt: number;
  totalVisionScore: number;
  totalGoldEarned: number;
  totalMinionsKilled: number;
}

export interface PlayerMatchData {
  championPlayed: string;
  combat: {
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
  };
  damage: {
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
  };
  vision: {
    visionScore: number;
    wardsPlaced: number;
    wardsKilled: number;
    controlWardPurchased?: number;
  };
  income: {
    goldEarned: number;
    goldFromPlates?: number;
    goldFromStructures?: number;
    goldSpent?: number;
    totalMinionsKilled?: number;
    neutralMinionsKilled?: number;
    neutralMinionsKilledTeamJungle?: number;
    neutralMinionsKilledEnemyJungle?: number;
  };
  objectives: {
    turretsKilled?: number;
    turretPlatesDestroyed?: number;
    totalDamageToTurrets?: number;
    totalDamageToObjectives?: number;
    ObjectivesStolen?: number;
    voidGrubKills?: number;
    riftHeraldKills?: number;
    dragonKills?: number;
    baronKills?: number;
  };
}
