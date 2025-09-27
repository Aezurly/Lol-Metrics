import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PlayerManagerService } from '../services/player/player-manager.service';
import { PlayerRadarService } from '../services/player/player-radar.service';
import Chart, { ChartType } from 'chart.js/auto';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-radar-player-chart',
  imports: [],
  templateUrl: './radar-player-chart.html',
  styleUrl: './radar-player-chart.scss',
})
export class RadarPlayerChart implements OnInit, OnDestroy {
  public chart: any;
  private chartRefreshSub?: Subscription;

  config = {
    type: 'radar' as ChartType,
    data: {
      labels: [],
      datasets: [
        { label: '', data: [0] },
        { label: '', data: [0] },
      ],
    },
    options: {
      responsive: true,
      elements: {
        line: {
          borderWidth: 3,
          borderColor: '#ccc3',
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent',
          },
        },
      },
    },
  };

  get playerId(): string | null {
    return this.playerManager.currentRadarPlayerId;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playerManager: PlayerManagerService,
    private readonly playerRadar: PlayerRadarService
  ) {}

  ngOnInit(): void {
    this.chartRefreshSub = this.playerManager.chartRefresh$.subscribe(() => {
      if (this.chart) {
        this.updateData();
      } else {
        this.ensureInit();
      }
    });

    this.ensureInit();

    if (!this.playerId) {
      this.playerManager.refreshSummary().then(() => {
        this.route.params.subscribe((params) => {
          const playerName = params['name'];
          const playerId = this.playerManager.getPlayerByName(playerName)?.uid;
          this.playerManager.currentRadarPlayerId = playerId || null;
          this.updateData();
          this.chart = new Chart('radarChart', this.config);
        });
      });
    } else {
      this.updateData();
      this.chart = new Chart('radarChart', this.config);
    }
  }

  ngOnDestroy(): void {
    this.chartRefreshSub?.unsubscribe();
  }

  private ensureInit(): void {
    if (!this.playerId) {
      this.playerManager.refreshSummary().then(() => {
        this.route.params.subscribe((params) => {
          const playerName = params['name'];
          const playerId = this.playerManager.getPlayerByName(playerName)?.uid;
          this.playerManager.currentRadarPlayerId = playerId || null;
          this.updateData();
          this.chart = new Chart('radarChart', this.config);
        });
      });
    } else {
      this.updateData();
      this.chart = new Chart('radarChart', this.config);
    }
  }

  updateData(): void {
    this.config.data = this.radarData;
    this.chart?.update();
  }

  get radarData(): any {
    const datas = this.playerRadar.getRadarData();
    if (!datas) {
      console.warn('Radar data not found');
    }
    return datas;
  }
}
