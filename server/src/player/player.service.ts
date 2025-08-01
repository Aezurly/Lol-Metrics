import { Player, Match, Role } from '@common/interfaces/match';
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
      let player = this.dataStore.getPlayer(playerId);
      if (!player) {
        const rawParticipant = match.raw.participants?.find(
          (p) => p.PUUID === playerId,
        );
        const playerName = rawParticipant?.RIOT_ID_GAME_NAME || '';

        player = {
          uid: playerId,
          name: playerName,
          teamId: undefined,
          matchIds: [],
          role: this.getPlayerRole(rawParticipant),
        };
        this.dataStore.setPlayer(playerId, player);
        if (playerName) {
          await this.teamService.assignPlayerToTeam(playerId, playerName);
          player = this.dataStore.getPlayer(playerId) || player;
        }
      }

      if (!player.matchIds.includes(match.id)) {
        player.matchIds.push(match.id);
      }

      this.dataStore.setPlayer(playerId, player);
    }
  }

  getPlayerRole(rawParticipant?: any): Role {
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
