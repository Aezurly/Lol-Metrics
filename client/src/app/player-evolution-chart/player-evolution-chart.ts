import { Component, OnInit } from '@angular/core';
import Chart, { ChartType } from 'chart.js/auto';
import { PlayerManagerService } from '../services/player/player-manager.service';
import { PlayerEvolutionService } from '../services/player/player-evolution.service';
import { PlayerStatService } from '../services/player/player-stat.service';
import { ActivatedRoute } from '@angular/router';
import { Player } from '@common/interfaces/match';

// Typed metric keys
export type MetricKey = 'kda' | 'dpm' | 'kp' | 'gpm' | 'dpg' | 'vspm' | 'cspm';

export interface RawMetrics {
  kda: number;
  dpm: number;
  kp: number;
  gpm: number;
  dpg: number;
  vspm: number;
  cspm: number;
}

@Component({
  selector: 'app-player-evolution-chart',
  imports: [],
  templateUrl: './player-evolution-chart.html',
  styleUrl: './player-evolution-chart.scss',
})
export class PlayerEvolutionChart implements OnInit {
  public chart: any;
  public period: 'week' | 'month' = 'week';
  // cached periods (from PlayerEvolutionService) containing raw metric values
  private cachedPeriods: any[] = [];
  // Metric keys and typed metrics list
  public readonly metrics: { key: MetricKey; label: string }[] = [
    { key: 'kda', label: 'KDA' },
    { key: 'dpm', label: 'DPM' },
    { key: 'kp', label: 'KP' },
    { key: 'gpm', label: 'GPM' },
    { key: 'dpg', label: 'Dmg/Gold' },
    { key: 'vspm', label: 'VS/m' },
    { key: 'cspm', label: 'CS/m' },
  ];

