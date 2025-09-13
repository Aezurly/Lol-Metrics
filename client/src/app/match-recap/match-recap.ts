import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Match } from '@common/interfaces/match';
import { MatchsService, MatchRecap } from '../services/matchs.service';
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
}
