import { Injectable, inject } from '@angular/core';
import { PlayerStatService } from './player-stat.service';
import { PlayerStat, Player } from '@common/interfaces/match';
import { PlayerManagerService } from './player-manager.service';

export interface PeriodPlayerStats {
  periodStart: Date;
  periodEnd: Date;
  stats: PlayerStat;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerEvolutionService {
  private readonly playerStatService = inject(PlayerStatService);
  private readonly playerManager = inject(PlayerManagerService);

  getPerWeekStats(playerId: string): PeriodPlayerStats[] {
    const player = this.playerManager.getPlayerById(playerId);
    if (!player) return [];

    const dateIds = this.getSortedMatchDates(player);
    if (dateIds.length === 0) return [];

    const firstDate = dateIds[0].date;
    const lastDate = dateIds[dateIds.length - 1].date;

    // compute Monday of firstDate (week starts Monday)
    const dayIndex = (firstDate.getDay() + 6) % 7; // Monday=0 .. Sunday=6
    const firstMonday = new Date(firstDate);
    firstMonday.setHours(0, 0, 0, 0);
    firstMonday.setDate(firstMonday.getDate() - dayIndex);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    return this.aggregatePeriods(
      player,
      dateIds,
      firstMonday,
      // nextStartFn
      (start) => new Date(start.getTime() + msPerWeek),
      // compute periodEnd from start and nextStart
      (start, next) => new Date(next.getTime() - 1),
      lastDate
    );
  }

  getPerMonthStats(playerId: string): PeriodPlayerStats[] {
    const player = this.playerManager.getPlayerById(playerId);
    if (!player) return [];

    const dateIds = this.getSortedMatchDates(player);
    if (dateIds.length === 0) return [];

    const firstDate = dateIds[0].date;
    const lastDate = dateIds[dateIds.length - 1].date;

    const firstOfMonth = new Date(
      firstDate.getFullYear(),
      firstDate.getMonth(),
      1
    );
    firstOfMonth.setHours(0, 0, 0, 0);

    return this.aggregatePeriods(
      player,
      dateIds,
      firstOfMonth,
      // nextStartFn: next month start
      (start) => new Date(start.getFullYear(), start.getMonth() + 1, 1),
      // compute periodEnd from start and nextStart
      (start, next) => new Date(next.getTime() - 1),
      lastDate
    );
  }

  /**
   * Convert player's matchIds into sorted array of {id, date} using YYYY-MM-DD prefix from id
   */
  private getSortedMatchDates(player: Player): { id: string; date: Date }[] {
    return player.matchIds
      .map((id) => ({ id, iso: this.getDateIsoFromId(id) }))
      .filter((x) => x.iso)
      .map((x) => ({ id: x.id, date: new Date(x.iso + 'T00:00:00') }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Generic aggregator over periods: given an initial start and a function to compute the next period start,
   * iterate periods until lastDate and compute PlayerStat for matches in each period. Empty periods are skipped.
   */
  private aggregatePeriods(
    player: Player,
    dateIds: { id: string; date: Date }[],
    initialStart: Date,
    nextStartFn: (start: Date) => Date,
    computePeriodEnd: (start: Date, nextStart: Date) => Date,
    lastDate: Date
  ): PeriodPlayerStats[] {
    const periods: PeriodPlayerStats[] = [];

    let periodStart = new Date(initialStart);
    while (periodStart.getTime() <= lastDate.getTime()) {
      const nextStart = nextStartFn(periodStart);
      const periodEnd = computePeriodEnd(periodStart, nextStart);

      const matchesThis = dateIds
        .filter(
          (d) =>
            d.date.getTime() >= periodStart.getTime() &&
            d.date.getTime() <= periodEnd.getTime()
        )
        .map((d) => d.id);

      if (matchesThis.length > 0) {
        const stats = this.playerStatService.getPlayerStats(
          player,
          matchesThis
        );
        periods.push({ periodStart: new Date(periodStart), periodEnd, stats });
      }

      periodStart = nextStart;
    }

    return periods;
  }

  // date from id: YYYY-MM-DD-...
  private getDateIsoFromId(matchId: string): string | null {
    if (!matchId || typeof matchId !== 'string') return null;
    const execRes = /^(\d{4}-\d{2}-\d{2})/.exec(matchId);
    return execRes ? execRes[1] : null;
  }
}
