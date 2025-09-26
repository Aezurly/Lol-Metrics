import { Component } from '@angular/core';
import { MatchesService } from '../services/matches.service';
import { Match, PlayerMatchData, Role } from '@common/interfaces/match';

@Component({
  selector: 'app-game-stat-table',
  imports: [],
  templateUrl: './game-stat-table.html',
  styleUrl: './game-stat-table.scss',
})
export class GameStatTable {
  constructor(public readonly matchesService: MatchesService) {}

  get match(): Match | undefined {
    if (!this.matchesService.selectedMatchId) return undefined;

    return this.matchesService.getMatchById(
      this.matchesService.selectedMatchId
    );
  }

  /**
   * Return the playerIds ordered as: blue top, blue jgl, blue mid, blue adc, blue sup,
   * then same for red side. If role information is missing, fall back to match.playerIds order.
   */
  get orderedPlayerIds(): string[] {
    const m = this.match;
    if (!m) return [];

    // group players by side and role using the player stats and player service mapping from matchesService.buildRecap
    const blue: Array<{ id: string; role: Role | string }> = [];
    const red: Array<{ id: string; role: Role | string }> = [];

    for (const pid of m.playerIds) {
      const pdata: PlayerMatchData | undefined = m.stats?.[pid];
      const side = (pdata?.teamSideNumber ?? 1) - 1; // 0 blue, 1 red
      // PlayerMatchData does not declare role, so try to read a runtime 'role' if present
      const role = (pdata as unknown as { role?: Role })?.role ?? 'UNKNOWN';
      if (side === 0) blue.push({ id: pid, role });
      else red.push({ id: pid, role });
    }

    const roleOrder = [Role.TOP, Role.JUNGLE, Role.MID, Role.ADC, Role.SUPPORT];

    const sortByRole = (arr: Array<{ id: string; role: Role | string }>) =>
      roleOrder
        .map((r) => arr.filter((p) => p.role === r).map((p) => p.id))
        .flat();

    const blueOrdered = sortByRole(blue);
    const redOrdered = sortByRole(red);

    // If role-based ordering didn't produce 5 entries per side, append remaining players in original order
    const fillMissing = (ordered: string[], source: string[]) => {
      const set = new Set(ordered);
      for (const s of source) if (!set.has(s)) ordered.push(s);
      return ordered;
    };

    const blueFilled = fillMissing(
      blueOrdered,
      blue.map((p) => p.id)
    );
    const redFilled = fillMissing(
      redOrdered,
      red.map((p) => p.id)
    );

    return [...blueFilled, ...redFilled];
  }

  /** Return ordered players with id and name (uses matchesService recap when available) */
  get orderedPlayers(): { id: string; name: string }[] {
    const ids = this.orderedPlayerIds;
    const recap = this.matchesService.getMatchRecapById(
      this.matchesService.selectedMatchId ?? ''
    );
    const nameById: Record<string, string> = {};
    if (recap) {
      for (const p of recap.players) nameById[p.id] = p.name || p.id;
    }
    return ids.map((id) => ({ id, name: nameById[id] ?? id }));
  }

  /** Map attribute path to readable english label */
  readonly labelMap: Record<string, string> = {
    'combat.kills': 'Kills',
    'combat.deaths': 'Deaths',
    'combat.assists': 'Assists',
    'combat.doubleKills': 'Double kills',
    'combat.tripleKills': 'Triple kills',
    'combat.quadraKills': 'Quadra kills',
    'combat.pentaKills': 'Penta kills',
    'combat.ccScore': 'CC score',
    'combat.ccTime': 'CC time',
    'combat.totalCCTime': 'Total CC time',
    'combat.longestTimeSpentAlive': 'Longest time alive',
    'combat.timeSpentDead': 'Time spent dead',
    'damage.totalDamageToChampions': 'Damage to champs',
    'damage.physicalDamageToChampions': 'Physical damage to champs',
    'damage.magicDamageToChampions': 'Magic damage to champs',
    'damage.trueDamageToChampions': 'True damage to champs',
    'damage.totalDamageTaken': 'Damage taken',
    'damage.physicalDamageTaken': 'Physical damage taken',
    'damage.magicDamageTaken': 'Magic damage taken',
    'damage.trueDamageTaken': 'True damage taken',
    'damage.totalHealingDone': 'Healing done',
    'damage.totalHealingDoneToTeammates': 'Healing to teammates',
    'damage.totalDamageShieldedToTeammates': 'Damage shielded to teammates',
    'income.goldEarned': 'Gold',
    'income.goldFromPlates': 'Gold from plates',
    'income.goldFromStructures': 'Gold from structures',
    'income.goldSpent': 'Gold spent',
    'income.totalMinionsKilled': 'Minions',
    'income.neutralMinionsKilled': 'Neutral minions',
    'income.neutralMinionsKilledTeamJungle': 'Neutral minions (team jungle)',
    'income.neutralMinionsKilledEnemyJungle': 'Neutral minions (enemy jungle)',
    'vision.visionScore': 'Vision score',
    'vision.wardsPlaced': 'Wards placed',
    'vision.wardsKilled': 'Wards killed',
    'vision.controlWardPurchased': 'Control wards purchased',
    'objectives.turretsKilled': 'Turrets',
    'objectives.turretPlatesDestroyed': 'Turret plates destroyed',
    'objectives.totalDamageToTurrets': 'Damage to turrets',
    'objectives.totalDamageToObjectives': 'Damage to objectives',
    'objectives.ObjectivesStolen': 'Objectives stolen',
    'objectives.voidGrubKills': 'Void grub kills',
    'objectives.riftHeraldKills': 'Rift Herald kills',
    'objectives.dragonKills': 'Dragon kills',
    'objectives.baronKills': 'Baron kills',
  };

