import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunicationService } from '../services/communication/communication.service';
import { Player, PlayerStat } from '@common/interfaces/match';

@Component({
  selector: 'app-global-player-table',
  imports: [CommonModule],
  templateUrl: './global-player-table.html',
  styleUrl: './global-player-table.scss',
})
export class GlobalPlayerTable implements OnInit {
  private static readonly PERFECT_KDA_VALUE = Infinity;
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  players: Player[] = [];
  originalPlayers: Player[] = [];
  loading = true;
  error: string | null = null;

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  constructor(private readonly communication: CommunicationService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.communication.getSummary().subscribe({
      next: (summary) => {
        this.originalPlayers = [...summary.playerList];
        this.players = [...summary.playerList];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data: ' + err.message;
        this.loading = false;
        console.error('Error loading summary:', err);
      },
    });
  }

  reloadData(): void {
    this.communication.reloadAll().subscribe({
      next: (response) => {
        console.log(response.message);
        this.loadData();
      },
      error: (err) => {
        this.error = 'Failed to reload data: ' + err.message;
        console.error('Error reloading data:', err);
      },
    });
  }

  protected getKDA(player: Player): string {
    const stats: PlayerStat = player.stats;
    if (stats.totalDeaths === 0) {
      return 'Perfect KDA';
    }
    const kda = (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
    return kda.toFixed(2);
  }

  protected getKDAValue(player: Player): number {
    const stats: PlayerStat = player.stats;
    if (stats.totalDeaths === 0) {
      return GlobalPlayerTable.PERFECT_KDA_VALUE;
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  protected getKDAColorClass(player: Player): string {
    const kdaValue = this.getKDAValue(player);
    const allKDAs = this.players
      .map((p) => this.getKDAValue(p))
      .sort((a, b) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(
      allKDAs.length * GlobalPlayerTable.PERCENTILE_25
    );
    const percentile75Index = Math.floor(
      allKDAs.length * GlobalPlayerTable.PERCENTILE_75
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

  protected getTotalMinutesPlayed(player: Player): number {
    return player.stats.totalTimePlayed / 1000 / 60;
  }

  protected getCSPerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const csPerMin = player.stats.totalMinionsKilled / totalMinutes;
    return csPerMin.toFixed(2);
  }

  protected getDamagePerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const damagePerMin = player.stats.totalDamageDealt / totalMinutes;
    return damagePerMin.toFixed(0);
  }

  protected getGoldPerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const goldPerMin = player.stats.totalGoldEarned / totalMinutes;
    return goldPerMin.toFixed(0);
  }

  protected getDamagePerGold(player: Player): string {
    if (player.stats.totalGoldEarned === 0) return '0.00';
    const damagePerGold =
      player.stats.totalDamageDealt / player.stats.totalGoldEarned;
    return damagePerGold.toFixed(2);
  }

  protected getKillParticipation(player: Player): string {
    if (player.stats.totalTeamKills === 0) return '0.00%';
    const participation =
      ((player.stats.totalKills + player.stats.totalAssists) /
        player.stats.totalTeamKills) *
      100;
    return participation.toFixed(1) + '%';
  }

  protected getVisionScorePerMinute(player: Player): string {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    if (totalMinutes === 0) return '0.00';
    const visionPerMin = player.stats.totalVisionScore / totalMinutes;
    return visionPerMin.toFixed(2);
  }

  protected getMostPlayedChampion(player: Player): string {
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

  protected getRoleBadgeClass(role: string): string {
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

  protected sortBy(column: string): void {
    if (this.sortColumn === column) {
      // Cycle through: asc -> desc -> null (reset)
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = null;
        this.sortColumn = null;
      }
    } else {
      // New column, start with ascending
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
  }

  private applySorting(): void {
    if (!this.sortColumn || !this.sortDirection) {
      // Reset to original order
      this.players = [...this.originalPlayers];
      return;
    }

    this.players.sort((a, b) => {
      const valueA = this.getSortValue(a, this.sortColumn!);
      const valueB = this.getSortValue(b, this.sortColumn!);

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private getSortValue(player: Player, column: string): number | string {
    switch (column) {
      case 'name':
        return player.name.toLowerCase();
      case 'role':
        return player.role.toLowerCase();
      case 'teamId':
        return player.teamId ?? -1;
      case 'matches':
        return player.matchIds.length;
      case 'kda':
        return this.getKDAValue(player);
      case 'kills':
        return player.stats.totalKills / player.matchIds.length;
      case 'deaths':
        return player.stats.totalDeaths / player.matchIds.length;
      case 'csPerMin':
        return this.getCSPerMinuteValue(player);
      case 'damagePerMin':
        return this.getDamagePerMinuteValue(player);
      case 'goldPerMin':
        return this.getGoldPerMinuteValue(player);
      case 'damagePerGold':
        return this.getDamagePerGoldValue(player);
      case 'killParticipation':
        return this.getKillParticipationValue(player);
      case 'visionPerMin':
        return this.getVisionScorePerMinuteValue(player);
      case 'mostPlayedChampion':
        return this.getMostPlayedChampionName(player);
      default:
        return 0;
    }
  }

  private getCSPerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalMinionsKilled / totalMinutes;
  }

  private getDamagePerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalDamageDealt / totalMinutes;
  }

  private getGoldPerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0 ? 0 : player.stats.totalGoldEarned / totalMinutes;
  }

  private getDamagePerGoldValue(player: Player): number {
    return player.stats.totalGoldEarned === 0
      ? 0
      : player.stats.totalDamageDealt / player.stats.totalGoldEarned;
  }

  private getKillParticipationValue(player: Player): number {
    return player.stats.totalTeamKills === 0
      ? 0
      : ((player.stats.totalKills + player.stats.totalAssists) /
          player.stats.totalTeamKills) *
          100;
  }

  private getVisionScorePerMinuteValue(player: Player): number {
    const totalMinutes = this.getTotalMinutesPlayed(player);
    return totalMinutes === 0
      ? 0
      : player.stats.totalVisionScore / totalMinutes;
  }

  private getMostPlayedChampionName(player: Player): string {
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

  protected isSorted(column: string): boolean {
    return this.sortColumn === column && this.sortDirection !== null;
  }
}
