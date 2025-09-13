import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrimsService, ScrimView } from '../services/scrims.service';
import { TeamsService } from '../services/teams/teams.service';
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
  scrims: ScrimView[] = [];
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
        this.scrims = scrims.map((s) => this.scrimsService.toViewModel(s));
        this.scrims.forEach((s) => {
          const recaps = this.scrimsService.getMatchRecapForScrim(s);
          if (recaps.length > 0) this.scrimMatchsRecaps[s.dateIso] = recaps;
        });
      },
      error: (err) => console.error('Failed to load scrims', err),
    });
  }
  protected getSuccessClass(scrim: ScrimView): string {
    return this.scrimsService.getSuccessClass(scrim);
  }

  protected getPlayerGridClass(side: number, index: number): string {
    return this.scrimsService.getPlayerGridClass(side, index);
  }

  // Return computed grid position to bind inline styles (wins over DaisyUI rules)
  protected getPlayerGridPos(
    side: number,
    index: number
  ): { row: number; col: number } {
    return this.scrimsService.getPlayerGridPos(side, index);
  }

  // Helper to split players by team side (0: blue, 1: red)
  protected getPlayersBySide(recap: MatchRecap, side: 0 | 1) {
    return this.scrimsService.getPlayersBySide(recap, side);
  }

  // Determine if Blue side won
  protected isBlueVictory(recap: MatchRecap): boolean {
    return this.scrimsService.isBlueVictory(recap);
  }

  // Build label: "Victory (Blue Side)" / "Defeat (Red Side)"
  protected getSideOutcomeLabel(recap: MatchRecap, side: 0 | 1): string {
    return this.scrimsService.getSideOutcomeLabel(recap, side);
  }

  protected getWinningTeamName(recap: MatchRecap): string {
    return this.scrimsService.getWinningTeamName(recap);
  }

  protected getWinningSideName(recap: MatchRecap): string {
    return this.scrimsService.getWinningSideName(recap);
  }

  protected getTeamNameBySide(recap: MatchRecap, side: 0 | 1): string {
    return this.scrimsService.getTeamNameBySide(recap, side);
  }

  protected getMatchDuration(recap: MatchRecap): string {
    return this.scrimsService.getMatchDuration(recap);
  }
}

// Local view model for the template
// scrim view model is exported from ScrimsService
