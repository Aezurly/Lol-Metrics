import { Injectable, inject } from '@angular/core';
import { Player, PlayerStat, Match } from '@common/interfaces/match';
import { MatchesService } from '../matches.service';

export interface PerChampionStat {
  championName: string;
  matchesId: string[];
  stats: PlayerStat;
}

// Default empty PlayerStat used as a template. Always clone before mutating.
const DEFAULT_PLAYER_STAT: PlayerStat = {
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

@Injectable({ providedIn: 'root' })
export class PlayerPerMatchStatService {
  private readonly matchesService = inject(MatchesService);
  private readonly playerPerChampStat: Map<
    string,
    Map<string, PerChampionStat>
  > = new Map();

  getPlayerStatForMatches(player: Player, matchIds: string[]): PlayerStat {
    const aggregated: PlayerStat = {
      ...DEFAULT_PLAYER_STAT,
      championPlayed: { ...DEFAULT_PLAYER_STAT.championPlayed },
    };
    const playerId = player.uid;

    for (const matchId of matchIds) {
      const match = this.matchesService.getMatchById(matchId);
      if (!match) continue;
      this.addMatchToAggregate(aggregated, match, playerId);
    }

    return aggregated;
  }

  getPerChampionStats(player: Player): Map<string, PerChampionStat> {
    if (this.playerPerChampStat.has(player.uid)) {
      return this.playerPerChampStat.get(player.uid)!;
    }

    const perChampionMap: Map<string, PerChampionStat> = new Map();

    const champToMatchIds: Map<string, string[]> = new Map();
    for (const matchId of player.matchIds || []) {
      const match = this.matchesService.getMatchById(matchId);
      if (!match) continue;

      const playerData = match.stats?.[player.uid];
      if (!playerData) continue;

      const championKey = playerData.championPlayed || 'UNKNOWN';
      const arr = champToMatchIds.get(championKey) || [];
      arr.push(matchId);
      champToMatchIds.set(championKey, arr);
    }

    for (const [championKey, ids] of champToMatchIds.entries()) {
      perChampionMap.set(championKey, {
        championName: championKey,
        matchesId: ids,
        stats: this.getPlayerStatForMatches(player, ids),
      });
    }

    this.playerPerChampStat.set(player.uid, perChampionMap);
    return perChampionMap;
  }

  private refreshPerChampionStats(player: Player): void {
    this.playerPerChampStat.delete(player.uid);
    this.getPerChampionStats(player);
  }

  private computeTeamKillsForSide(match: Match, sideNumber: number): number {
    if (!match.stats) return 0;
    return Object.values(match.stats).reduce(
      (sum, p) =>
        sum + (p.teamSideNumber === sideNumber ? p.combat?.kills ?? 0 : 0),
      0
    );
  }

  private addMatchToAggregate(
    aggregated: PlayerStat,
    match: Match,
    playerId: string
  ): void {
    const playerData = match.stats?.[playerId];
    if (!playerData) return;

    const championKey = playerData.championPlayed || 'UNKNOWN';
    aggregated.championPlayed[championKey] =
      (aggregated.championPlayed[championKey] || 0) + 1;

    aggregated.wins += playerData.win ? 1 : 0;
    aggregated.totalKills += playerData.combat?.kills ?? 0;
    aggregated.totalDeaths += playerData.combat?.deaths ?? 0;
    aggregated.totalAssists += playerData.combat?.assists ?? 0;
    aggregated.totalDamageDealt +=
      playerData.damage?.totalDamageToChampions ?? 0;
    aggregated.totalVisionScore += playerData.vision?.visionScore ?? 0;
    aggregated.totalControlWardsPurchased =
      (aggregated.totalControlWardsPurchased ?? 0) +
      (playerData.vision?.controlWardPurchased ?? 0);
    aggregated.totalGoldEarned += playerData.income?.goldEarned ?? 0;
    aggregated.totalMinionsKilled +=
      (playerData.income?.totalMinionsKilled ?? 0) +
      (playerData.income?.neutralMinionsKilled ?? 0);

    aggregated.totalTimePlayed += match.duration ?? 0;

    const teamKillsThisMatch = this.computeTeamKillsForSide(
      match,
      playerData.teamSideNumber
    );
    aggregated.totalTeamKills += teamKillsThisMatch;
  }
}
