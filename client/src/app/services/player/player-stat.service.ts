import { Injectable, inject } from '@angular/core';
import { Player, PlayerStat, Role } from '@common/interfaces/match';
import { PlayerManagerService } from './player-manager.service';
import { TeamsService } from '../teams/teams.service';
import { PlayerPerMatchStatService } from './player-per-match-stat.service';

export const PERFECT_KDA_VALUE = Infinity;

@Injectable({ providedIn: 'root' })
export class PlayerStatService {
  private readonly playerManager = inject(PlayerManagerService);
  private readonly teamsService = inject(TeamsService);
  private readonly playerPerMatchStat = inject(PlayerPerMatchStatService);

  getPlayerById(id: string) {
    return this.playerManager.getPlayerById(id);
  }

  // Return a small map of raw metric values for a player using existing helpers
  getRawMetricsForPlayer(player: Player): Record<string, number> {
    return {
      kda: this.getKDAValue(player),
      dpm: this.getDamagePerMinuteValue(player),
      kp: this.getKillParticipationValue(player),
      gpm: this.getGoldPerMinuteValue(player),
      dpg: this.getDamagePerGoldValue(player),
      vspm: this.getVisionScorePerMinuteValue(player),
      cspm: this.getCSPerMinuteValue(player),
    };
  }

  // Compute per-role metric bounds (min/max) for the common metric keys
  getRoleMetricBounds(
    role: Role
  ): Record<string, { min: number; max: number }> {
    const players = this.getAllPlayers().filter((p) => p.role === role);
    const rawMetrics = players.map((p) => this.getRawMetricsForPlayer(p));

    const keys = ['kda', 'dpm', 'kp', 'gpm', 'dpg', 'vspm', 'cspm'];
    const bounds: Record<string, { min: number; max: number }> = {} as any;

    for (const key of keys) {
      const vals = rawMetrics
        .map((r) => r[key])
        .filter((v) => Number.isFinite(v));
      let min = vals.length ? Math.min(...vals) : 0;
      let max = vals.length ? Math.max(...vals) : 0;
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 0;
      if (min === max && max !== 0) min = 0;
      bounds[key] = { min, max };
    }

    return bounds;
  }

  getAllPlayers() {
    return this.playerManager.getAllPlayers();
  }

  getPlayerStats(player: Player, matchesId?: string[]): PlayerStat {
    return matchesId
      ? this.playerPerMatchStat.getPlayerStatForMatches(player, matchesId)
      : player.stats;
  }

  getKDA(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    if (stats.totalDeaths === 0) {
      return 'Perfect KDA';
    }
    const kda = (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
    return kda.toFixed(2);
  }

  getKDAValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    if (stats.totalDeaths === 0) {
      return stats.totalKills + stats.totalAssists;
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  getKDAColorClass(player: Player, players?: Player[]): string {
    const pool = players ?? this.getAllPlayers();
    const kdaValue = this.getKDAValue(player);
    const allKDAs = pool.map((p) => this.getKDAValue(p)).sort((a, b) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(allKDAs.length * 0.25);
    const percentile75Index = Math.floor(allKDAs.length * 0.75);

    const percentile25 =
      allKDAs[Math.min(percentile25Index, allKDAs.length - 1)];
    const percentile75 =
      allKDAs[Math.min(percentile75Index, allKDAs.length - 1)];

    if (kdaValue >= percentile75) {
      return 'text-success';
    } else if (kdaValue <= percentile25) {
      return 'text-error';
    }

    return '';
  }

  getTotalMinutesPlayed(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    return stats.totalTimePlayed / 1000 / 60;
  }

  getCSPerMinute(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    if (totalMinutes === 0) return '0.00';
    const csPerMin = stats.totalMinionsKilled / totalMinutes;
    return csPerMin.toFixed(2);
  }

  getCSPerMinuteValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    return totalMinutes === 0 ? 0 : stats.totalMinionsKilled / totalMinutes;
  }

  getDamagePerMinute(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    if (totalMinutes === 0) return '0.00';
    const damagePerMin = stats.totalDamageDealt / totalMinutes;
    return damagePerMin.toFixed(0);
  }

  getDamagePerMinuteValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    return totalMinutes === 0 ? 0 : stats.totalDamageDealt / totalMinutes;
  }

  getGoldPerMinute(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    if (totalMinutes === 0) return '0.00';
    const goldPerMin = stats.totalGoldEarned / totalMinutes;
    return goldPerMin.toFixed(0);
  }

  getGoldPerMinuteValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    return totalMinutes === 0 ? 0 : stats.totalGoldEarned / totalMinutes;
  }

