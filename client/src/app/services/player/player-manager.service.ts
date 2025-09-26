import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Player, Team } from '@common/interfaces/match';
import { TeamsService } from '../teams/teams.service';
import { CommunicationService } from '../communication/communication.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerManagerService {
  currentRadarPlayerId: string | null = null;

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

  /** Total games across all matches (sum of matchIds length on players is not ideal but useful here) */
  getTotalGames(): number {
    const matches = new Set<string>();
    this.getAllPlayers().forEach((p) =>
      p.matchIds.forEach((m) => matches.add(m))
    );
    return matches.size;
  }

  /** Return rank of player's KDA among all players (1-based, 1 = best). Returns undefined if player not found. */
  getKDAranking(playerId: string): number | undefined {
    const player = this.getPlayerById(playerId);
    if (!player) return undefined;
    // Note: ranking by KDA now delegated to PlayerStatService if needed externally.
    const all = this.getAllPlayers().map((p) => ({
      id: p.uid,
      // placeholder value: consumers should call PlayerStatService.getKDAValue
      kda:
        p.stats.totalDeaths === 0
          ? p.stats.totalKills + p.stats.totalAssists
          : (p.stats.totalKills + p.stats.totalAssists) / p.stats.totalDeaths,
    }));
    all.sort((a, b) => b.kda - a.kda); // descending
    const idx = all.findIndex((x) => x.id === playerId);
    return idx >= 0 ? idx + 1 : undefined;
  }

  getTotalUniquePlayers(): number {
    return this.getAllPlayers().length;
  }

  getPlayerStatView(playerId: string): {
    stats: any | undefined;
    player?: Player;
  } {
    const player = this.getPlayerById(playerId);
    if (!player) return { stats: undefined };

    const numberOfGames = player.matchIds.length;
    const wins = player.stats.wins;
    // the rest of stat formatting is provided by PlayerStatService
    return {
      stats: {
        numberOfGames,
        wins,
      },
      player,
    };
  }
}
