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
  isOfficial?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MatchsService {
  matchs: Record<string, Match> = {};
  selectedMatchId: string | null = null;

  constructor(private readonly playerService: PlayerService) {}

  getMatchById(id: string): Match | undefined {
    console.log('Getting match by ID:', id, this.matchs);
    return this.matchs[id];
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
