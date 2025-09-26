import { Component } from '@angular/core';
import { LucideAngularModule, Swords, LandPlot, Zap } from 'lucide-angular';
import { PlayerManagerService } from '../services/player/player-manager.service';
import { PlayerStatService } from '../services/player/player-stat.service';
import { RadarPlayerChart } from '../radar-player-chart/radar-player-chart';
import { PlayerEvolutionChart } from '../player-evolution-chart/player-evolution-chart';

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
  imports: [LucideAngularModule, RadarPlayerChart, PlayerEvolutionChart],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStats {
  readonly Swords = Swords;
  readonly LandPlot = LandPlot;
  readonly Zap = Zap;

  constructor(
    private readonly playerManager: PlayerManagerService,
    private readonly playerStat: PlayerStatService
  ) {}

  get playerId(): string | null {
    return this.playerManager.currentRadarPlayerId;
  }

  get totalGames(): number {
    return this.playerManager.getTotalGames();
  }

  get KDAranking(): number {
    return this.playerManager.getKDAranking(this.playerId!) || 0;
  }

  get totalUniquePlayers(): number {
    return this.playerManager.getTotalUniquePlayers();
  }

  get stats(): PlayerStatView {
    const view = this.playerManager.getPlayerStatView(this.playerId!)
      ?.stats || { numberOfGames: 0, wins: 0 };
    const player = this.playerManager.getPlayerById(this.playerId || '');
    return {
      numberOfGames: view.numberOfGames ?? 0,
      wins: view.wins ?? 0,
      averageKDA: player ? this.playerStat.getKDA(player) : '0',
      averageCS: player
        ? Math.round(this.playerStat.getCSPerMinuteValue(player) * 10) / 10
        : 0,
      averageGold: player
        ? Math.round(this.playerStat.getGoldPerMinuteValue(player) * 10) / 10
        : 0,
      averageDamage: player
        ? Math.round(this.playerStat.getDamagePerMinuteValue(player) * 10) / 10
        : 0,
      averageVisionScore: player
        ? Math.round(
            this.playerStat.getVisionScorePerMinuteValue(player) * 10
          ) / 10
        : 0,
    };
  }

  get winRate(): string {
    if (this.stats.numberOfGames === 0) return '0%';
    const rate = (this.stats.wins / this.stats.numberOfGames) * 100;
    return rate.toFixed(1) + '%';
  }
}
