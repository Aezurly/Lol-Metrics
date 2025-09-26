import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommunicationService } from '../communication/communication.service';
import { PerChampionStats, Role, Player } from '@common/interfaces/match';
import { PlayerService } from './player.service';

// Radar chart labels and colors (kept local to avoid circular exports)
const RADAR_CHART_LABELS: string[] = [
  'KDA',
  'DPM',
  'KP',
  'GPM',
  'Dmg/Gold',
  'VS/m',
  'CS/m',
];
export const PRIMARY_COLOR = '#00d8be';
export const ACCENT_COLOR = '#b6a0fd';

import { MatchsService } from '../matchs.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerStatisticsService {
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  private readonly communicationService = inject(CommunicationService);
  private readonly playerService = inject(PlayerService);
  private readonly matchsService = inject(MatchsService);

  constructor() {
    console.log('PlayerStatisticsService initialized');
  }

  /** Build a map champion -> list of matchIds where the given player played that champion. */
  getChampionMatchMap(playerId: string): Map<string, string[]> {
    const player = this.playerService.getPlayerById(playerId)!;
    const map = new Map<string, string[]>();
    for (const matchId of player.matchIds) {
      const champ =
        this.matchsService.getMatchById(matchId)!.stats![playerId]!
          .championPlayed!;
      const arr = map.get(champ) || [];
      arr.push(matchId);
      map.set(champ, arr);
    }
    return map;
  }

  getTotalGames(): number {
    const matches = new Set<string>();
    this.playerService
      .getAllPlayers()
      .forEach((p) => p.matchIds.forEach((m) => matches.add(m)));
    return matches.size;
  }

  getTotalUniquePlayers(): number {
    return this.playerService.getAllPlayers().length;
  }

  getKDAranking(playerId: string): number | undefined {
    const player = this.playerService.getPlayerById(playerId);
    if (!player) return undefined;
    const all = this.playerService
      .getAllPlayers()
      .map((p) => ({ id: p.uid, kda: this.getKDAValue(p) }));
    all.sort((a, b) => b.kda - a.kda);
    const idx = all.findIndex((x) => x.id === playerId);
    return idx >= 0 ? idx + 1 : undefined;
  }

  getRadarData(currentRadarPlayerId: string | null): unknown {
    const player = this.playerService.getPlayerById(currentRadarPlayerId || '');
    if (!player) return null;
    const role = player.role as Role;
    let radarLabels = RADAR_CHART_LABELS;
    let averageStats = this.getAveragePlayersRadarStats(player.role);
    let playerStats = this.getRadarStats(player);
    if (role === Role.SUPPORT) {
      radarLabels = ['KDA', 'DPM', 'KP', 'GPM', 'Dmg/Gold', 'VS/m'];
      averageStats = averageStats.slice(0, radarLabels.length);
      playerStats = playerStats.slice(0, radarLabels.length);
    }
    const datas = {
      labels: radarLabels,
      datasets: [
        {
          label: `Average ${player.role}`,
          data: averageStats,
          borderColor: ACCENT_COLOR,
          backgroundColor: ACCENT_COLOR + '30',
        },
        {
          label: player.name,
          data: playerStats,
          borderColor: PRIMARY_COLOR,
          backgroundColor: PRIMARY_COLOR + '30',
        },
      ],
    };
    return datas;
  }

  private getPlayersForRole(role: Role): Player[] {
    return this.playerService.getAllPlayers().filter((p) => p.role === role);
  }

  private getAveragePlayersRadarStats(role: Role): number[] {
    const players = this.getPlayersForRole(role);
    if (players.length === 0) return Array(RADAR_CHART_LABELS.length).fill(0);

    const totalStats = players.reduce((acc, player) => {
      const playerStats = this.getRadarStats(player);
      return acc.map((stat, index) => stat + playerStats[index]);
    }, Array(RADAR_CHART_LABELS.length).fill(0));

    return totalStats.map((stat) => stat / players.length);
  }

  private getRoleMetricBounds(role: Role): { min: number; max: number }[] {
    const players = this.getPlayersForRole(role);
    const metrics = players.map((p) => this.getRawRadarMetrics(p));

    if (metrics.length === 0) {
      return RADAR_CHART_LABELS.map(() => ({ min: 0, max: 0 }));
    }

    return RADAR_CHART_LABELS.map((_, i) => {
      const values = metrics.map((m) => m[i]).filter((v) => Number.isFinite(v));
      let min = values.length ? Math.min(...values) : 0;
      let max = values.length ? Math.max(...values) : 0;

      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 0;

      if (min === max && max !== 0) min = 0;

      return { min, max };
    });
  }

  private getRawRadarMetrics(player: Player): number[] {
    return [
      this.getKDAValue(player),
      this.getDamagePerMinuteValue(player),
      this.getKillParticipationValue(player),
      this.getGoldPerMinuteValue(player),
      this.getDamagePerGoldValue(player),
      this.getVisionScorePerMinuteValue(player),
      this.getCSPerMinuteValue(player),
    ];
  }

  // --- Statistical helper methods moved from PlayerService ---
  getTotalMinutesPlayed(player: Player): number {
    return player.stats.totalTimePlayed / 1000 / 60;
  }

  getCSPerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const csPerMin = player.stats.totalMinionsKilled / totalMinutes;
    return csPerMin.toFixed(2);
  }

  getCSPerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalMinionsKilled / totalMinutes;
  }

  getDamagePerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const damagePerMin = player.stats.totalDamageDealt / totalMinutes;
    return damagePerMin.toFixed(0);
  }

  getDamagePerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalDamageDealt / totalMinutes;
  }

  getGoldPerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const goldPerMin = player.stats.totalGoldEarned / totalMinutes;
    return goldPerMin.toFixed(0);
  }

  getGoldPerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0 ? 0 : player.stats.totalGoldEarned / totalMinutes;
  }

  getDamagePerGold(player: Player): string {
    if (player.stats.totalGoldEarned === 0) return '0.00';
    const damagePerGold =
      player.stats.totalDamageDealt / player.stats.totalGoldEarned;
    return damagePerGold.toFixed(2);
  }

  getDamagePerGoldValue(player: Player): number {
    return player.stats.totalGoldEarned === 0
      ? 0
      : player.stats.totalDamageDealt / player.stats.totalGoldEarned;
  }

  getKillParticipation(player: Player): string {
    if (player.stats.totalTeamKills === 0) return '0.00%';
    const participation =
      ((player.stats.totalKills + player.stats.totalAssists) /
        player.stats.totalTeamKills) *
      100;
    return participation.toFixed(1) + '%';
  }

  getKillParticipationValue(player: Player): number {
    return player.stats.totalTeamKills === 0
      ? 0
      : ((player.stats.totalKills + player.stats.totalAssists) /
          player.stats.totalTeamKills) *
          100;
  }

  getVisionScorePerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const visionPerMin = player.stats.totalVisionScore / totalMinutes;
    return visionPerMin.toFixed(2);
  }

  getVisionScorePerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalVisionScore / totalMinutes;
  }

  getControlWardsPerGame(player: Player): string {
    const totalGames = player.matchIds.length;
    const total = player.stats.totalControlWardsPurchased ?? 0;
    if (totalGames === 0) return '0.00';
    return (total / totalGames).toFixed(2);
  }

  getControlWardsPerGameValue(player: Player): number {
    const totalGames = player.matchIds.length;
    const total = player.stats.totalControlWardsPurchased ?? 0;
    return totalGames === 0 ? 0 : total / totalGames;
  }

  getWinRate(player: Player): string {
    const totalGames = player.matchIds.length;
    if (totalGames === 0) return '0.0%';
    const winRate = (player.stats.wins / totalGames) * 100;
    return winRate.toFixed(1) + '%';
  }

  getWinRateValue(player: Player): number {
    const totalGames = player.matchIds.length;
    return totalGames === 0 ? 0 : (player.stats.wins / totalGames) * 100;
  }

  getKDA(player: Player): string {
    const stats = player.stats;
    if (stats.totalDeaths === 0) {
      return 'Perfect KDA';
    }
    const kda = (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
    return kda.toFixed(2);
  }

  getKDAValue(player: Player): number {
    const stats = player.stats;
    if (stats.totalDeaths === 0) {
      return stats.totalKills + stats.totalAssists;
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  getMostPlayedChampionName(player: Player): string {
    const champions = player.stats.championPlayed;
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

  getKDAColorClass(player: Player, players?: Player[]): string {
    const pool = players ?? this.playerService.getAllPlayers();
    const kdaValue = this.getKDAValue(player);
    const allKDAs = pool
      .map((p: Player) => this.getKDAValue(p))
      .sort((a: number, b: number) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(
      allKDAs.length * PlayerStatisticsService.PERCENTILE_25
    );
    const percentile75Index = Math.floor(
      allKDAs.length * PlayerStatisticsService.PERCENTILE_75
    );

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

  private scaleToPercent(value: number, min: number, max: number): number {
    if (max === min) {
      return value === max ? 100 : 0;
    }
    const clamped = Math.max(min, Math.min(max, value));
    return ((clamped - min) / (max - min)) * 100;
  }

  private getRadarStats(player: Player): number[] {
    const role = player.role as Role;
    const bounds = this.getRoleMetricBounds(role);
    const raw = this.getRawRadarMetrics(player);

    return raw.map((val, i) => {
      const { min, max } = bounds[i];
      return Math.round(this.scaleToPercent(val, min, max) * 100) / 100;
    });
  }

  /** For each champion a player has played, request aggregated stats from server for the matches where that champion was played. */
  async fetchPerChampionStats(playerId: string): Promise<PerChampionStats[]> {
    const map = this.getChampionMatchMap(playerId);
    const out: PerChampionStats[] = [];
    for (const [champ, ids] of map) {
      const stats = await firstValueFrom(
        this.communicationService.getPlayerStatsForMatches(playerId, ids)
      );
      out.push({ name: champ, count: ids.length, stats });
    }
    return out.sort((a, b) => b.count - a.count);
  }

  /** Fetch aggregated stats for a single champion for a player. */
  async getStatsForChampion(
    playerId: string,
    champion: string
  ): Promise<PerChampionStats | undefined> {
    const ids = this.getChampionMatchMap(playerId).get(champion)!;
    const stats = await firstValueFrom(
      this.communicationService.getPlayerStatsForMatches(playerId, ids)
    );
    return { name: champion, count: ids.length, stats };
  }

  /** Build a PlayerStatView for a given player id using the current player map. */
  getPlayerStatView(playerId: string): {
    stats:
      | {
          numberOfGames: number;
          wins: number;
          averageKDA: string;
          averageCS: number;
          averageGold: number;
          averageDamage: number;
          averageVisionScore: number;
        }
      | undefined;
    player?: Player;
  } {
    const player = this.playerService.getPlayerById(playerId);
    if (!player) return { stats: undefined };

    const numberOfGames = player.matchIds.length;
    const wins = player.stats.wins;
    const averageKDA = this.getKDA(player);
    const averageCS = Math.round(this.getCSPerMinuteValue(player) * 10) / 10;
    const averageGold =
      Math.round(this.getGoldPerMinuteValue(player) * 10) / 10;
    const averageDamage =
      Math.round(this.getDamagePerMinuteValue(player) * 10) / 10;
    const averageVisionScore =
      Math.round(this.getVisionScorePerMinuteValue(player) * 10) / 10;

    const stats = {
      numberOfGames,
      wins,
      averageKDA,
      averageCS,
      averageGold,
      averageDamage,
      averageVisionScore,
    };

    return { stats, player };
  }
}
