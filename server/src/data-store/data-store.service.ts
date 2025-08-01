import { Injectable, OnModuleInit } from '@nestjs/common';
import { Match, Player, Team } from '@common/interfaces/match';
import * as fs from 'fs';
import * as path from 'path';

export interface DataStore {
  matches: Record<string, Match>;
  players: Record<string, Player>;
  teams: Record<string, Team>;
}

@Injectable()
export class DataStoreService implements OnModuleInit {
  private static instance: DataStoreService;
  private readonly dataFilePath = path.join(process.cwd(), 'temp-data.json');
  private _matches: Record<string, Match> = {};
  private _players: Record<string, Player> = {};
  private _teams: Record<string, Team> = {};

  constructor() {
    if (!DataStoreService.instance) {
      DataStoreService.instance = this;
    }
  }

  static getInstance(): DataStoreService {
    if (!DataStoreService.instance) {
      DataStoreService.instance = new DataStoreService();
    }
    return DataStoreService.instance;
  }

  async onModuleInit() {
    await this.loadData();
  }

  // Match operations
  get matches(): Record<string, Match> {
    return this._matches;
  }

  setMatch(matchId: string, match: Match): void {
    this._matches[matchId] = match;
    this.saveData();
  }

  getMatch(matchId: string): Match | undefined {
    return this._matches[matchId];
  }

  hasMatch(matchId: string): boolean {
    return !!this._matches[matchId];
  }

  getMatchIds(): string[] {
    return Object.keys(this._matches);
  }

  // Player operations
  get players(): Record<string, Player> {
    return this._players;
  }

  setPlayer(playerId: string, player: Player): void {
    this._players[playerId] = player;
    this.saveData();
  }

  getPlayer(playerId: string): Player | undefined {
    return this._players[playerId];
  }

  hasPlayer(playerId: string): boolean {
    return !!this._players[playerId];
  }

  getPlayerList(): Player[] {
    return Object.values(this._players);
  }

  // Team operations
  get teams(): Record<string, Team> {
    return this._teams;
  }

  setTeam(teamId: number, team: Team): void {
    this._teams[teamId] = team;
    this.saveData();
  }

  getTeam(teamId: number): Team | undefined {
    return this._teams[teamId];
  }

  hasTeam(teamId: number): boolean {
    return !!this._teams[teamId];
  }

  getTeamList(): Team[] {
    return Object.values(this._teams);
  }

  // Persistence operations
  private async saveData(): Promise<void> {
    try {
      const data: DataStore = {
        matches: this._matches,
        players: this._players,
        teams: this._teams,
      };
      await fs.promises.writeFile(
        this.dataFilePath,
        JSON.stringify(data, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = await fs.promises.readFile(this.dataFilePath, 'utf-8');
        const parsedData: DataStore = JSON.parse(data);
        this._matches = parsedData.matches || {};
        this._players = parsedData.players || {};
        this._teams = parsedData.teams || {};
        console.log('Data loaded from persistent storage');
      } else {
        console.log('No persistent data found, starting with empty store');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      this._matches = {};
      this._players = {};
      this._teams = {};
    }
  }

  async clearData(): Promise<void> {
    this._matches = {};
    this._players = {};
    this._teams = {};
    try {
      if (fs.existsSync(this.dataFilePath)) {
        await fs.promises.unlink(this.dataFilePath);
      }
    } catch (error) {
      console.error('Failed to clear data file:', error);
    }
  }
}
