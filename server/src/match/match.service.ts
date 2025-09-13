import { Injectable } from '@nestjs/common';
import { Match, PlayerMatchData, RawMatchData } from '@common/interfaces/match';
import { DataStoreService } from '../data-store/data-store.service';
import { StatsNormalizerService } from './stats-normalizer.service';

@Injectable()
export class MatchService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly statsNormalizer: StatsNormalizerService,
  ) {}

  async isProcessed(matchId: string): Promise<boolean> {
    return (
      this.dataStore.hasMatch(matchId) &&
      this.dataStore.getMatch(matchId)?.raw !== undefined
    );
  }

  async normalizeAndSave(raw: RawMatchData, matchId: string): Promise<Match> {
    const match: Match = this.createMatch(raw, matchId);
    this.dataStore.setMatch(matchId, match);
    return match;
  }

  getMatchIdList(): string[] {
    return this.dataStore.getMatchIds();
  }

  createMatch(raw: RawMatchData, matchId: string): Match {
    const match: Match = {
      id: matchId,
      playerIds: this.getPlayerIds(raw),
      teamIds: [],
      victoriousTeamSide: 0,
      victoriousTeamId: -1,
      duration: raw.gameDuration || 0,
      raw: raw,
      stats: this.getParticipantStats(raw),
      isOfficial: matchId.split('-').length > 4,
    };
    return match;
  }

  getPlayerIds(raw: RawMatchData): string[] {
    if (!raw.participants || !Array.isArray(raw.participants)) {
      return [];
    }
    return raw.participants.map((p) => p.PUUID || '');
  }

  getParticipantStats(raw: RawMatchData): Record<string, PlayerMatchData> {
    const stats: Record<string, PlayerMatchData> = {};
    if (!raw.participants || !Array.isArray(raw.participants)) {
      return stats;
    }
    raw.participants.forEach((participant) => {
      const puuid = participant.PUUID || '';
      stats[puuid] = this.statsNormalizer.extractParticipantStats(participant);
    });
    return stats;
  }

  async assignVictoriousTeamId(match: Match): Promise<void> {
    match.victoriousTeamSide = 0;
    match.victoriousTeamId = -1;

    for (const [playerId, player] of Object.entries(match.stats)) {
      if (!player.win) continue;

      if (!match.victoriousTeamSide && player.teamSideNumber) {
        match.victoriousTeamSide = player.teamSideNumber; // 1 for 100, 2 for 200
      }

      const teamId = this.dataStore.getTeamIdByPlayerId(playerId);
      if (teamId !== undefined) {
        match.victoriousTeamId = teamId;
        break;
      }
    }

    if (match.victoriousTeamId === undefined) {
      console.warn(
        `Could not determine victoriousTeamId for match ${match.id}`,
      );
    }
  }
}
