import { Component, Input } from '@angular/core';
import { LucideAngularModule, Swords, LandPlot, Zap } from 'lucide-angular';
import { PlayerService } from '../services/player/player.service';

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
  imports: [LucideAngularModule],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStats {
  readonly Swords = Swords;
  readonly LandPlot = LandPlot;
  readonly Zap = Zap;

  @Input() playerId!: string | null;

  constructor(private readonly playerService: PlayerService) {}

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
