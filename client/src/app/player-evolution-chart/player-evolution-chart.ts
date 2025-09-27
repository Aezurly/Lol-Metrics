import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
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

interface SeriesResult {
  labels: string[];
  playerSeries: Record<MetricKey, number[]>;
  avgSeries: Record<MetricKey, number[]>;
  playerName?: string | null;
}

@Component({
  selector: 'app-player-evolution-chart',
  imports: [],
  templateUrl: './player-evolution-chart.html',
  styleUrl: './player-evolution-chart.scss',
})
export class PlayerEvolutionChart implements OnInit, OnDestroy {
  private chartRefreshSub?: Subscription;
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
    this.chartRefreshSub = this.playerManager.chartRefresh$.subscribe(() => {
      if (this.chart) {
        this.updateData();
      } else {
        this.ensureInit();
      }
    });

    this.ensureInit();
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
        this.selection[m.key] = { player: true, avg: false };
    }
    this.buildConfigAndRender();
  }

  onPeriodChange(e: Event): void {
    const target = e.target as HTMLSelectElement | null;
    const value = target?.value ?? 'week';
    this.period = (value as 'week' | 'month') || 'week';
    this.updateData();
  }

  showAverage(): void {
    // If any avg is currently shown, hide all; otherwise show all.
    const anyAvgVisible = this.metrics.some((m) => this.selection[m.key]?.avg);
    for (const m of this.metrics) {
      const cur = this.selection[m.key] || { player: true, avg: false };
      this.selection[m.key] = { player: cur.player, avg: !anyAvgVisible };
    }
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

  private buildSeries(): SeriesResult {
    const pid = this.playerId;
    if (!pid) {
      console.log('No player ID set for evolution chart');
      return { labels: [], playerSeries: {} as any, avgSeries: {} as any };
    }

    const player = this.playerManager.getPlayerById(pid);
    if (!player) {
      console.log('No player set for evolution chart');
      return { labels: [], playerSeries: {} as any, avgSeries: {} as any };
    }

    const periods = this.getPeriodsForPlayer(pid);
    const labels = periods.map((p) => this.formatPeriodLabel(p.periodStart));

    const roleBounds = this.playerStat.getRoleMetricBounds(player.role as any);
    const rolePlayers = this.getRolePlayers(player.role);

    const { playerSeries, avgSeries } = this.initEmptySeries();

    // build series values using extracted helpers
    for (const p of periods) {
      const rawPlayer = this.computeRawMetricsForPlayer(
        player,
        this.filterMatchIdsByRange(player.matchIds, p.periodStart, p.periodEnd)
      );

      const roleValsForPeriod = this.collectRoleValuesForPeriod(
        rolePlayers,
        p.periodStart,
        p.periodEnd
      );

      this.appendPeriodValuesToSeries(
        rawPlayer,
        roleValsForPeriod,
        roleBounds,
        playerSeries,
        avgSeries
      );
    }

    return { labels, playerSeries, avgSeries, playerName: player.name };
  }

  // Helper: get periods for a given player id based on current period selection
  private getPeriodsForPlayer(pid: string): any[] {
    return this.period === 'week'
      ? this.playerEvolution.getPerWeekStats(pid)
      : this.playerEvolution.getPerMonthStats(pid);
  }

  // Helper: build an empty series container for all metrics
  private initEmptySeries(): {
    playerSeries: Record<MetricKey, number[]>;
    avgSeries: Record<MetricKey, number[]>;
  } {
    const playerSeries = {} as Record<MetricKey, number[]>;
    const avgSeries = {} as Record<MetricKey, number[]>;
    for (const m of this.metrics) {
      playerSeries[m.key] = [];
      avgSeries[m.key] = [];
    }
    return { playerSeries, avgSeries };
  }

  // Helper: return players that share the same role
  private getRolePlayers(role: any): Player[] {
    return this.playerManager.getAllPlayers().filter((p) => p.role === role);
  }

  // Helper: collect raw metric values for all players of a role within a period
  private collectRoleValuesForPeriod(
    rolePlayers: Player[],
    start: Date,
    end: Date
  ): Record<MetricKey, number[]> {
    const roleValsForPeriod = {} as Record<MetricKey, number[]>;
    for (const m of this.metrics) roleValsForPeriod[m.key] = [];

    for (const rp of rolePlayers) {
      const rpMatches = this.filterMatchIdsByRange(rp.matchIds, start, end);
      if (rpMatches.length === 0) continue;
      const rawRp = this.computeRawMetricsForPlayer(rp, rpMatches);
      for (const m of this.metrics) roleValsForPeriod[m.key].push(rawRp[m.key]);
    }

    return roleValsForPeriod;
  }

  private appendPeriodValuesToSeries(
    rawPlayer: Record<string, number>,
    roleValsForPeriod: Record<MetricKey, number[]>,
    roleBounds: Record<string, { min: number; max: number }>,
    playerSeries: Record<MetricKey, number[]>,
    avgSeries: Record<MetricKey, number[]>
  ) {
    for (const m of this.metrics) {
      const bounds = roleBounds[m.key];
      const pRaw = rawPlayer[m.key] ?? 0;
      const pPct = this.scaleToPercent(pRaw, bounds.min, bounds.max);
      playerSeries[m.key].push(Math.round(pPct * 100) / 100);

      const vals = roleValsForPeriod[m.key] || [];
      const avgRaw = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : 0;
      const avgPct = this.scaleToPercent(avgRaw, bounds.min, bounds.max);
      avgSeries[m.key].push(Math.round(avgPct * 100) / 100);
    }
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

  // role bounds are provided by PlayerStatService

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
