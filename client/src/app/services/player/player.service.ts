import { Injectable, inject } from '@angular/core';
import { Player, PlayerStat } from '@common/interfaces/match';
import { TeamsService } from '../teams/teams.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private static readonly PERFECT_KDA_VALUE = Infinity;
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  private readonly teamsService = inject(TeamsService);

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
      return PlayerService.PERFECT_KDA_VALUE;
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  getKDAColorClass(player: Player, players: Player[]): string {
    const kdaValue = this.getKDAValue(player);
    const allKDAs = players
      .map((p) => this.getKDAValue(p))
      .sort((a, b) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(
      allKDAs.length * PlayerService.PERCENTILE_25
    );
    const percentile75Index = Math.floor(
      allKDAs.length * PlayerService.PERCENTILE_75
    );

    const percentile25 = allKDAs[percentile25Index];
    const percentile75 = allKDAs[percentile75Index];

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
}
