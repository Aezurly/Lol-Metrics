import { Injectable } from '@angular/core';
import { CommunicationService } from './communication/communication.service';
import {
  Match,
  Player,
  Team,
  MATCH_ID_PARTS_NUMBER,
} from '@common/interfaces/match';
import type { MatchRecap } from './matches.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeamsService } from './teams/teams.service';
import { MatchesService } from './matches.service';
import { PlayerManagerService } from './player/player-manager.service';

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
    private readonly matchesService: MatchesService,
    private readonly playerService: PlayerManagerService
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
        this.matchesService.matchs = this.summary.matchs;
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

  // ----- View helpers moved from RecentScrims component -----

  // Number of players per side used by some UI helpers
  public readonly NUMBER_OF_PLAYERS_PER_SIDE = 5;

  // Local view model for the template
  public toViewModel(s: Scrim): ScrimView {
    const dateIsoOnly = this.toLocalIsoDate(s.date);
    const displayDate = this.formatDateEnglish(dateIsoOnly);

    const ourTeamId = 0;
    const opponentId = s.opponentTeamId;

    const aWins = s.score?.[ourTeamId] ?? 0;
    const bWins = s.score?.[opponentId] ?? 0;

    const isOfficial = s.matchIds.some((id) => {
      return id.split('-').length > MATCH_ID_PARTS_NUMBER;
    });
    return {
      matchIds: s.matchIds,
      dateIso: `${dateIsoOnly}::${opponentId}::${s.matchIds?.[0] ?? ''}`,
      displayDate,
      score: `${aWins} - ${bWins}`,
      teams: {
        a: { id: ourTeamId, name: this.teamsService.getTeamName(ourTeamId) },
        b: { id: opponentId, name: this.teamsService.getTeamName(opponentId) },
      },
      isOfficial,
    };
  }

  public toLocalIsoDate(d: Date): string {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public formatDateEnglish(isoDate: string): string {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return isoDate;
    }
  }

  // Return computed grid position to bind inline styles (wins over DaisyUI rules)
  public getPlayerGridPos(
    side: number,
    index: number
  ): { row: number; col: number } {
    return {
      row: (index % this.NUMBER_OF_PLAYERS_PER_SIDE) + 1,
      col: side === 0 ? 1 : 2,
    };
  }

  public getPlayerGridClass(side: number, index: number): string {
    const col = side === 0 ? 1 : 2;
    const row = (index % this.NUMBER_OF_PLAYERS_PER_SIDE) + 1;
    return `row-start-${row} row-end-${row + 1} col-${col}`;
  }

  // Helper to split players by team side (0: blue, 1: red)
  public getPlayersBySide(recap: MatchRecap, side: 0 | 1) {
    return recap.players.filter((p) => p.side === side);
  }

  // Determine if Blue side won
  public isBlueVictory(recap: MatchRecap): boolean {
    if (recap.victoriousTeamId == null) return false;
    return recap.victoriousTeamId === recap.teamSides?.[0];
  }

  // Build label: "Victory (Blue Side)" / "Defeat (Red Side)"
  public getSideOutcomeLabel(recap: MatchRecap, side: 0 | 1): string {
    const blueWon = this.isBlueVictory(recap);
    const isVictory = side === 0 ? blueWon : !blueWon;
    return `${isVictory ? 'Victory' : 'Defeat'}`;
  }

  public getWinningTeamName(recap: MatchRecap): string {
    if (recap.victoriousTeamId == null) return 'N/A';
    const teamId = recap.victoriousTeamId;
    return this.teamsService.getTeamName(teamId);
  }

  public getWinningSideName(recap: MatchRecap): string {
    if (recap.victoriousTeamId == null) return 'N/A';
    const teamId = recap.victoriousTeamId;
    return recap.teamSides?.[0] === teamId ? 'Blue Side' : 'Red Side';
  }

  public getTeamNameBySide(recap: MatchRecap, side: 0 | 1): string {
    const teamId = recap.teamSides?.[side];
    if (teamId == null) return 'N/A';
    const teamName = this.teamsService.getTeamName(teamId);
    return teamName;
  }

  private readonly MS_PER_MINUTE = 60000;
  private readonly MS_PER_SECOND = 1000;

  public getMatchDuration(recap: MatchRecap): string {
    const minutes = Math.floor(recap.duration / this.MS_PER_MINUTE);
    const seconds = Math.floor(
      (recap.duration % this.MS_PER_MINUTE) / this.MS_PER_SECOND
    );
    return `${minutes}:${seconds}`;
  }

  public getSuccessClass(scrim: ScrimView): string {
    const [aWins, bWins] = scrim.score.split(' - ').map(Number);
    return aWins > bWins ? 'badge-success' : '';
  }

  // Move match recap aggregation here so other components can reuse
  public getMatchRecapForScrim(scrim: ScrimView): MatchRecap[] {
    const recaps = scrim.matchIds
      .map((id) => this.matchesService.getMatchRecapById(id))
      .filter((m): m is MatchRecap => m !== undefined);
    return recaps;
  }
}

// exported view model for other components
export interface ScrimView {
  matchIds: string[];
  dateIso: string; // used for *trackBy*
  displayDate: string;
  score: string; // e.g., "2 - 1"
  teams?: {
    a?: { id: number; name: string };
    b?: { id: number; name: string };
  };
  isOfficial: boolean;
}
