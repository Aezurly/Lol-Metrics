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
  raw: RawMatchData;
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
}

export interface Team {
  id: number;
  name: string;
  playersIds: string[];
  matchIds: string[];
}
