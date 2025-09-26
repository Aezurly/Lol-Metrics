import { Component, OnInit } from '@angular/core';
import { ScrimsService, ScrimView } from '../services/scrims.service';
import { TeamsService } from '../services/teams/teams.service';
import { MatchRecap, MatchesService } from '../services/matches.service';
import { CommonModule } from '@angular/common';
import { MatchRecapComponent } from '../match-recap/match-recap';
@Component({
  selector: 'app-scrim-explorer',
  imports: [CommonModule, MatchRecapComponent],
  templateUrl: './scrim-explorer.html',
  styleUrl: './scrim-explorer.scss',
})
export class ScrimExplorer implements OnInit {
  protected scrimsViews: ScrimView[] = [];
  protected scrimMatchsRecaps: Record<string, MatchRecap[]> = {};
  protected selectedScrim: ScrimView | null = null;
  protected selectedMatchId: string | null = null;

  constructor(
    private readonly scrimsService: ScrimsService,
    private readonly teamsService: TeamsService,
    private readonly matchesService: MatchesService
  ) {}

  ngOnInit(): void {
    this.scrimsService.loadScrims().subscribe((scrims) => {
      this.scrimsViews = scrims.map((s) => this.scrimsService.toViewModel(s));
      this.selectScrim(this.scrimsViews[0]);
    });
  }

  protected didTeamWon(scrim: ScrimView, teamSide: number): boolean {
    const scores = scrim.score.split(' - ');
    return scores[teamSide] > scores[teamSide ? 0 : 1];
  }

  protected getSuccessClass(scrim: ScrimView): string {
    return this.scrimsService.getSuccessClass(scrim);
  }

  protected selectScrim(scrim: ScrimView): void {
    this.selectedScrim = scrim;
    const recaps = this.scrimsService.getMatchRecapForScrim(scrim);
    if (recaps.length > 0) this.scrimMatchsRecaps[scrim.dateIso] = recaps;
    this.selectedMatchId = this.scrimMatchsRecaps[scrim.dateIso][0]?.id || null;
    this.matchesService.selectedMatchId = this.selectedMatchId;
  }

  protected selectMatch(matchId: string): void {
    this.selectedMatchId = matchId;
    this.matchesService.selectedMatchId = matchId;
  }
}
