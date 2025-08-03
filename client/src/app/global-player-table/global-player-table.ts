import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { Communication } from '../services/communication/communication';
import { Player, PlayerStat } from '@common/interfaces/match';

@Component({
  selector: 'app-global-player-table',
  imports: [MatTableModule, MatButtonModule, MatSortModule, CommonModule],
  templateUrl: './global-player-table.html',
  styleUrl: './global-player-table.scss',
})
export class GlobalPlayerTable implements OnInit {
  displayedColumns: string[] = [
    'name',
    'role',
    'matches',
    'kda',
    'kills/game',
    'actions',
  ];
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
}
