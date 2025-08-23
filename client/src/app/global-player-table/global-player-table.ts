import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunicationService } from '../services/communication/communication.service';
import { PlayerService } from '../services/player/player.service';
import { TeamsService } from '../services/teams/teams.service';
import { Player } from '@common/interfaces/match';

@Component({
  selector: 'app-global-player-table',
  imports: [CommonModule],
  templateUrl: './global-player-table.html',
  styleUrl: './global-player-table.scss',
})
export class GlobalPlayerTable implements OnInit {
  players: Player[] = [];
  originalPlayers: Player[] = [];
  filteredPlayers: Player[] = [];
  loading = true;
  error: string | null = null;

  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' | null = null;

  selectedRole: string | null = null;
  selectedTeamId: number | null = null;

  constructor(
    private readonly communication: CommunicationService,
    private readonly playerService: PlayerService,
    private readonly teamsService: TeamsService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.communication.getSummary().subscribe({
      next: (summary) => {
        this.teamsService.updateTeamMap(summary.teamList);

        this.playerService.updatePlayerMap(summary.playerList);
        this.originalPlayers = [...summary.playerList];
        this.filteredPlayers = [...summary.playerList];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data: ' + err.message;
        this.loading = false;
        console.error('Error loading summary:', err);
      },
    });
  }

  reloadData(): void {
    this.communication.reloadAll().subscribe({
      next: (response) => {
        console.log(response.message);
        this.loadData();
      },
      error: (err) => {
        this.error = 'Failed to reload data: ' + err.message;
        console.error('Error reloading data:', err);
      },
    });
  }

  protected getKDA(player: Player): string {
    return this.playerService.getKDA(player);
  }

  protected getKDAValue(player: Player): number {
    return this.playerService.getKDAValue(player);
  }

  protected getKDAColorClass(player: Player): string {
    return this.playerService.getKDAColorClass(player, this.players);
  }

  protected getTotalMinutesPlayed(player: Player): number {
    return this.playerService.getTotalMinutesPlayed(player);
  }

  protected getCSPerMinute(player: Player): string {
    return this.playerService.getCSPerMinute(player);
  }

  protected getDamagePerMinute(player: Player): string {
    return this.playerService.getDamagePerMinute(player);
  }

  protected getGoldPerMinute(player: Player): string {
    return this.playerService.getGoldPerMinute(player);
  }

  protected getDamagePerGold(player: Player): string {
    return this.playerService.getDamagePerGold(player);
  }

  protected getKillParticipation(player: Player): string {
    return this.playerService.getKillParticipation(player);
  }

  protected getVisionScorePerMinute(player: Player): string {
    return this.playerService.getVisionScorePerMinute(player);
  }

  protected getWinRate(player: Player): string {
    return this.playerService.getWinRate(player);
  }

  protected getMostPlayedChampion(player: Player): string {
    return this.playerService.getMostPlayedChampion(player);
  }

  protected getRoleBadgeClass(role: string): string {
    return this.playerService.getRoleBadgeClass(role);
  }

  protected getTeamName(player: Player): string {
    return this.teamsService.getTeamName(player.teamId);
  }

  protected sortBy(column: string): void {
    if (this.sortColumn === column) {
      // Cycle through: asc -> desc -> null (reset)
      if (this.sortDirection === 'asc') {
        this.sortDirection = 'desc';
      } else if (this.sortDirection === 'desc') {
        this.sortDirection = null;
        this.sortColumn = null;
      }
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
  }

  private applySorting(): void {
    if (!this.sortColumn || !this.sortDirection) {
      // Reset to filtered order (no sorting applied)
      this.players = [...this.filteredPlayers];
      return;
    }

    this.players = [...this.filteredPlayers].sort((a, b) => {
      const valueA = this.getSortValue(a, this.sortColumn!);
      const valueB = this.getSortValue(b, this.sortColumn!);

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private getSortValue(player: Player, column: string): number | string {
    return this.playerService.getSortValue(player, column);
  }

  protected isSorted(column: string): boolean {
    return this.sortColumn === column && this.sortDirection !== null;
  }

  // Filter methods
  protected filterByRole(role: string | null): void {
    console.log('filter by role :', role);
    this.selectedRole = role;
    this.applyFilters();
  }

  protected filterByTeam(teamId: number | null): void {
    this.selectedTeamId = teamId;
    this.applyFilters();
  }

  protected clearAllFilters(): void {
    this.selectedRole = null;
    this.selectedTeamId = null;
    this.applyFilters();
  }

  protected hasActiveFilters(): boolean {
    return this.selectedRole !== null || this.selectedTeamId !== null;
  }

  protected getSelectedTeamName(): string {
    if (this.selectedTeamId === null) {
      return 'All';
    }
    return this.teamsService.getTeamName(this.selectedTeamId);
  }

  protected getAvailableTeams(): Array<{ id: number; name: string }> {
    const teams = new Set<number>();
    this.originalPlayers.forEach((player) => {
      if (player.teamId !== undefined) {
        teams.add(player.teamId);
      }
    });

    return Array.from(teams)
      .map((teamId) => ({
        id: teamId,
        name: this.teamsService.getTeamName(teamId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private applyFilters(): void {
    let filtered = [...this.originalPlayers];

    // Apply role filter
    if (this.selectedRole) {
      filtered = filtered.filter((player) => player.role === this.selectedRole);
    }

    // Apply team filter
    if (this.selectedTeamId !== null) {
      filtered = filtered.filter(
        (player) => player.teamId === this.selectedTeamId
      );
    }

    this.filteredPlayers = filtered;
    this.applySorting();
  }
}
