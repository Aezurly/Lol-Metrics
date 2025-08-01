import { Injectable } from '@nestjs/common';
import { Match } from '@common/interfaces/match';

@Injectable()
export class MatchService {
  matchList: Record<string, Match> = {}; // Placeholder for match data storage
  constructor() {}
  async isProcessed(matchId: string): Promise<boolean> {
    console.log(`Checking if match ${matchId} is processed...`);
    return !!this.matchList[matchId];
  }

  async normalizeAndSave(raw: any, matchId: string): Promise<Match> {
    console.log(`Normalizing and saving match ${matchId}...`);
    const match: Match = {
      id: matchId,
      playerIds: [],
      teamIds: [],
      duration: 0,
      raw: raw,
    };
    this.matchList[matchId] = match;
    return this.matchList[matchId];
  }

  getMatchIdList(): string[] {
    return Object.keys(this.matchList);
  }
}
