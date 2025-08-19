import { Injectable, OnModuleInit } from '@nestjs/common';
import { Team, Match } from '@common/interfaces/match';
import { DataStoreService } from '../data-store/data-store.service';
import * as fs from 'fs';
import * as path from 'path';

interface TeamsConfig {
  teams: Array<{
    id: number;
    name: string;
    playersNames: string[];
    LBLCS: boolean;
  }>;
}

@Injectable()
export class TeamService implements OnModuleInit {
  constructor(private readonly dataStore: DataStoreService) {}

  async onModuleInit() {
    await this.loadTeamsFromConfig();
  }

  async reloadTeamsFromConfig(): Promise<void> {
    console.log('Reloading teams from configuration...');
    await this.loadTeamsFromConfig();
  }

  private async loadTeamsFromConfig(): Promise<void> {
    try {
      const teamsFilePath = path.join(process.cwd(), 'src', 'teams.json');
      const teamsData = await fs.promises.readFile(teamsFilePath, 'utf-8');
      const teamsConfig: TeamsConfig = JSON.parse(teamsData);

      for (const teamConfig of teamsConfig.teams) {
        const team: Team = {
          id: teamConfig.id,
          name: teamConfig.name,
          playersIds: [],
          matchIds: [],
        };

        this.dataStore.setTeam(team.id, team);
        console.log(`Team ${team.name} loaded with ID ${team.id}`);
      }
    } catch (error) {
      console.error('Failed to load teams configuration:', error);
    }
  }

  async updateTeamStatsFromMatch(match: Match): Promise<void> {
    const teams = this.dataStore.getTeamList();

    for (const team of teams) {
      const teamPlayersInMatch = team.playersIds.filter((playerId) =>
        match.playerIds.includes(playerId),
      );

      if (teamPlayersInMatch.length > 0 && !team.matchIds.includes(match.id)) {
        if (!match.teamIds.includes(team.id)) {
          match.teamIds.push(team.id);
        }
        team.matchIds.push(match.id);
        this.dataStore.setTeam(team.id, team);
        console.log(`Added match ${match.id} to team ${team.name}`);
      }
    }
  }

  async assignPlayerToTeam(
    playerId: string,
    playerName: string,
  ): Promise<void> {
    try {
      const teamsFilePath = path.join(process.cwd(), 'src', 'teams.json');
      const teamsData = await fs.promises.readFile(teamsFilePath, 'utf-8');
      const teamsConfig: TeamsConfig = JSON.parse(teamsData);

      for (const teamConfig of teamsConfig.teams) {
        if (teamConfig.playersNames.includes(playerName)) {
          const team = this.dataStore.getTeam(teamConfig.id);

          if (team) {
            if (!team.playersIds.includes(playerId)) {
              team.playersIds.push(playerId);
              this.dataStore.setTeam(team.id, team);
            }

            const player = this.dataStore.getPlayer(playerId);
            console.log(
              `Assigned player ${playerName} (${playerId}) to team ${team.name}`,
            );
            if (player) {
              player.teamId = team.id;
              this.dataStore.setPlayer(playerId, player);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Failed to assign player to team:', error);
    }
  }

  getTeamList(): Team[] {
    return this.dataStore.getTeamList();
  }

  getTeam(teamId: number): Team | undefined {
    return this.dataStore.getTeam(teamId);
  }
}
