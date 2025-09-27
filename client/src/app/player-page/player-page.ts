import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PlayerManagerService } from '../services/player/player-manager.service';
import { TeamsService } from '../services/teams/teams.service';
import { PlayerStats } from '../player-stats/player-stats';
import { ScrimsService } from '../services/scrims.service';

@Component({
  selector: 'app-player-page',
  imports: [PlayerStats],
  templateUrl: './player-page.html',
  styleUrl: './player-page.scss',
})
export class PlayerPage implements OnInit {
  playerName: string | null = null;
  loading: boolean = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playerService: PlayerManagerService,
    private readonly teamsService: TeamsService,
    private readonly scrimService: ScrimsService
  ) {
    this.route.params.subscribe((params) => {
      this.playerName = params['name'];
      this.playerService.currentRadarPlayerId =
        this.playerService.getPlayerByName(this.playerName || '')?.uid || null;
    });
  }

  ngOnInit(): void {
    if (!this.playerId) {
      this.playerService.refreshSummary();
    }

    this.scrimService.loadScrims().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading scrims:', err);
        this.loading = false;
      },
    });
  }

  get playerId(): string | null {
    const playerId = this.playerService.getPlayerByName(
      this.playerName || ''
    )?.uid;
    if (!playerId) {
      this.playerService.refreshSummary();
      console.warn(
        `Player with name ${this.playerName} not found: refresh datas`
      );
      return null;
    }
    this.playerService.currentRadarPlayerId = playerId;
    return playerId;
  }

  get teamName(): string | null {
    if (!this.playerName) return null;
    const player = this.playerService.getPlayerByName(this.playerName);
    return this.teamsService.getTeamName(player?.teamId);
  }

  get teammatesNames(): string[] {
    if (!this.playerName) return [];
    const player = this.playerService.getPlayerByName(this.playerName);
    // TODO: Implement real logic
    const teammates: string[] = [];
    return teammates;
  }
}
