import { Component, Input, OnInit } from '@angular/core';
import { PlayerService } from '../services/player/player.service';
import Chart from 'chart.js/auto';
import { ChartType } from 'chart.js/auto';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-radar-player-chart',
  imports: [],
  templateUrl: './radar-player-chart.html',
  styleUrl: './radar-player-chart.scss',
})
export class RadarPlayerChart implements OnInit {
  public chart: any;

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
        },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
          },
        },
      },
    },
  };

  get playerId(): string | null {
    return this.playerService.currentRadarPlayerId;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playerService: PlayerService
  ) {
    if (!this.playerId) {
      playerService.refreshSummary().then(() => {
        this.route.params.subscribe((params) => {
          const playerName = params['name'];

          const playerId = this.playerService.getPlayerByName(playerName)?.uid;
          console.log(playerName, playerId);
          this.playerService.currentRadarPlayerId = playerId || null;
          this.config.data = this.radarData;
          this.chart?.update();
        });
      });
    } else {
      this.config.data = this.radarData;
      this.chart?.update();
    }
  }

  ngOnInit(): void {
    this.config.data = this.radarData;
    this.chart = new Chart('radarChart', this.config);
  }

  get radarData(): any {
    const datas = this.playerService.getRadarData();
    if (!datas) {
      console.warn('Radar data not found');
    }
    return datas;
  }
}
