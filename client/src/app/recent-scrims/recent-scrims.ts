import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrimsService, Scrim as svcScrim } from '../services/scrims.service';
import { TeamsService } from '../services/teams/teams.service';
import { Match } from '@common/interfaces/match';
import { MatchRecap, MatchsService } from '../services/matchs.service';

@Component({
  selector: 'app-recent-scrims',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-scrims.html',
  styleUrls: ['./recent-scrims.scss'],
})
export class RecentScrims implements OnInit {
  // View model aligned with template usage
  scrims: Scrim[] = [];
  scrimMatchsRecaps: Record<string, MatchRecap[]> = {};

  constructor(
    private readonly scrimsService: ScrimsService,
    private readonly teamsService: TeamsService,
    private readonly matchsService: MatchsService
  ) {}

  ngOnInit(): void {
    // Load scrims and map to the view model
    this.scrimsService.loadScrims().subscribe({
      next: (scrims) => {
        this.scrims = scrims.map((s) => this.toViewModel(s));
        this.scrims.forEach((s) => {
          const recaps = this.getMatchRecapForScrim(s);
          if (recaps.length > 0) this.scrimMatchsRecaps[s.dateIso] = recaps;
        });
      },
      error: (err) => console.error('Failed to load scrims', err),
    });
  }

  getMatchRecapForScrim(scrim: Scrim): MatchRecap[] {
    const recaps = scrim.matchIds
      .map((id) => this.matchsService.getMatchRecapById(id))
      .filter((m): m is MatchRecap => m !== undefined);
    return recaps;
  }

  private toViewModel(s: svcScrim): Scrim {
    const dateIsoOnly = this.toLocalIsoDate(s.date);
    const displayDate = this.formatDateFrench(dateIsoOnly);

    const ourTeamId = 0;
    const opponentId = s.opponentTeamId;

    const aWins = s.score?.[ourTeamId] ?? 0;
    const bWins = s.score?.[opponentId] ?? 0;

    return {
      matchIds: s.matchIds,
      dateIso: `${dateIsoOnly}::${opponentId}::${s.matchIds?.[0] ?? ''}`,
      displayDate,
      score: `${aWins} - ${bWins}`,
      teams: {
        a: { id: ourTeamId, name: this.teamsService.getTeamName(ourTeamId) },
        b: { id: opponentId, name: this.teamsService.getTeamName(opponentId) },
      },
    };
  }

  private toLocalIsoDate(d: Date): string {
    const date = new Date(d);
    // Build YYYY-MM-DD in local time to avoid timezone shifts
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateFrench(isoDate: string): string {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return isoDate;
    }
  }

  protected getSuccessClass(scrim: Scrim): string {
    const [aWins, bWins] = scrim.score.split(' - ').map(Number);
    return aWins > bWins ? 'badge-success' : '';
  }

  protected getPlayerGridClass(side: number, index: number): string {
    const col = side === 0 ? 1 : 2;
    const row = (index % 5) + 1;
    return `row-start-${row} row-end-${row + 1} col-${col}`;
  }

  // Return computed grid position to bind inline styles (wins over DaisyUI rules)
  protected getPlayerGridPos(
    side: number,
    index: number
  ): { row: number; col: number } {
    return {
      row: (index % 5) + 1,
      col: side === 0 ? 1 : 2,
    };
  }

  // Helper to split players by team side (0: blue, 1: red)
  protected getPlayersBySide(recap: MatchRecap, side: 0 | 1) {
    return recap.players.filter((p) => p.side === side);
  }

  // Determine if Blue side won
  protected isBlueVictory(recap: MatchRecap): boolean {
    if (recap.victoriousTeamId == null) return false;
    return recap.victoriousTeamId === recap.teamSides?.[0];
  }

  // Build label: "Victory (Blue Side)" / "Defeat (Red Side)"
  protected getSideOutcomeLabel(recap: MatchRecap, side: 0 | 1): string {
    const blueWon = this.isBlueVictory(recap);
    const isVictory = side === 0 ? blueWon : !blueWon;
    return `${isVictory ? 'Victory' : 'Defeat'}`;
  }

  protected getWinningTeamName(recap: MatchRecap): string {
    if (recap.victoriousTeamId == null) return 'N/A';
    const teamId = recap.victoriousTeamId;
    return this.teamsService.getTeamName(teamId);
  }

  protected getWinningSideName(recap: MatchRecap): string {
    if (recap.victoriousTeamId == null) return 'N/A';
    const teamId = recap.victoriousTeamId;
    return recap.teamSides?.[0] === teamId ? 'Blue Side' : 'Red Side';
  }

  protected getTeamNameBySide(recap: MatchRecap, side: 0 | 1): string {
    const teamId = recap.teamSides?.[side];
    if (teamId == null) return 'N/A';
    const teamName = this.teamsService.getTeamName(teamId);
    return teamName;
  }

  protected getMatchDuration(recap: MatchRecap): string {
    const minutes = Math.floor(recap.duration / 60000);
    const seconds = Math.floor((recap.duration % 60000) / 1000);
    return `${minutes}:${seconds}`;
  }
}

// Local view model for the template
interface Scrim {
  matchIds: string[];
  dateIso: string; // used for *trackBy*
  displayDate: string;
  score: string; // e.g., "2 - 1"
  teams?: {
    a?: { id: number; name: string };
    b?: { id: number; name: string };
  };
}
