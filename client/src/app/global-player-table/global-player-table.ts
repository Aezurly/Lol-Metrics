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
  players: Player[] = [];
  loading = true;
  error: string | null = null;

  constructor(private readonly communication: Communication) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.communication.getSummary().subscribe({
      next: (summary) => {
        this.players = summary.playerList;
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
      return 99; // High value for perfect KDA
    }
    return (stats.totalKills + stats.totalAssists) / stats.totalDeaths;
  }

  protected getKDAColorClass(player: Player): string {
    const kdaValue = this.getKDAValue(player);
    const allKDAs = this.players
      .map((p) => this.getKDAValue(p))
      .sort((a, b) => a - b);

    if (allKDAs.length === 0) return '';

    const percentile25Index = Math.floor(allKDAs.length * 0.25);
    const percentile75Index = Math.floor(allKDAs.length * 0.75);

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
}
