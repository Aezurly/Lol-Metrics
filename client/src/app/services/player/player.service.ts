import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Player, Role, Team } from '@common/interfaces/match';
import { TeamsService } from '../teams/teams.service';
import { PlayerStatisticsService } from './player-statistics.service';
import { CommunicationService } from '../communication/communication.service';
// MatchsService used by PlayerStatisticsService when needed; not required here.

// Minimal view representation used by the PlayerStats component
interface PlayerStatView {
  numberOfGames: number;
  wins: number;
  averageKDA: string;
  averageCS: number;
  averageGold: number;
  averageDamage: number;
  averageVisionScore: number;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  currentRadarPlayerId: string | null = null;
  private static readonly PERFECT_KDA_VALUE = Infinity;
  private static readonly PERCENTILE_25 = 0.25;
  private static readonly PERCENTILE_75 = 0.75;

  private readonly teamsService = inject(TeamsService);
  private readonly communicationService = inject(CommunicationService);

  // Internal observable keeping current summary players
  private readonly players$ = new BehaviorSubject<Player[]>([]);

  /** Read-only observable for components that want to react to player updates */
  get playersObservable() {
    return this.players$.asObservable();
  }

  private readonly playerMap: Map<string, Player> = new Map();

  updatePlayerMap(players: Player[]): void {
    this.playerMap.clear();
    players.forEach((player) => {
      this.playerMap.set(player.uid, player);
    });
  }

  /**
   * Initialize service by fetching the application summary and populating
   * the teams mapping and internal player map. This uses the same API as
   * the rest of the app (`CommunicationService.getSummary`).
   */
  async initializeFromSummary(): Promise<void> {
    const summary = await firstValueFrom(
      this.communicationService.getSummary()
    );
    // update teams mapping so TeamsService can resolve names
    this.teamsService.updateTeamMap(summary.teamList);
    // update players
    this.updatePlayerMap(summary.playerList);
    this.players$.next(summary.playerList);
  }

  /**
   * Force refresh summary and update internal state. Returns the fetched players.
   */
  async refreshSummary(): Promise<Player[]> {
    const summary = await firstValueFrom(
      this.communicationService.getSummary()
    );
    // Update player map first
    this.updatePlayerMap(summary.playerList);
    this.players$.next(summary.playerList);

    // If server provided teamList, use it. Otherwise derive teams from players.
    let teamsToUse: Team[] = [];
    if (summary.teamList && summary.teamList.length > 0) {
      teamsToUse = summary.teamList;
    } else {
      const ids = Array.from(
        new Set(
          summary.playerList
            .map((p) => p.teamId)
            .filter((id): id is number => id !== undefined && id !== null)
        )
      );
      teamsToUse = ids.map((id) => ({
        id,
        name: this.teamsService.getTeamName(id),
        playersIds: [],
        matchIds: [],
      }));
    }

    this.teamsService.updateTeamMap(teamsToUse);

    return summary.playerList;
  }

  /**
   * Ask the server to reload teams+matches and then refresh the local summary.
   * This centralizes reload logic so components don't need to call CommunicationService directly.
   */
  async reloadAllAndRefresh(): Promise<Player[]> {
    // trigger server side reload
    await firstValueFrom(this.communicationService.reloadAll());
    // refresh local state from updated summary
    return this.refreshSummary();
  }

  getPlayerById(playerId: string): Player | undefined {
    return this.playerMap.get(playerId);
  }

  getPlayerByName(playerName: string): Player | undefined {
    const lowerName = playerName.toLowerCase();
    return Array.from(this.playerMap.values()).find(
      (player) => player.name.toLowerCase() === lowerName
    );
  }

  getAllPlayers(): Player[] {
    return Array.from(this.playerMap.values());
  }
}
