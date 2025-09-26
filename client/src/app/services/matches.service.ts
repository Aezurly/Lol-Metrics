import { Injectable } from '@angular/core';
import { Match, Role } from '@common/interfaces/match';
import { PlayerManagerService } from './player/player-manager.service';

export interface MatchRecap {
  id: string;
  victoriousTeamId?: number;
  duration: number;
  teamSides: number[]; // index 0 is blue, index 1 is red, value is teamId
  players: PlayerRecap[];
  isOfficial?: boolean;
}

export interface PerSideStat {
  gold: number;
  grubs: number;
  dragons: number;
  herald: number;
  barons: number;
  atakhan: number;
  towers: number;
}

export interface PlayerRecap {
  id: string;
  name: string;
  teamId: number | null;
  champ: string | null;
  side: number; // 0 for blue, 1 for red
  k: number; // kills
  d: number; // deaths
  a: number; // assists
  role: Role;
}

@Injectable({
  providedIn: 'root',
})
export class MatchesService {
  matchs: Record<string, Match> = {};
  selectedMatchId: string | null = null;

  constructor(private readonly playerService: PlayerManagerService) {}

  getMatchById(id: string): Match | undefined {
    return this.matchs[id];
  }

  getPerSideStat(side: number): PerSideStat {
    const match = this.getMatchById(this.selectedMatchId!);
    if (!match) throw new Error('No match selected or match not found');
    const players = match.playerIds
      .map((pid) => match.stats?.[pid])
      .filter(
        (p): p is NonNullable<typeof p> => !!p && p.teamSideNumber === side
      );

    return players.reduce(
      (acc, p) => {
        acc.gold += p.income?.goldEarned ?? 0;
        acc.grubs += p.objectives?.voidGrubKills ?? 0;
        acc.dragons += p.objectives?.dragonKills ?? 0;
        acc.herald += p.objectives?.riftHeraldKills ?? 0;
        acc.barons += p.objectives?.baronKills ?? 0;
        acc.atakhan += p.objectives?.ObjectivesStolen ?? 0;
        acc.towers += p.objectives?.turretsKilled ?? 0;
        return acc;
      },
      {
        gold: 0,
        grubs: 0,
        dragons: 0,
        herald: 0,
        barons: 0,
        atakhan: 0,
        towers: 0,
      } as PerSideStat
    );
  }

  getMatchRecapById(id: string): MatchRecap | undefined {
    const match: Match | undefined = this.getMatchById(id);
    if (!match) return undefined;
    return this.buildRecap(match);
  }

  // Convert a Match into a MatchRecap using the available stats and player map
  public buildRecap(match: Match): MatchRecap {
    const teamSides: number[] = [0, 0];
    // victoriousTeamSide is 1 or 2 -> map to index 0 or 1
    const victIndex = Math.max(0, Math.min(1, match.victoriousTeamSide - 1));
    teamSides[victIndex] = match.victoriousTeamId;

    // Determine other side team id: take teamIds that isn't our victoriousTeamId
    const otherTeams = match.teamIds.filter(
      (t) => t !== match.victoriousTeamId
    );
    teamSides[1 - victIndex] = otherTeams.length > 0 ? otherTeams[0] : 0;

    const players = match.playerIds.map((playerId) => {
      const playerData = match.stats?.[playerId];
      const player = this.playerService.getPlayerById(playerId);
      return {
        id: playerId,
        name: player?.name || '',
        teamId: player?.teamId ?? null,
        champ: playerData?.championPlayed ?? null,
        side: (playerData?.teamSideNumber ?? 1) - 1,
        k: playerData?.combat?.kills ?? 0,
        d: playerData?.combat?.deaths ?? 0,
        a: playerData?.combat?.assists ?? 0,
        role: player?.role ?? Role.UNKNOWN,
      };
    });

    return {
      id: match.id,
      victoriousTeamId: match.victoriousTeamId,
      duration: match.duration,
      teamSides,
      players,
      isOfficial: match.isOfficial,
    };
  }
}