  getDamagePerGold(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    if (stats.totalGoldEarned === 0) return '0.00';
    const damagePerGold = stats.totalDamageDealt / stats.totalGoldEarned;
    return damagePerGold.toFixed(2);
  }

  getDamagePerGoldValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    return stats.totalGoldEarned === 0
      ? 0
      : stats.totalDamageDealt / stats.totalGoldEarned;
  }

  getKillParticipation(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    if (stats.totalTeamKills === 0) return '0.00%';
    const participation =
      ((stats.totalKills + stats.totalAssists) / stats.totalTeamKills) * 100;
    return participation.toFixed(1) + '%';
  }

  getKillParticipationValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    return stats.totalTeamKills === 0
      ? 0
      : ((stats.totalKills + stats.totalAssists) / stats.totalTeamKills) * 100;
  }

  getVisionScorePerMinute(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    if (totalMinutes === 0) return '0.00';
    const visionPerMin = stats.totalVisionScore / totalMinutes;
    return visionPerMin.toFixed(2);
  }

  getVisionScorePerMinuteValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalMinutes = this.getTotalMinutesPlayed(player, matchesId);
    return totalMinutes === 0 ? 0 : stats.totalVisionScore / totalMinutes;
  }

  getControlWardsPerGame(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalGames = player.matchIds.length;
    const total = stats.totalControlWardsPurchased ?? 0;
    if (totalGames === 0) return '0.00';
    return (total / totalGames).toFixed(2);
  }

  getControlWardsPerGameValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalGames = player.matchIds.length;
    const total = stats.totalControlWardsPurchased ?? 0;
    return totalGames === 0 ? 0 : total / totalGames;
  }

  getWinRate(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalGames = player.matchIds.length;
    if (totalGames === 0) return '0.0%';
    const winRate = (stats.wins / totalGames) * 100;
    return winRate.toFixed(1) + '%';
  }

  getWinRateValue(player: Player, matchesId?: string[]): number {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const totalGames = player.matchIds.length;
    return totalGames === 0 ? 0 : (stats.wins / totalGames) * 100;
  }

  getMostPlayedChampion(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const champions = stats.championPlayed;
    if (Object.keys(champions).length === 0) return 'N/A';

    let mostPlayed = '';
    let maxGames = 0;

    for (const [champion, games] of Object.entries(champions)) {
      if (games > maxGames) {
        maxGames = games;
        mostPlayed = champion;
      }
    }

    return `${mostPlayed} (${maxGames})`;
  }

  getMostPlayedChampionName(player: Player, matchesId?: string[]): string {
    const stats: PlayerStat = this.getPlayerStats(player, matchesId);
    const champions = stats.championPlayed;
    if (Object.keys(champions).length === 0) return '';

    let mostPlayed = '';
    let maxGames = 0;

    for (const [champion, games] of Object.entries(champions)) {
      if (games > maxGames) {
        maxGames = games;
        mostPlayed = champion;
      }
    }

    return mostPlayed.toLowerCase();
  }

  getSortValue(player: Player, column: string): number | string {
    const sortMethods: { [key: string]: () => number | string } = {
      name: () => player.name.toLowerCase(),
      role: () => player.role.toLowerCase(),
      teamId: () => this.teamsService.getTeamName(player.teamId).toLowerCase(),
      matches: () => player.matchIds.length,
      kda: () => this.getKDAValue(player),
      kills: () => player.stats.totalKills / player.matchIds.length,
      deaths: () => player.stats.totalDeaths / player.matchIds.length,
      assists: () => player.stats.totalAssists / player.matchIds.length,
      csPerMin: () => this.getCSPerMinuteValue(player),
      damagePerMin: () => this.getDamagePerMinuteValue(player),
      goldPerMin: () => this.getGoldPerMinuteValue(player),
      damagePerGold: () => this.getDamagePerGoldValue(player),
      killParticipation: () => this.getKillParticipationValue(player),
      visionPerMin: () => this.getVisionScorePerMinuteValue(player),
      controlWards: () => this.getControlWardsPerGameValue(player),
      winRate: () => this.getWinRateValue(player),
      mostPlayedChampion: () => this.getMostPlayedChampionName(player),
    };

    return sortMethods[column]?.() ?? 0;
  }
}
