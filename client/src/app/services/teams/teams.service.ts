import { Injectable } from '@angular/core';
import { Team } from '@common/interfaces/match';

@Injectable({
  providedIn: 'root',
})
export class TeamsService {
  private readonly teamMap: Map<number, string> = new Map();

  /**
   * Updates the team mapping from the team list
   * @param teams Array of teams from the API
   */
  updateTeamMap(teams: Team[]): void {
    this.teamMap.clear();
    teams.forEach((team) => {
      this.teamMap.set(team.id, team.name);
    });
  }

  /**
   * Gets the team name by team ID
   * @param teamId The team ID
   * @returns The team name or 'Unknown Team' if not found
   */
  getTeamName(teamId: number | undefined): string {
    if (teamId === undefined || teamId === null) {
      return 'No Team';
    }
    return this.teamMap.get(teamId) || `Team ${teamId}`;
  }

  /**
   * Gets all teams as an array of {id, name} objects
   * @returns Array of team objects
   */
  getAllTeams(): { id: number; name: string }[] {
    return Array.from(this.teamMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  /**
   * Checks if the team map has been initialized
   * @returns True if team map is not empty
   */
  isInitialized(): boolean {
    return this.teamMap.size > 0;
  }
}
