import { Injectable } from '@angular/core';
import { Match } from '@common/interfaces/match';
import { PlayerService } from './player/player.service';

export interface MatchRecap {
  id: string;
  victoriousTeamId?: number;
  duration: number;
  teamSides: number[]; // index 0 is blue, index 1 is red, value is teamId
  players: {
    id: string;
    name: string;
    teamId: number | null;
    champ: string | null;
    side: number; // 0 for blue, 1 for red
    k: number; // kills
    d: number; // deaths
    a: number; // assists
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class MatchsService {
  matchs: Record<string, Match> = {};

  constructor(private readonly playerService: PlayerService) {}

  getMatchById(id: string): Match | undefined {
    return this.matchs[id];
  }

  getMatchRecapById(id: string): MatchRecap | undefined {
    const match: Match | undefined = this.getMatchById(id);
    if (!match) return undefined;

    const teamSides: number[] = [0, 0];
    console.log(match.victoriousTeamSide, match.victoriousTeamId);
    teamSides[match.victoriousTeamSide - 1] = match.victoriousTeamId;
    teamSides[1 - (match.victoriousTeamSide - 1)] =
      match.victoriousTeamId === 0
        ? match.teamIds.filter((id) => id !== 0)[0]
        : 0;

    const players = match.playerIds.map((playerId) => {
      const playerData = match.stats[playerId];
      const player = this.playerService.getPlayerById(playerId);
      return {
        id: playerId,
        name: player?.name || '',
        teamId: player?.teamId || null,
        champ: playerData?.championPlayed || null,
        side: (playerData?.teamSideNumber ?? 1) - 1 || 0,
        k: playerData?.combat?.kills ?? 0,
        d: playerData?.combat?.deaths ?? 0,
        a: playerData?.combat?.assists ?? 0,
      };
    });

    return {
      id: match.id,
      victoriousTeamId: match.victoriousTeamId,
      teamSides: teamSides,
      duration: match.duration,
      players: players,
    };
  }
}
