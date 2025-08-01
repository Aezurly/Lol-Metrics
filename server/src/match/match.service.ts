import { Injectable } from '@nestjs/common';
import { Match, RawMatchData } from '@common/interfaces/match';
import { DataStoreService } from '../data-store/data-store.service';

@Injectable()
export class MatchService {
  constructor(private readonly dataStore: DataStoreService) {}

  async isProcessed(matchId: string): Promise<boolean> {
    return this.dataStore.hasMatch(matchId);
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
      duration: raw.gameDuration || 0,
      raw: raw,
    };
    return match;
  }

  getPlayerIds(raw: RawMatchData): string[] {
    if (!raw.participants || !Array.isArray(raw.participants)) {
      return [];
    }
    return raw.participants.map((p) => p.PUUID || '');
  }
}
