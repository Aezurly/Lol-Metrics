import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ScrimsService,
  Scrim as ServiceScrim,
} from '../services/scrims.service';
import { TeamsService } from '../services/teams/teams.service';

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

  constructor(
    private readonly scrimsService: ScrimsService,
    private readonly teamsService: TeamsService
  ) {}

  ngOnInit(): void {
    // Load scrims and map to the view model
    this.scrimsService.loadScrims().subscribe({
      next: (scrims) => {
        this.scrims = scrims.map((s) => this.toViewModel(s));
      },
      error: (err) => console.error('Failed to load scrims', err),
    });
  }

  private toViewModel(s: ServiceScrim): Scrim {
    const dateIsoOnly = this.toLocalIsoDate(s.date);
    const displayDate = this.formatDateFrench(dateIsoOnly);

    const ourTeamId = 0;
    const opponentId = s.opponentTeamId;

    const aWins = s.score?.[ourTeamId] ?? 0;
    const bWins = s.score?.[opponentId] ?? 0;

    return {
      // Ensure uniqueness for tracking even if multiple chunks exist for same date/opponent
      dateIso: `${dateIsoOnly}::${opponentId}::${s.matchIds?.[0] ?? ''}`,
      displayDate,
      score: `${aWins}-${bWins}`,
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
}

// Local view model for the template
interface Scrim {
  dateIso: string; // used for *trackBy*
  displayDate: string;
  score: string; // e.g., "2 - 1"
  teams?: {
    a?: { id: number; name: string };
    b?: { id: number; name: string };
  };
}
