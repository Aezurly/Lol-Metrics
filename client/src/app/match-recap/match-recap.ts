import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Match, PlayerMatchData } from '@common/interfaces/match';
import {
  MatchsService,
  MatchRecap,
  PlayerRecap,
} from '../services/matchs.service';
import { TeamsService } from '../services/teams/teams.service';

export enum StatsToCompare {
  DAMAGE = 'DAMAGE',
  GOLD = 'GOLD',
  MINIONS = 'MINIONS',
  VISION = 'VISION',
}

@Component({
  selector: 'app-match-recap',
  imports: [CommonModule],
  templateUrl: './match-recap.html',
  styleUrl: './match-recap.scss',
})
export class MatchRecapComponent {
  private readonly MS_PER_MINUTE = 60000;
  private readonly MS_PER_SECOND = 1000;
  // KDA color percentile thresholds (named to satisfy lint rules)
  private readonly KDA_PERCENTILE_AMBER = 90;
  private readonly KDA_PERCENTILE_VIOLET = 80;
  private readonly KDA_PERCENTILE_BLUE = 60;
  private readonly KDA_PERCENTILE_RED = 20;
  protected statToCompare = StatsToCompare.DAMAGE;

  constructor(
    public readonly matchsService: MatchsService,
    public readonly teamsService: TeamsService
  ) {}

  get match(): Match | undefined {
    if (!this.matchsService.selectedMatchId) return undefined;

    return this.matchsService.getMatchById(this.matchsService.selectedMatchId);
  }

  get recap(): MatchRecap | undefined {
    const m = this.match;
    if (!m) return undefined;
    return this.matchsService.buildRecap(m);
  }

  // rows 0..4 for 5 players per side
  get rows(): number[] {
    return Array.from({ length: 5 }).map((_, i) => i);
  }

  get bluePlayers() {
    return this.recap?.players.filter((p) => p.side === 0) ?? [];
  }

  get redPlayers() {
    return this.recap?.players.filter((p) => p.side === 1) ?? [];
  }

  formatDuration(ms: number | undefined): string {
    if (ms == null) return '0:00';
    const minutes = Math.floor(ms / this.MS_PER_MINUTE);
    const seconds = Math.floor((ms % this.MS_PER_MINUTE) / this.MS_PER_SECOND)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  getStats(playerId: string): string {
    const statValue = this.getStatValueBySelected(playerId);

    // Format depending on stat type
    if (
      this.statToCompare === StatsToCompare.DAMAGE ||
      this.statToCompare === StatsToCompare.GOLD
    ) {
      const statInThousands = statValue / 1000;
      return statInThousands >= 1
        ? `${statInThousands.toFixed(1)}k`
        : statValue.toString();
    }

    // For minions and vision, integer display
    return Math.round(statValue).toString();
  }

  getBarWidth(playerId: string): string {
    // compute numeric stat for the player and the max among players according to selected stat
    const playerStat = this.getStatValueBySelected(playerId);
    const allStats = this.recap?.players.map((p) =>
      this.getStatValueBySelected(p.id)
    ) ?? [0];
    const maxStat = Math.max(...allStats, 0);

    const pct = maxStat > 0 ? (playerStat / maxStat) * 100 : 0;
    // keep a fixed precision for width but return plain number string for template percentage
    return pct.toFixed(2).toString();
  }

  /**
   * Return the numeric stat for a player according to the current `statToCompare`.
   */
  private getStatValueBySelected(playerId: string): number {
    switch (this.statToCompare) {
      case StatsToCompare.DAMAGE:
        return this.getDamage(playerId);
      case StatsToCompare.GOLD: {
        const player = this.match?.stats[playerId];
        return player?.income?.goldEarned ?? 0;
      }
      case StatsToCompare.MINIONS: {
        const player = this.match?.stats[playerId];
        // prefer lane minions then neutral minions if available
        return (
          player?.income?.totalMinionsKilled ??
          player?.income?.neutralMinionsKilled ??
          0
        );
      }
      case StatsToCompare.VISION: {
        const player = this.match?.stats[playerId];
        return player?.vision?.visionScore ?? 0;
      }
      default:
        return 0;
    }
  }

  getDamage(playerId: string): number {
    const player: PlayerMatchData | undefined = this.match?.stats[playerId];
    const totalDamage = player?.damage.totalDamageToChampions;
    if (!totalDamage) return 0;
    return totalDamage;
  }

  getKda(player: PlayerRecap): string {
    if (player.d === 0) {
      return (player.k + player.a).toFixed(1);
    }
    const kda = (player.k + player.a) / Math.max(1, player.d);
    return kda.toFixed(1);
  }

  getKdaColorClass(player: PlayerRecap): string {
    const kda = parseFloat(this.getKda(player));
    const allPlayerKdas =
      this.recap?.players.map((p) => parseFloat(this.getKda(p))) ?? [];
    allPlayerKdas.sort((a, b) => b - a); // Sort descending

    const playerRank = allPlayerKdas.indexOf(kda) + 1;
    const percentile =
      ((allPlayerKdas.length - playerRank + 1) / allPlayerKdas.length) * 100;

    if (percentile >= this.KDA_PERCENTILE_AMBER) {
      return 'text-amber-500';
    } else if (percentile >= this.KDA_PERCENTILE_VIOLET) {
      return 'text-violet-500';
    } else if (percentile >= this.KDA_PERCENTILE_BLUE) {
      return 'text-blue-400';
    } else if (percentile >= this.KDA_PERCENTILE_RED) {
      return '';
    }

    return 'text-red-600';
  }

  protected selectStat(stat: string): void {
    this.statToCompare = stat as StatsToCompare;
  }
}
