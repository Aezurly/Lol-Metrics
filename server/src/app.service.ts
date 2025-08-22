import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { MatchService } from './match/match.service';
import { DataStoreService } from './data-store/data-store.service';
import { TeamService } from './team/team.service';
import { AppSummary, LoadingStatus } from './interfaces/interfaces';

@Injectable()
export class AppService implements OnModuleInit {
  private isLoading = false;
  private isInitialized = false;

  constructor(
    private readonly loaderService: DataLoaderService,
    private readonly matchService: MatchService,
    private readonly dataStore: DataStoreService,
    private readonly teamService: TeamService,
  ) {}

  async onModuleInit() {
    console.log('Starting server initialization...');
    console.log('Starting to load matches at server startup...');
    await this.loadNewMatches();

    this.isInitialized = true;
    console.log('Server initialization complete - teams and matches loaded.');
  }

  private async loadNewMatches(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      await this.loaderService.loadNewMatches();
      console.log('All matches loaded successfully.');
    } finally {
      this.isLoading = false;
    }
  }

  async loadAndRetrieveSummary(): Promise<AppSummary> {
    // Wait for initialization to complete if still in progress
    while (!this.isInitialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Load any new matches that might have been added since startup
    await this.loadNewMatches();
    console.log('All matches loaded successfully.');

    return {
      matchIds: this.dataStore.getMatchIds(),
      matchs: this.dataStore.matches,
      playerList: this.dataStore.getPlayerList(),
      teamList: this.dataStore.getTeamList(),
    };
  }

  async forceReloadMatches(): Promise<void> {
    console.log('Force reloading all matches...');
    await this.loadNewMatches();
  }

  async forceReloadTeams(): Promise<void> {
    await this.teamService.reloadTeamsFromConfig();
  }

  async forceReloadAll(): Promise<void> {
    console.log('Force reloading teams and matches...');
    await this.forceReloadTeams();
    await this.forceReloadMatches();
  }

  getLoadingStatus(): LoadingStatus {
    return {
      isLoading: this.isLoading,
      isInitialized: this.isInitialized,
      teamsCount: this.dataStore.getTeamList().length,
      playersCount: this.dataStore.getPlayerList().length,
      matchesCount: this.dataStore.getMatchIds().length,
    };
  }

  getTeamIdByPlayerId(playerId: string): number | undefined {
    return this.dataStore.getTeamIdByPlayerId(playerId);
  }
}
