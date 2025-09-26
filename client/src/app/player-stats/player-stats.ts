import { Component, inject, OnInit } from '@angular/core';
import { LucideAngularModule, Swords, LandPlot, Zap } from 'lucide-angular';
import { PlayerService } from '../services/player/player.service';
import { PlayerStatisticsService } from '../services/player/player-statistics.service';
import { RadarPlayerChart } from '../radar-player-chart/radar-player-chart';
import { PerChampionStats } from '@common/interfaces/match';

export interface PlayerStatView {
  numberOfGames: number;
  wins: number;
  averageKDA: string;
  averageCS: number;
  averageGold: number;
  averageDamage: number;
  averageVisionScore: number;
}

@Component({
  selector: 'app-player-stats',
  imports: [LucideAngularModule, RadarPlayerChart],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStats implements OnInit {
  readonly Swords = Swords;
  readonly LandPlot = LandPlot;
  readonly Zap = Zap;

  protected perChampionStats: PerChampionStats[] = [];

  private readonly playerService: PlayerService = inject(PlayerService);
  private readonly playerStatisticsService: PlayerStatisticsService = inject(
    PlayerStatisticsService
  );

  get playerId(): string | null {
    return this.playerService.currentRadarPlayerId;
  }

  get totalGames(): number {
    return this.playerStatisticsService.getTotalGames();
  }

  get KDAranking(): number {
    return this.playerStatisticsService.getKDAranking(this.playerId!) || 0;
  }

  get totalUniquePlayers(): number {
    return this.playerStatisticsService.getTotalUniquePlayers();
  }

  get stats(): PlayerStatView {
    return (
      this.playerStatisticsService.getPlayerStatView(this.playerId!)?.stats || {
        numberOfGames: 0,
        wins: 0,
        averageKDA: '0',
        averageCS: 0,
        averageGold: 0,
        averageDamage: 0,
        averageVisionScore: 0,
      }
    );
  }

  get winRate(): string {
    if (this.stats.numberOfGames === 0) return '0%';
    const rate = (this.stats.wins / this.stats.numberOfGames) * 100;
    return rate.toFixed(1) + '%';
  }

  ngOnInit(): void {
    this.getMostPlayedChampions();
  }

  async getMostPlayedChampions(): Promise<PerChampionStats[]> {
    this.perChampionStats =
      await this.playerStatisticsService.fetchPerChampionStats(this.playerId!);
    console.log('Most played champions:', this.perChampionStats);
    return this.perChampionStats;
  }
}
