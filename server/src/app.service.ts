import { Injectable } from '@nestjs/common';
import { DataLoaderService } from './data-loader/data-loader.service';
import { MatchService } from './match/match.service';
import { DataStoreService } from './data-store/data-store.service';

@Injectable()
export class AppService {
  constructor(
    private readonly loaderService: DataLoaderService,
    private readonly matchService: MatchService,
    private readonly dataStore: DataStoreService,
  ) {}
  async loadAndRetrieveSummary(): Promise<any> {
    await this.loaderService.loadNewMatches();
    console.log('All matches loaded successfully.');

    return {
      matchIds: this.dataStore.getMatchIds(),
      playerList: this.dataStore.getPlayerList(),
      teamList: this.dataStore.getTeamList(),
    };
  }
}
