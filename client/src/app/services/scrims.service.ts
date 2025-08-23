import { Injectable } from '@angular/core';
import { CommunicationService } from './communication/communication.service';
import { Match, Player, Team } from '@common/interfaces/match';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeamsService } from './teams/teams.service';
import { MatchsService } from './matchs.service';
import { PlayerService } from './player/player.service';

export interface Scrim {
  date: Date;
  matchIds: string[];
  opponentTeamId: number; // our team is always teamId 0.
  score: Record<number, number>; // TeamId - number of wins in the scrims
}

// Shape of the summary we consume from the API
type AppSummaryView = {
  matchIds: string[];
  playerList: Player[];
  teamList: Team[];
  matchs: Record<string, Match>;
};

@Injectable({
  providedIn: 'root',
})
export class ScrimsService {
  scrimList: Scrim[] = [];
  summary: AppSummaryView | undefined;

  constructor(
    private readonly communication: CommunicationService,
    private readonly teamsService: TeamsService,
    private readonly matchsService: MatchsService,
    private readonly playerService: PlayerService
  ) {}

  /**
   * Load scrims from server summary and build scrimList
   */
  loadScrims(): Observable<Scrim[]> {
    return this.communication.getSummary().pipe(
      map((summary) => {
        this.playerService.updatePlayerMap(summary.playerList);
        // ensure team names are available to consumers
        this.teamsService.updateTeamMap(
          (summary as AppSummaryView)?.teamList ?? []
        );

        const scrims = this.buildScrimListFromSummary(
          summary as AppSummaryView
        );
        this.summary = summary as AppSummaryView;
        this.matchsService.matchs = this.summary.matchs;
        this.scrimList = scrims;
        return scrims;
      })
    );
  }

  private buildScrimListFromSummary(summary: AppSummaryView): Scrim[] {
    const playerList: Player[] = summary.playerList || [];
    const matchesMap: Record<string, Match> | undefined =
      this.parseMatchesMap(summary);
    const matchIds: string[] =
      summary.matchIds || Object.keys(matchesMap || {});

    const playerTeamMap = this.buildPlayerTeamMap(playerList);

    const groups = this.groupMatchesByDateAndOpponent(
      matchIds,
      matchesMap,
      playerTeamMap
    );

    const scrims: Scrim[] = [];
    const SCRIM_MAX_MATCHES = 3;

    for (const [key, ids] of groups.entries()) {
      ids.sort((a, b) => a.localeCompare(b));
      const [dateIso] = key.split('::');
      const opponent = Number(key.split('::')[1]);

      const chunks = this.chunkArray(ids, SCRIM_MAX_MATCHES);
      for (const c of chunks) {
        if (c.length < 2) continue;
        const score = this.computeScoreForMatchIds(c, matchesMap);
        scrims.push({
          date: new Date(dateIso + 'T00:00:00'),
          matchIds: c,
          opponentTeamId: opponent,
          score,
        });
      }
    }

    scrims.sort((a, b) => b.date.getTime() - a.date.getTime());
    return scrims;
  }

  private parseMatchesMap(
    summary: AppSummaryView
  ): Record<string, Match> | undefined {
    return summary.matchs || undefined;
  }

  private buildPlayerTeamMap(playerList: Player[]): Map<string, number> {
    const map = new Map<string, number>();
    playerList.forEach((p) => {
      if (p.uid) map.set(p.uid, p.teamId ?? -1);
    });
    return map;
  }

  // date from id: YYYY-MM-DD-xx
  private getDateIsoFromId(matchId: string): string | null {
    if (!matchId || typeof matchId !== 'string') return null;
    const execRes = /^(\d{4}-\d{2}-\d{2})/.exec(matchId);
    return execRes ? execRes[1] : null;
  }

  private getMatchPlayerIds(match: Match): string[] {
    if (match.playerIds?.length) return match.playerIds;
    if (match.stats) return Object.keys(match.stats);
    return [];
  }

  private groupMatchesByDateAndOpponent(
    matchIds: string[],
    matchesMap: Record<string, Match> | undefined,
    playerTeamMap: Map<string, number>
  ): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const id of matchIds) {
      const match = matchesMap ? matchesMap[id] : undefined;
      if (!match) continue;

      const dateIso = this.getDateIsoFromId(id);
      if (!dateIso) continue;

      const pIds = this.getMatchPlayerIds(match);
      const teamCounts = new Map<number, number>();
      pIds.forEach((pid) => {
        const teamId = playerTeamMap.get(pid);
        if (teamId !== undefined && teamId !== null) {
          teamCounts.set(teamId, (teamCounts.get(teamId) || 0) + 1);
        }
      });

      if (!teamCounts.has(0)) continue; // skip if our team not present

      let opponent: number | null = null;
      let maxCount = -1;
      teamCounts.forEach((count, tId) => {
        if (tId === 0) return;
        if (count > maxCount) {
          maxCount = count;
          opponent = tId;
        }
      });

      opponent ??= -1;

      const key = `${dateIso}::${opponent}`;
      const arr = groups.get(key) || [];
      arr.push(id);
      groups.set(key, arr);
    }

    return groups;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  }

  private computeScoreForMatchIds(
    ids: string[],
    matchesMap?: Record<string, Match>
  ): Record<number, number> {
    const score: Record<number, number> = {};
    ids.forEach((mid) => {
      const m = matchesMap ? matchesMap[mid] : undefined;
      if (m?.victoriousTeamId === undefined || m?.victoriousTeamId === null) {
        console.warn(`Match ${mid} has undefined victoriousTeamId`);
        return;
      }
      const winner = m?.victoriousTeamId ?? null;
      if (winner !== null && winner !== undefined) {
        score[winner] = (score[winner] || 0) + 1;
      }
    });
    return score;
  }
}
