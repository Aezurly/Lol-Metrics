import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { MatchService } from './match/match.service';
import { DataStoreService } from './data-store/data-store.service';
import { TeamService } from './team/team.service';
import { AppSummary, LoadingStatus } from './interfaces/interfaces';
import { PlayerStat } from '@common/interfaces/match';

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

  /**
   * Return an array of PlayerStat for the given player filtered to the provided matchIds.
   * If matchIds is not provided, use the player's recorded matchIds from the dataStore.
   */
  getPlayerStatsForMatches(
    playerId: string,
    matchIds?: string[],
  ): PlayerStat | undefined {
    const player = this.dataStore.getPlayer(playerId);
    if (!player) return undefined;

    const idsToUse = matchIds?.length ? matchIds : player.matchIds;

    // Accumulator for aggregated stats across all requested matches
    const accumulated: PlayerStat = {
      championPlayed: {},
      wins: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalDamageDealt: 0,
      totalVisionScore: 0,
      totalControlWardsPurchased: 0,
      totalGoldEarned: 0,
      totalMinionsKilled: 0,
      totalTimePlayed: 0,
      totalTeamKills: 0,
    };

    for (const id of idsToUse) {
      const match = this.dataStore.matches[id];
      if (!match) continue;
      const pStats = match.stats[playerId];
      if (!pStats) continue;

      // Build a per-match PlayerStat-like object
      const perMatch: PlayerStat = {
        championPlayed: { [pStats.championPlayed]: 1 } as any,
        wins: pStats.win ? 1 : 0,
        totalKills: pStats.combat?.kills || 0,
        totalDeaths: pStats.combat?.deaths || 0,
        totalAssists: pStats.combat?.assists || 0,
        totalDamageDealt: pStats.damage?.totalDamageToChampions || 0,
        totalVisionScore: pStats.vision?.visionScore || 0,
        totalControlWardsPurchased: pStats.vision?.controlWardPurchased || 0,
        totalGoldEarned: pStats.income?.goldEarned || 0,
        totalMinionsKilled:
          (pStats.income?.totalMinionsKilled ?? 0) +
          (pStats.income?.neutralMinionsKilled ?? 0),
        totalTimePlayed: match.duration || 0,
        totalTeamKills: 0,
      };

      // compute totalTeamKills for the player's team in this match
      const teamPlayersInMatch: string[] = Object.entries(match.stats)
        .filter(
          ([, p]: [string, any]) => p.teamSideNumber === pStats.teamSideNumber,
        )
        .map(([pid]) => pid);
      perMatch.totalTeamKills = teamPlayersInMatch.reduce((total, pid) => {
        const ps = match.stats[pid];
        return total + (ps?.combat?.kills || 0);
      }, 0);

      // Merge perMatch into accumulated
      // championPlayed: merge counts
      for (const [champ, cnt] of Object.entries(
        perMatch.championPlayed || {},
      )) {
        accumulated.championPlayed[champ] =
          (accumulated.championPlayed[champ] || 0) + (cnt as unknown as number);
      }

      accumulated.wins += perMatch.wins || 0;
      accumulated.totalKills += perMatch.totalKills || 0;
      accumulated.totalDeaths += perMatch.totalDeaths || 0;
      accumulated.totalAssists += perMatch.totalAssists || 0;
      accumulated.totalDamageDealt += perMatch.totalDamageDealt || 0;
      accumulated.totalVisionScore += perMatch.totalVisionScore || 0;
      accumulated.totalControlWardsPurchased =
        (accumulated.totalControlWardsPurchased || 0) +
        (perMatch.totalControlWardsPurchased || 0);
      accumulated.totalGoldEarned += perMatch.totalGoldEarned || 0;
      accumulated.totalMinionsKilled += perMatch.totalMinionsKilled || 0;
      accumulated.totalTimePlayed += perMatch.totalTimePlayed || 0;
      accumulated.totalTeamKills += perMatch.totalTeamKills || 0;
    }

    return accumulated;
  }
}
