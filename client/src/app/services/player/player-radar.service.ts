import { Injectable, inject } from '@angular/core';
import { Player, Role } from '@common/interfaces/match';
import { PlayerManagerService } from './player-manager.service';
import { PlayerStatService } from './player-stat.service';

export const RADAR_CHART_LABELS = [
  'KDA',
  'DPM',
  'KP',
  'GPM',
  'Dmg/Gold',
  'VS/m',
  'CS/m',
];

export const PRIMARY_COLOR = '#00d8be';
export const ACCENT_COLOR = '#b6a0fd';

export const PERCENTILE_25 = 0.25;
export const PERCENTILE_75 = 0.75;

@Injectable({ providedIn: 'root' })
export class PlayerRadarService {
  private readonly playerManager = inject(PlayerManagerService);
  private readonly playerStat = inject(PlayerStatService);

  getRadarData(): unknown {
    const player = this.playerManager.getPlayerById(
      this.playerManager.currentRadarPlayerId || ''
    );
    if (!player) return null;
    const role = player.role as Role;
    let radarLabels = RADAR_CHART_LABELS;
    let averageStats = this.getAveragePlayersRadarStats(player.role);
    let playerStats = this.getRadarStats(player);
    if (role === Role.SUPPORT) {
      radarLabels = ['KDA', 'DPM', 'KP', 'GPM', 'Dmg/Gold', 'VS/m'];
      averageStats = averageStats.slice(0, radarLabels.length);
      playerStats = playerStats.slice(0, radarLabels.length);
    }
    const datas = {
      labels: radarLabels,
      datasets: [
        {
          label: `Average ${player.role}`,
          data: averageStats,
          borderColor: ACCENT_COLOR,
          backgroundColor: ACCENT_COLOR + '30',
        },
        {
          label: player.name,
          data: playerStats,
          borderColor: PRIMARY_COLOR,
          backgroundColor: PRIMARY_COLOR + '30',
        },
      ],
    };
    return datas;
  }

  private getPlayersForRole(role: Role): Player[] {
    return this.playerStat.getAllPlayers().filter((p) => p.role === role);
  }

  private getAveragePlayersRadarStats(role: Role): number[] {
    const players = this.getPlayersForRole(role);
    if (players.length === 0) return Array(RADAR_CHART_LABELS.length).fill(0);

    const totalStats = players.reduce((acc, player) => {
      const playerStats = this.getRadarStats(player);
      return acc.map((stat, index) => stat + playerStats[index]);
    }, Array(RADAR_CHART_LABELS.length).fill(0));

    return totalStats.map((stat) => stat / players.length);
  }

  private getRoleMetricBounds(role: Role): { min: number; max: number }[] {
    // Use PlayerStatService helper to compute per-role bounds and map to ordered array
    const boundsMap = this.playerStat.getRoleMetricBounds(role);
    if (!boundsMap) return RADAR_CHART_LABELS.map(() => ({ min: 0, max: 0 }));
    const keys = ['kda', 'dpm', 'kp', 'gpm', 'dpg', 'vspm', 'cspm'];
    return keys.map((k) => boundsMap[k] ?? { min: 0, max: 0 });
  }

  private getRawRadarMetrics(player: Player): number[] {
    const map = this.playerStat.getRawMetricsForPlayer(player);
    return [
      map['kda'],
      map['dpm'],
      map['kp'],
      map['gpm'],
      map['dpg'],
      map['vspm'],
      map['cspm'],
    ];
  }

  private scaleToPercent(value: number, min: number, max: number): number {
    if (max === min) {
      return value === max ? 100 : 0;
    }
    const clamped = Math.max(min, Math.min(max, value));
    return ((clamped - min) / (max - min)) * 100;
  }

  private getRadarStats(player: Player): number[] {
    const role = player.role as Role;
    const bounds = this.getRoleMetricBounds(role);
    const raw = this.getRawRadarMetrics(player);

    return raw.map((val, i) => {
      const { min, max } = bounds[i];
      return Math.round(this.scaleToPercent(val, min, max) * 100) / 100;
    });
  }
}