  // For each metric we track whether to show player's line and role-average line
  public selection: Record<MetricKey, { player: boolean; avg: boolean }> =
    {} as Record<MetricKey, { player: boolean; avg: boolean }>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playerManager: PlayerManagerService,
    private readonly playerEvolution: PlayerEvolutionService,
    private readonly playerStat: PlayerStatService
  ) {}

  get playerId(): string | null {
    return this.playerManager.currentRadarPlayerId;
  }

  ngOnInit(): void {
    if (!this.playerId) {
      this.playerManager.refreshSummary().then(() => {
        this.route.params.subscribe((params) => {
          const playerName = params['name'];
          const playerId = this.playerManager.getPlayerByName(playerName)?.uid;
          this.playerManager.currentRadarPlayerId = playerId || null;
          this.initChart();
        });
      });
    } else {
      this.initChart();
    }
  }

  initChart(): void {
    // initialize selection defaults
    for (const m of this.metrics) {
      if (!this.selection[m.key])
        this.selection[m.key] = { player: true, avg: true };
    }
    this.buildConfigAndRender();
  }

  onPeriodChange(e: Event): void {
    const target = e.target as HTMLSelectElement | null;
    const value = target?.value ?? 'week';
    this.period = (value as 'week' | 'month') || 'week';
    this.updateData();
  }

  updateData(): void {
    const series = this.buildSeries();
    if (!this.chart) return;
    this.chart.data.labels = series.labels;

    const datasets: any[] = [];
    const playerColors = [
      '#b6a0fd',
      '#fe1c55',
      '#51a2ff',
      '#fe9a00',
      '#ddb95a',
      '#f96d97',
      '#00d8be',
    ];
    const avgColors = [
      '#b6a0fd',
      '#fe1c55',
      '#51a2ff',
      '#fe9a00',
      '#ddb95a',
      '#f96d97',
      '#00d8be',
    ];

    this.metrics.forEach((m, i) => {
      const key = m.key;
      if (this.selection[key]?.player) {
        datasets.push({
          label: `${m.label} (${series.playerName})`,
          data: series.playerSeries[key],
          borderColor: playerColors[i % playerColors.length],
          backgroundColor: playerColors[i % playerColors.length] + '33',
          fill: false,
          tension: 0.2,
        });
      }
      if (this.selection[key]?.avg) {
        datasets.push({
          label: `${m.label} (role avg)`,
          data: series.avgSeries[key],
          borderColor: avgColors[i % avgColors.length],
          backgroundColor: avgColors[i % avgColors.length] + '22',
          borderDash: [6, 4],
          fill: false,
          tension: 0.2,
        });
      }
    });

    this.chart.data.datasets = datasets;
    this.chart.update();
  }

  buildConfigAndRender(): void {
    // load periods into cache for tooltip lookup
    const pid = this.playerId;
    if (pid) {
      this.cachedPeriods =
        this.period === 'week'
          ? this.playerEvolution.getPerWeekStats(pid)
          : this.playerEvolution.getPerMonthStats(pid);
    } else {
      this.cachedPeriods = [];
    }

    const series = this.buildSeries();
    const config = {
      type: 'line' as ChartType,
      data: {
        labels: series.labels,
        datasets: [],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' as const },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const dsLabel: string = ctx.dataset.label || '';
                const idx = ctx.dataIndex;
                const metric = this.metrics.find((m) =>
                  dsLabel.startsWith(m.label)
                );
                const isAvg = dsLabel.toLowerCase().includes('role avg');
                if (metric && this.cachedPeriods?.[idx]) {
                  const period = this.cachedPeriods[idx];
                  const rawVal = isAvg
                    ? period.roleAvgRaw?.[metric.key]
                    : period.raw?.[metric.key];
                  const pct = ctx.parsed?.y ?? ctx.parsed ?? 0;
                  if (rawVal !== undefined && rawVal !== null) {
                    const rawStr =
                      typeof rawVal === 'number'
                        ? Number(rawVal).toFixed(2)
                        : String(rawVal);
                    return `${ctx.dataset.label}: ${rawStr} (${Number(
                      pct
                    ).toFixed(0)}%)`;
                  }
                }
                const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
                return `${ctx.dataset.label}: ${Number(y).toFixed(2)}%`;
              },
            },
          },
        },
        scales: {
          x: { display: true },
          y: { display: true, beginAtZero: true, max: 100 },
        },
      },
    };

    try {
      this.chart?.destroy();
    } catch {}

    this.chart = new Chart('evolutionChart', config as any);
    this.updateData();
  }

  private buildSeries(): {
    labels: string[];
    playerSeries: Record<string, number[]>;
    avgSeries: Record<string, number[]>;
    playerName?: string | null;
  } {
    const pid = this.playerId;
    if (!pid) {
      console.log('No player ID set for evolution chart');
      return {
        labels: [],
        playerSeries: {},
        avgSeries: {},
        playerName: undefined,
      };
    }

    const player: Player | undefined = this.playerManager.getPlayerById(pid);
    if (!player) {
      console.log('No player set for evolution chart');
      return {
        labels: [],
        playerSeries: {},
        avgSeries: {},
        playerName: undefined,
      };
    }

    const periods =
      this.period === 'week'
        ? this.playerEvolution.getPerWeekStats(pid)
        : this.playerEvolution.getPerMonthStats(pid);

    const labels = periods.map((p) => this.formatPeriodLabel(p.periodStart));

    const roleBounds = this.computeRoleBounds(player.role);

    const playerSeries: Record<string, number[]> = {} as any;
    const avgSeries: Record<string, number[]> = {} as any;
    for (const m of this.metrics) {
      playerSeries[m.key] = [];
      avgSeries[m.key] = [];
    }

    const rolePlayers = this.playerManager
      .getAllPlayers()
      .filter((pl) => pl.role === player.role);

    periods.forEach((p) => {
      const playerMatches = this.filterMatchIdsByRange(
        player.matchIds,
        p.periodStart,
        p.periodEnd
      );
      const rawPlayer = this.computeRawMetricsForPlayer(player, playerMatches);

      // collect role players' raw metrics for this period
      const roleValsForPeriod: Record<string, number[]> = {} as any;
      for (const m of this.metrics) roleValsForPeriod[m.key] = [];
      for (const rp of rolePlayers) {
        const rpMatches = this.filterMatchIdsByRange(
          rp.matchIds,
          p.periodStart,
          p.periodEnd
        );
        if (rpMatches.length === 0) continue;
        const rawRp = this.computeRawMetricsForPlayer(rp, rpMatches);
        for (const m of this.metrics)
          roleValsForPeriod[m.key].push(rawRp[m.key]);
      }

      for (const m of this.metrics) {
        const bounds = roleBounds[m.key];
        const pRaw = rawPlayer[m.key] ?? 0;
        const pPct = this.scaleToPercent(pRaw, bounds.min, bounds.max);
        playerSeries[m.key].push(Math.round(pPct * 100) / 100);

        const vals = roleValsForPeriod[m.key];
        const avgRaw = vals.length
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : 0;
        const avgPct = this.scaleToPercent(avgRaw, bounds.min, bounds.max);
        avgSeries[m.key].push(Math.round(avgPct * 100) / 100);
      }
    });

    return { labels, playerSeries, avgSeries, playerName: player.name };
  }

  private computeRawMetricsForPlayer(
    player: Player | undefined,
    matches: string[]
  ): Record<string, number> {
    if (!player) return {};

    return {
      kda: this.playerStat.getKDAValue(player, matches),
      dpm: this.playerStat.getDamagePerMinuteValue(player, matches),
      kp: this.playerStat.getKillParticipationValue(player, matches),
      gpm: this.playerStat.getGoldPerMinuteValue(player, matches),
      dpg: this.playerStat.getDamagePerGoldValue(player, matches),
      vspm: this.playerStat.getVisionScorePerMinuteValue(player, matches),
      cspm: this.playerStat.getCSPerMinuteValue(player, matches),
    };
  }

  private computeRoleBounds(
    role: any
  ): Record<string, { min: number; max: number }> {
    const players = this.playerManager
      .getAllPlayers()
      .filter((p) => p.role === role);
    const rawMetrics = players.map((p) => ({
      kda: this.playerStat.getKDAValue(p),
      dpm: this.playerStat.getDamagePerMinuteValue(p),
      kp: this.playerStat.getKillParticipationValue(p),
      gpm: this.playerStat.getGoldPerMinuteValue(p),
      dpg: this.playerStat.getDamagePerGoldValue(p),
      vspm: this.playerStat.getVisionScorePerMinuteValue(p),
      cspm: this.playerStat.getCSPerMinuteValue(p),
    }));

    const bounds: Record<string, { min: number; max: number }> = {} as any;
    for (const m of this.metrics) {
      const vals = rawMetrics
        .map((r) => r[m.key])
        .filter((v) => Number.isFinite(v));
      let min = vals.length ? Math.min(...vals) : 0;
      let max = vals.length ? Math.max(...vals) : 0;
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 0;
      if (min === max && max !== 0) min = 0;
      bounds[m.key] = { min, max };
    }
    return bounds;
  }

  private scaleToPercent(value: number, min: number, max: number): number {
    if (max === min) return value === max ? 1 : 0;
    const clamped = Math.max(min, Math.min(max, value));
    return ((clamped - min) / (max - min)) * 100;
  }

  private filterMatchIdsByRange(
    matchIds: string[],
    start: Date,
    end: Date
  ): string[] {
    return matchIds.filter((id) => {
      const iso = this.getDateIsoFromId(id);
      if (!iso) return false;
      const d = new Date(iso + 'T00:00:00');
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    });
  }

  private formatPeriodLabel(d: Date): string {
    const date = new Date(d);
    return date.toLocaleDateString();
  }

  // same date prefix parser as other services (YYYY-MM-DD)
  private getDateIsoFromId(matchId: string): string | null {
    if (!matchId || typeof matchId !== 'string') return null;
    const execRes = /^(\d{4}-\d{2}-\d{2})/.exec(matchId);
    return execRes ? execRes[1] : null;
  }
}
