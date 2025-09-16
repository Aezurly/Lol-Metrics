import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Match, PlayerMatchData } from '@common/interfaces/match';
import {
  MatchsService,
  MatchRecap,
  PlayerRecap,
} from '../services/matchs.service';
import { TeamsService } from '../services/teams/teams.service';

@Component({
  selector: 'app-match-recap',
  imports: [CommonModule],
  templateUrl: './match-recap.html',
  styleUrl: './match-recap.scss',
})
export class MatchRecapComponent {
  private readonly MS_PER_MINUTE = 60000;
  private readonly MS_PER_SECOND = 1000;
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
    console.log(this.recap?.players);
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

  getDamageStats(playerId: string): string {
    const totalDamage = this.getDamage(playerId);
    const damageInThousands = totalDamage / 1000;
    const formattedDamage =
      damageInThousands >= 1
        ? `${damageInThousands.toFixed(1)}k`
        : totalDamage.toString();
    return `${formattedDamage}`;
  }

  getDamageBarWidth(playerId: string): string {
    const damage = this.getDamage(playerId);
    const maxDamage = Math.max(
      ...(this.recap?.players.map((p) => this.getDamage(p.id)) ?? [0])
    );
    return (maxDamage > 0 ? (damage / maxDamage) * 100 : 0).toString();
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

    if (percentile >= 90) return 'text-amber-500';
    if (percentile >= 80) return 'text-violet-500';
    if (percentile >= 60) return 'text-blue-400';
    if (percentile >= 20) return '';
    return 'text-red-600';
  }
}
