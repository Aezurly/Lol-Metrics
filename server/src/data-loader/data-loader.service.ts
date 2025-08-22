import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { MatchService } from 'src/match/match.service';
import { PlayerService } from 'src/player/player.service';
import { TeamService } from 'src/team/team.service';
import { RawMatchData } from '@common/interfaces/match';
@Injectable()
export class DataLoaderService {
  constructor(
    private readonly matchService: MatchService,
    readonly playerService: PlayerService,
    private readonly teamService: TeamService,
  ) {}

  async loadNewMatches(): Promise<void> {
    const dataDirectory =
      process.env.DATA_DIRECTORY ||
      path.resolve(process.cwd(), '../Lol-Data-Analyser/data');

    const files = await this.getFilesFromDirectory(dataDirectory);
    for (const filePath of files) {
      const matchId = path.basename(filePath, '.json');
      if (await this.matchService.isProcessed(matchId)) {
        continue;
      }
      const raw = (await this.loadJson(
        path.join(dataDirectory, filePath),
      )) as RawMatchData;
      const match = await this.matchService.normalizeAndSave(raw, matchId);
      await this.playerService.updateFromMatch(match);
      await this.teamService.updateTeamStatsFromMatch(match);
      await this.matchService.assignVictoriousTeamId(match);
      console.log(`✅ Match ${matchId} processed and teams updated.`);
    }
  }

  async getFilesFromDirectory(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      console.error(`Error reading directory ${directory}:`, error);
      return [];
    }
  }

  async loadJson(filePath: string): Promise<unknown> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading JSON from ${filePath}:`, error);
      return null;
    }
  }
}
