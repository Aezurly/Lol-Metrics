import { Component, Input, OnInit } from '@angular/core';
import { PlayerService } from '../services/player/player.service';
import Chart from 'chart.js/auto';
import { ChartType } from 'chart.js/auto';
import { ActivatedRoute } from '@angular/router';
import { title } from 'process';
import { PlayerStatisticsService } from '../services/player/player-statistics.service';

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
    return this.playerService.currentRadarPlayerId;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playerService: PlayerService,
    private readonly playerStatisticsService: PlayerStatisticsService
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
    this.updateData();
    this.chart = new Chart('radarChart', this.config);
  }

  updateData(): void {
    let savedTheme: string | null;
    if (typeof window !== 'undefined' && window.localStorage) {
      savedTheme = localStorage.getItem('theme');
    } else {
      savedTheme = 'light';
    }
    // this.config.options.plugins!.customCanvasBackgroundColor!.color =
    //   savedTheme === 'dark' ? '#ccc' : '#fff';
    console.log(this.config, savedTheme);
    this.config.data = this.radarData;
    this.chart?.update();
  }

  get radarData(): any {
    const datas = this.playerStatisticsService.getRadarData(
      this.playerService.currentRadarPlayerId
    );
    if (!datas) {
      console.warn('Radar data not found');
    }
    return datas;
  }
}
