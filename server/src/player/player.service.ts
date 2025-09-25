import {
  Player,
  Match,
  Role,
  PlayerStat,
  CombatStats,
  DamageStats,
  VisionStats,
  IncomeStats,
} from '@common/interfaces/match';
import { Injectable } from '@nestjs/common';
import { DataStoreService } from '../data-store/data-store.service';
import { TeamService } from '../team/team.service';

@Injectable()
export class PlayerService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly teamService: TeamService,
  ) {}

  async updateFromMatch(match: Match): Promise<void> {
    for (const playerId of match.playerIds) {
      let player: Player | undefined = this.dataStore.getPlayer(playerId);
      if (!player) {
        const rawParticipant = match.raw?.participants?.find(
          (p) => p.PUUID === playerId,
        );
        const playerName = rawParticipant?.RIOT_ID_GAME_NAME || '';

        player = {
          uid: playerId,
          name: playerName,
          teamId: undefined,
          matchIds: [],
          role: this.getPlayerRole(rawParticipant),
          stats: this.createPlayerStat(),
        };
        this.dataStore.setPlayer(playerId, player);
        if (playerName) {
          await this.teamService.assignPlayerToTeam(playerId, playerName);
          player = this.dataStore.getPlayer(playerId) || player;
        }
      }

      if (!player.matchIds.includes(match.id)) {
        player.matchIds.push(match.id);
        this.updatePlayerStat(match, player);
      }

      this.dataStore.setPlayer(playerId, player);
    }
  }

  private updatePlayerStat(match: Match, player: Player): void {
    const participantStats = match.stats[player.uid];
    if (!participantStats) {
      console.warn(
        `No participant stats found for player ${player.uid} in match ${match.id}`,
      );
      return;
    }

    this.updateChampionPlayCount(player, participantStats.championPlayed);
    this.updateCombatAndDamageStats(
      player,
      participantStats.combat,
      participantStats.damage,
    );
    this.updateVisionAndIncomeStats(
      player,
      participantStats.vision,
      participantStats.income,
    );
    this.updateGlobalStats(player, match, participantStats.teamSideNumber);
    player.stats.wins += participantStats.win ? 1 : 0;
  }

  private updateGlobalStats(
    player: Player,
    match: Match,
    teamSideNumber: number,
  ): void {
    player.stats.totalTimePlayed += match.duration;
    const teamPlayersInMatch: string[] = Object.entries(match.stats)
      .filter(([, p]) => p.teamSideNumber === teamSideNumber)
      .map(([playerId]) => playerId);

    const totalTeamKills = teamPlayersInMatch.reduce((totalKills, playerId) => {
      const playerStats = match.stats[playerId];
      return totalKills + (playerStats?.combat.kills || 0);
    }, 0);

    player.stats.totalTeamKills += totalTeamKills;
  }

  private updateChampionPlayCount(player: Player, championName: string): void {
    const currentCount = player.stats.championPlayed[championName] || 0;
    player.stats.championPlayed[championName] = currentCount + 1;
  }

  private updateCombatAndDamageStats(
    player: Player,
    combat: CombatStats,
    damage: DamageStats,
  ): void {
    player.stats.totalKills += combat.kills || 0;
    player.stats.totalDeaths += combat.deaths || 0;
    player.stats.totalAssists += combat.assists || 0;
    player.stats.totalDamageDealt += damage.totalDamageToChampions || 0;
  }

  private updateVisionAndIncomeStats(
    player: Player,
    vision: VisionStats,
    income: IncomeStats,
  ): void {
    player.stats.totalVisionScore += vision.visionScore || 0;
    player.stats.totalControlWardsPurchased! +=
      vision.controlWardPurchased || 0;
    player.stats.totalGoldEarned += income.goldEarned || 0;
    player.stats.totalMinionsKilled +=
      (income.totalMinionsKilled ?? 0) + (income.neutralMinionsKilled ?? 0);
  }

  private createPlayerStat(): PlayerStat {
    return {
      championPlayed: {},
      wins: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalDamageDealt: 0,
      totalVisionScore: 0,
      totalControlWardsPurchased: 0,
      totalGoldEarned: 0,
      totalMinionsKilled: 0,
      totalTimePlayed: 0,
      totalTeamKills: 0,
    };
  }

  private getPlayerRole(rawParticipant?: any): Role {
    const rawRole =
      rawParticipant.INDIVIDUAL_POSITION ||
      rawParticipant.TEAM_POSITION ||
      'UNKNOWN';

    switch (rawRole) {
      case 'TOP':
        return Role.TOP;
      case 'JUNGLE':
        return Role.JUNGLE;
      case 'MIDDLE':
        return Role.MID;
      case 'BOTTOM':
        return Role.ADC;
      case 'UTILITY':
        return Role.SUPPORT;
      default:
        return Role.UNKNOWN;
    }
  }
}
