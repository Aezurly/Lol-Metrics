import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Communication } from '../services/communication/communication';
import { Player, PlayerStat } from '@common/interfaces/match';

@Component({
  selector: 'app-global-player-table',
  imports: [CommonModule],
  templateUrl: './global-player-table.html',
  styleUrl: './global-player-table.scss',
})
export class GlobalPlayerTable implements OnInit {
  private static readonly PERFECT_KDA_VALUE = 99;
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  players: Player[] = [];
  originalPlayers: Player[] = [];
  loading = true;
  error: string | null = null;

  // Sorting state
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  constructor(private readonly communication: Communication) {}

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
        this.loadData(); // Reload the data after successful reload
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
      return GlobalPlayerTable.PERFECT_KDA_VALUE; // High value for perfect KDA
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
      return 'text-success'; // Blue for high KDA (75th percentile and above)
    } else if (kdaValue <= percentile25) {
      return 'text-error'; // Red for low KDA (25th percentile and below)
    }

    return ''; // Default color for middle range
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
      default:
        return 0;
    }
  }

  protected isSorted(column: string): boolean {
    return this.sortColumn === column && this.sortDirection !== null;
  }
}
