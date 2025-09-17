import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Player, PlayerStat, Role, Team } from '@common/interfaces/match';
import { TeamsService } from '../teams/teams.service';
import { CommunicationService } from '../communication/communication.service';

// Minimal view representation used by the PlayerStats component
interface PlayerStatView {
  numberOfGames: number;
  wins: number;
  averageKDA: string;
  averageCS: number;
  averageGold: number;
  averageDamage: number;
  averageVisionScore: number;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  currentRadarPlayerId: string | null = null;
  private static readonly PERFECT_KDA_VALUE = Infinity;
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  private readonly teamsService = inject(TeamsService);
  private readonly communicationService = inject(CommunicationService);

  // Internal observable keeping current summary players
  private readonly players$ = new BehaviorSubject<Player[]>([]);

  /** Read-only observable for components that want to react to player updates */
  get playersObservable() {
    return this.players$.asObservable();
  }

  private readonly playerMap: Map<string, Player> = new Map();

  updatePlayerMap(players: Player[]): void {
    this.playerMap.clear();
    players.forEach((player) => {
      this.playerMap.set(player.uid, player);
    });
  }

  /**
   * Initialize service by fetching the application summary and populating
   * the teams mapping and internal player map. This uses the same API as
   * the rest of the app (`CommunicationService.getSummary`).
   */
  async initializeFromSummary(): Promise<void> {
    const summary = await firstValueFrom(
      this.communicationService.getSummary()
    );
    // update teams mapping so TeamsService can resolve names
    this.teamsService.updateTeamMap(summary.teamList);
    // update players
    this.updatePlayerMap(summary.playerList);
    this.players$.next(summary.playerList);
  }

  /**
   * Force refresh summary and update internal state. Returns the fetched players.
   */
  async refreshSummary(): Promise<Player[]> {
    const summary = await firstValueFrom(
      this.communicationService.getSummary()
    );
    // Update player map first
    this.updatePlayerMap(summary.playerList);
    this.players$.next(summary.playerList);

    // If server provided teamList, use it. Otherwise derive teams from players.
    let teamsToUse: Team[] = [];
    if (summary.teamList && summary.teamList.length > 0) {
      teamsToUse = summary.teamList;
    } else {
      const ids = Array.from(
        new Set(
          summary.playerList
            .map((p) => p.teamId)
            .filter((id): id is number => id !== undefined && id !== null)
        )
      );
      teamsToUse = ids.map((id) => ({
        id,
        name: this.teamsService.getTeamName(id),
        playersIds: [],
        matchIds: [],
      }));
    }

    this.teamsService.updateTeamMap(teamsToUse);

    return summary.playerList;
  }

  /**
   * Ask the server to reload teams+matches and then refresh the local summary.
   * This centralizes reload logic so components don't need to call CommunicationService directly.
   */
  async reloadAllAndRefresh(): Promise<Player[]> {
    // trigger server side reload
    await firstValueFrom(this.communicationService.reloadAll());
    // refresh local state from updated summary
    return this.refreshSummary();
  }

  getPlayerById(playerId: string): Player | undefined {
    return this.playerMap.get(playerId);
  }

  getPlayerByName(playerName: string): Player | undefined {
    const lowerName = playerName.toLowerCase();
    return Array.from(this.playerMap.values()).find(
      (player) => player.name.toLowerCase() === lowerName
    );
  }

  getAllPlayers(): Player[] {
    return Array.from(this.playerMap.values());
  }

  /**
   * Build the PlayerStatView for a given player id using the current player map.
   * Returns undefined if the player is not found.
   */
  getPlayerStatView(playerId: string): {
    stats: PlayerStatView | undefined;
    player?: Player;
  } {
    const player = this.getPlayerById(playerId);
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

    const stats: PlayerStatView = {
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

  /** Total games across all matches (sum of matchIds length on players is not ideal but useful here) */
  getTotalGames(): number {
    // Prefer using match list if available via summary: here we approximate by summing unique match ids across players
    const matches = new Set<string>();
    this.getAllPlayers().forEach((p) =>
      p.matchIds.forEach((m) => matches.add(m))
    );
    return matches.size;
  }

  /** Return rank of player's KDA among all players (1-based, 1 = best). Returns undefined if player not found. */
  getKDAranking(playerId: string): number | undefined {
    const player = this.getPlayerById(playerId);
    if (!player) return undefined;
    const all = this.getAllPlayers().map((p) => ({
      id: p.uid,
      kda: this.getKDAValue(p),
    }));
    all.sort((a, b) => b.kda - a.kda); // descending
    const idx = all.findIndex((x) => x.id === playerId);
    return idx >= 0 ? idx + 1 : undefined;
  }

  getTotalUniquePlayers(): number {
    return this.getAllPlayers().length;
  }

  getKDA(player: Player): string {
    const stats: PlayerStat = player.stats;
    if (stats.totalDeaths === 0) {
      return 'Perfect KDA';
    }
    const kda = (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
    return kda.toFixed(2);
  }

  getKDAValue(player: Player): number {
    const stats: PlayerStat = player.stats;
    if (stats.totalDeaths === 0) {
      return stats.totalKills + stats.totalAssists;
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  /**
   * Determine a color class for a player's KDA compared to the current
   * known player pool. If `players` is omitted, uses the internal player list
   * populated from the last summary fetch.
   */
  getKDAColorClass(player: Player, players?: Player[]): string {
    const pool = players ?? this.getAllPlayers();
    const kdaValue = this.getKDAValue(player);
    const allKDAs = pool.map((p) => this.getKDAValue(p)).sort((a, b) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(
      allKDAs.length * PlayerService.PERCENTILE_25
    );
    const percentile75Index = Math.floor(
      allKDAs.length * PlayerService.PERCENTILE_75
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

  getMostPlayedChampion(player: Player): string {
    const champions = player.stats.championPlayed;
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

  getRoleBadgeClass(role: string): string {
    const roleMap: { [key: string]: string } = {
      TOP: 'badge-warning',
      JGL: 'badge-primary',
      MID: 'badge-info',
      ADC: 'badge-error',
      SUP: 'badge-secondary',
    };

    const normalizedRole = role.toUpperCase();
    return roleMap[normalizedRole] || 'badge-neutral';
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
      winRate: () => this.getWinRateValue(player),
      mostPlayedChampion: () => this.getMostPlayedChampionName(player),
    };

    return sortMethods[column]?.() ?? 0;
  }

  getRadarData(): unknown {
    const player = this.getPlayerById(this.currentRadarPlayerId || '');
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
    return this.getAllPlayers().filter((p) => p.role === role);
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

  /**
   * Scale a raw metric value to 0..100 given bounds where 100 maps to max and 0 to min.
   * If max === min, returns 100 when value === max, otherwise 0. Bounds expected to be finite.
   */
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
}

export const RADAR_CHART_LABELS = [
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
