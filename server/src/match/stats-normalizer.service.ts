import { Injectable } from '@nestjs/common';
import { PlayerMatchData } from '@common/interfaces/match';

@Injectable()
export class StatsNormalizerService {
  constructor() {}

  extractParticipantStats(participant: any): PlayerMatchData {
    const toNum = (v: any): number => {
      if (v === null || v === undefined || v === '') return 0;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return isNaN(n) ? 0 : n;
    };

    const optNum = (v: any): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(n)) return undefined;
      return n;
    };

    return {
      teamNumber: toNum(participant['TEAM']) / 100,
      championPlayed: participant['SKIN'] || participant['CHAMPION'],
      win: participant['WIN'] === 'Win',
      combat: {
        kills: toNum(
          participant['CHAMPIONS_KILLED'] ?? participant['KILLS'] ?? 0,
        ),
        deaths: toNum(participant['NUM_DEATHS'] ?? participant['DEATHS'] ?? 0),
        assists: toNum(participant['ASSISTS'] ?? 0),
        doubleKills: optNum(participant['DOUBLE_KILLS'] ?? 0),
        tripleKills: optNum(participant['TRIPLE_KILLS'] ?? 0),
        quadraKills: optNum(participant['QUADRA_KILLS'] ?? 0),
        pentaKills: optNum(participant['PENTA_KILLS'] ?? 0),
        ccScore: optNum(participant['TIME_CCING_OTHERS']),
        ccTime: optNum(
          participant['TOTAL_TIME_CROWD_CONTROL_DEALT_TO_CHAMPIONS'],
        ),
        totalCCTime: optNum(participant['TOTAL_TIME_CROWD_CONTROL_DEALT']),
        longestTimeSpentAlive: optNum(participant['LONGEST_TIME_SPENT_LIVING']),
        timeSpentDead: optNum(participant['TOTAL_TIME_SPENT_DEAD']),
      },
      damage: {
        totalDamageToChampions: toNum(
          participant['TOTAL_DAMAGE_DEALT_TO_CHAMPIONS'],
        ),
        physicalDamageToChampions: optNum(
          participant['PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS'],
        ),
        magicDamageToChampions: optNum(
          participant['MAGIC_DAMAGE_DEALT_TO_CHAMPIONS'],
        ),
        trueDamageToChampions: optNum(
          participant['TRUE_DAMAGE_DEALT_TO_CHAMPIONS'],
        ),
        totalDamageTaken: optNum(participant['TOTAL_DAMAGE_TAKEN']),
        physicalDamageTaken: optNum(participant['PHYSICAL_DAMAGE_TAKEN']),
        magicDamageTaken: optNum(participant['MAGIC_DAMAGE_TAKEN']),
        trueDamageTaken: optNum(participant['TRUE_DAMAGE_TAKEN']),
        totalHealingDone: optNum(participant['TOTAL_HEAL']),
        totalHealingDoneToTeammates: optNum(
          participant['TOTAL_HEAL_ON_TEAMMATES'],
        ),
        totalDamageShieldedToTeammates: optNum(
          participant['TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES'],
        ),
      },
      vision: {
        visionScore: toNum(participant['VISION_SCORE']),
        wardsPlaced: toNum(participant['WARD_PLACED']),
        wardsKilled: toNum(participant['WARD_KILLED']),
        controlWardPurchased: optNum(participant['WARD_PLACED_DETECTOR']),
      },
      income: {
        goldEarned: toNum(participant['GOLD_EARNED']),
        goldFromPlates: optNum(
          participant['Missions_GoldFromTurretPlatesTaken'],
        ),
        goldFromStructures: optNum(
          participant['Missions_GoldFromStructuresDestroyed'],
        ),
        goldSpent: optNum(participant['GOLD_SPENT']),
        totalMinionsKilled: optNum(participant['MINIONS_KILLED']),
        neutralMinionsKilled: optNum(participant['NEUTRAL_MINIONS_KILLED']),
        neutralMinionsKilledTeamJungle: optNum(
          participant['NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE'],
        ),
        neutralMinionsKilledEnemyJungle: optNum(
          participant['NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE'],
        ),
      },
      objectives: {
        turretsKilled: optNum(participant['TURRETS_KILLED']),
        turretPlatesDestroyed: optNum(
          participant['Missions_TurretPlatesDestroyed'],
        ),
        totalDamageToTurrets: optNum(
          participant['TOTAL_DAMAGE_DEALT_TO_TURRETS'],
        ),
        totalDamageToObjectives: optNum(
          participant['TOTAL_DAMAGE_DEALT_TO_OBJECTIVES'],
        ),
        ObjectivesStolen: optNum(participant['OBJECTIVES_STOLEN']),
        voidGrubKills: optNum(participant['HORDE_KILLS']),
        riftHeraldKills: optNum(participant['RIFT_HERALD_KILLS']),
        dragonKills: optNum(participant['DRAGON_KILLS']),
        baronKills: optNum(participant['BARON_KILLS']),
      },
    };
  }
}
