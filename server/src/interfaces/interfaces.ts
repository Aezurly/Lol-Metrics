import { Player, Team, Match } from '@common/interfaces/match';

export interface AppSummary {
  matchIds: string[];
  matchs: Record<string, Match>;
  playerList: Player[];
  teamList: Team[];
}

export interface LoadingStatus {
  isLoading: boolean;
  isInitialized: boolean;
  teamsCount: number;
  playersCount: number;
  matchesCount: number;
}
