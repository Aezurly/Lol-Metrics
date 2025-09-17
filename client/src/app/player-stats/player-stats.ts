import { Component, Input } from '@angular/core';
import { LucideAngularModule, Swords, LandPlot, Zap } from 'lucide-angular';
import { PlayerService } from '../services/player/player.service';
import { RadarPlayerChart } from '../radar-player-chart/radar-player-chart';

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
export class PlayerStats {
  readonly Swords = Swords;
  readonly LandPlot = LandPlot;
  readonly Zap = Zap;

  constructor(private readonly playerService: PlayerService) {}

  get playerId(): string | null {
    return this.playerService.currentRadarPlayerId;
  }

  get totalGames(): number {
    return this.playerService.getTotalGames();
  }

  get KDAranking(): number {
    return this.playerService.getKDAranking(this.playerId!) || 0;
  }

  get totalUniquePlayers(): number {
    return this.playerService.getTotalUniquePlayers();
  }

  get stats(): PlayerStatView {
    return (
      this.playerService.getPlayerStatView(this.playerId!)?.stats || {
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
}
