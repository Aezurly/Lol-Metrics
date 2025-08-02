import { Player, Team } from '@common/interfaces/match';

export interface AppSummary {
  matchIds: string[];
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
