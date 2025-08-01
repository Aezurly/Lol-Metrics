import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataLoaderService } from './data-loader/data-loader.service';
import { MatchService } from './match/match.service';
import { PlayerService } from './player/player.service';
import { TeamService } from './team/team.service';
import { DataStoreService } from './data-store/data-store.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    DataLoaderService,
    MatchService,
    PlayerService,
    TeamService,
    DataStoreService,
  ],
})
export class AppModule {}