  // Per-category attribute arrays (include optional fields too)
  readonly combatAttrs: string[] = [
    'combat.kills',
    'combat.deaths',
    'combat.assists',
    'combat.doubleKills',
    'combat.tripleKills',
    'combat.quadraKills',
    'combat.pentaKills',
    'combat.ccScore',
    'combat.ccTime',
    'combat.totalCCTime',
    'combat.longestTimeSpentAlive',
    'combat.timeSpentDead',
  ];

  readonly damageAttrs: string[] = [
    'damage.totalDamageToChampions',
    'damage.physicalDamageToChampions',
    'damage.magicDamageToChampions',
    'damage.trueDamageToChampions',
    'damage.totalDamageTaken',
    'damage.physicalDamageTaken',
    'damage.magicDamageTaken',
    'damage.trueDamageTaken',
    'damage.totalHealingDone',
    'damage.totalHealingDoneToTeammates',
    'damage.totalDamageShieldedToTeammates',
  ];

  readonly incomeAttrs: string[] = [
    'income.goldEarned',
    'income.goldFromPlates',
    'income.goldFromStructures',
    'income.goldSpent',
    'income.totalMinionsKilled',
    'income.neutralMinionsKilled',
    'income.neutralMinionsKilledTeamJungle',
    'income.neutralMinionsKilledEnemyJungle',
  ];

  readonly visionAttrs: string[] = [
    'vision.visionScore',
    'vision.wardsPlaced',
    'vision.wardsKilled',
    'vision.controlWardPurchased',
  ];

  readonly objectivesAttrs: string[] = [
    'objectives.turretsKilled',
    'objectives.turretPlatesDestroyed',
    'objectives.totalDamageToTurrets',
    'objectives.totalDamageToObjectives',
    'objectives.ObjectivesStolen',
    'objectives.voidGrubKills',
    'objectives.riftHeraldKills',
    'objectives.dragonKills',
    'objectives.baronKills',
  ];

  get categories(): { title: string; attrs: string[] }[] {
    return [
      { title: 'Combat', attrs: this.combatAttrs },
      { title: 'Damage', attrs: this.damageAttrs },
      { title: 'Income', attrs: this.incomeAttrs },
      { title: 'Vision', attrs: this.visionAttrs },
      { title: 'Objectives', attrs: this.objectivesAttrs },
    ];
  }

  /** Return true if at least one player has a non-zero value for this attribute */
  attrHasNonZero(attr: string): boolean {
    const players = this.orderedPlayers;
    for (const p of players) {
      const v = this.statFor(p.id, attr);
      if (typeof v === 'number' && v !== 0) return true;
      if (typeof v === 'string' && v !== '0' && v !== '') return true;
    }
    return false;
  }

  /** Return the maximum numeric value for this attribute across ordered players */
  attrMaxValue(attr: string): number {
    const players = this.orderedPlayers;
    let max = -Infinity;
    for (const p of players) {
      const v = this.statFor(p.id, attr);
      const num = typeof v === 'string' ? Number(v) : (v as unknown as number);
      const n = isNaN(num) ? 0 : num;
      if (n > max) max = n;
    }
    return max === -Infinity ? 0 : max;
  }

  /** Return true if the given player's value is the max for that attribute (ties allowed) */
  isAttrMax(attr: string, playerId: string): boolean {
    const v = this.statFor(playerId, attr);
    const num = typeof v === 'string' ? Number(v) : (v as unknown as number);
    const n = isNaN(num) ? 0 : num;
    const max = this.attrMaxValue(attr);
    return max > 0 && n === max;
  }

  /** Format numbers. For damage/gold/healing attributes show in thousands (e.g. 8.2k) */
  formatStat(attr: string, value: number | string): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (isNaN(num) || num === 0) return num === 0 ? '0' : String(value ?? '0');

    const attrLower = attr.toLowerCase();
    const shouldK =
      attrLower.includes('damage') ||
      attrLower.includes('gold') ||
      attrLower.includes('healing');
    if (shouldK) {
      const thousands = num / 1000;
      return thousands >= 1
        ? `${thousands.toFixed(1)}k`
        : Math.round(num).toString();
    }

    return Math.round(num).toString();
  }

  // Helpers to access stats safely
  statFor(playerId: string, path: string): number | string {
    const m = this.match;
    if (!m) return 0;
    const p = m.stats?.[playerId];
    if (!p) return 0;
    // path like 'combat.kills' or 'damage.totalDamageToChampions'
    const parts = path.split('.');
    let cur: unknown = p;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return 0;
      cur = (cur as Record<string, unknown>)[part];
    }
    return (cur as number) ?? 0;
  }
}
