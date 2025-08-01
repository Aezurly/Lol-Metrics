import { Injectable } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { match } from 'assert';
import { MatchService } from './match/match.service';

@Injectable()
export class AppService {
  constructor(
    private readonly loaderService: DataLoaderService,
    private readonly matchService: MatchService,
  ) {}
  async getHello(): Promise<string[]> {
    await this.loaderService.loadNewMatches();
    console.log('All matches loaded successfully.');

    return this.matchService.getMatchIdList();
  }
}
