import {
  GROUND_DATA,
  UNIT_RENDER_PROFILES,
  getEffectivePartyUnits,
  getUnitCommonPassive,
  getPartyCommonPassiveSummary,
  formatNumber,
  getGroundStageState,
  normalizePartyFormation,
  resolveGround,
  recordQuestProgress,
  resolveUnitSprite,
} from './assets.js';
import { clamp, lerp, wait, pickAlive, waitForMedia } from './battle-shared.js';
import { getLimitBurstData } from './limit-data.js';

export function attachBattleFlow(HomeBattleCore) {
  Object.assign(HomeBattleCore.prototype, {
ensureCombatants() {
  const party = getEffectivePartyUnits(this.state);
  const formation = this.getAllyFormationSlots(party);
  this.ensureBattleTracking();
  this.allies = party.map((unit, index) => ({
    id: unit.id,
    team: 'ally',
    unit,
    hp: unit.hp,
    maxHp: unit.maxHp,
    state: 'idle',
    idleState: 'idle',
    prevSpriteState: null,
    x: formation[index].x,
    y: formation[index].y,
    homeX: formation[index].x,
    homeY: formation[index].y,
    motion: null,
    actionCount: 0,
    skillClock: 0,
    skillCooldowns: {},
    lane: index,
    turnIndex: index,
    element: this.normalizeElement(unit.element),
    renderProfile: UNIT_RENDER_PROFILES[unit.assetKey] || { scale: 1, shiftY: 0, size: 108, contact: 10 },
    effects: { guard: 0, taunt: 0, attackUp: 0, critUp: 0 },
  }));
  this.spawnEncounter();
},

ensureBattleTracking() {
  if (!this.state.home.earnedResources) {
    this.state.home.earnedResources = { gold: 0, gems: 0, growthStone: 0, waves: 0, bosses: 0 };
  }
  if (!this.state.home.battleStats) this.state.home.battleStats = {};
  const pendingGold = Math.max(0, Math.floor(Number(this.state.home.rewardGold) || 0));
  if (pendingGold > 0) {
    this.state.resources.gold += pendingGold;
    this.state.home.earnedResources.gold = (this.state.home.earnedResources.gold || 0) + pendingGold;
    this.state.home.rewardGold = 0;
  }
},

recordResourceGain(kind, amount = 0) {
  this.ensureBattleTracking();
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  this.state.home.earnedResources[kind] = (this.state.home.earnedResources[kind] || 0) + safeAmount;
  const key = kind === 'waves' ? 'waves' : kind === 'bosses' ? 'bosses' : '';
  if (key) recordQuestProgress(this.state, key, safeAmount);
},


recordBattleLog(entry = {}) {
  this.ensureBattleTracking();
  const logs = Array.isArray(this.state.home.battleLogs) ? this.state.home.battleLogs : [];
  logs.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: Date.now(),
    type: entry.type || 'info',
    title: entry.title || '전투 기록',
    message: entry.message || '',
    rewards: Array.isArray(entry.rewards) ? entry.rewards.filter((reward) => Number(reward.amount) > 0) : [],
  });
  this.state.home.battleLogs = logs.slice(0, 80);
  this.onStateChange?.();
},

getBattleLogName(actor) {
  if (!actor) return '알 수 없음';
  if (actor.team === 'ally') return actor.unit?.name || '아군';
  const prefix = actor.isBoss ? '보스' : '몬스터';
  return `${prefix} ${actor.monsterId || ''}`.trim();
},

recordDamageLog({ source, target, amount = 0, action = '공격', crit = false, limit = false } = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!source || !target || safeAmount <= 0) return;
  this.recordBattleLog({
    type: source.team === 'ally' ? (limit ? 'limit' : crit ? 'critical' : 'damage') : 'enemy-damage',
    title: `${this.getBattleLogName(source)} → ${this.getBattleLogName(target)}`,
    message: `${action}${crit ? ' 치명타' : ''}로 ${formatNumber(safeAmount)} 피해`,
  });
},

recordHealLog({ source, target, amount = 0, action = '회복' } = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!source || !target || safeAmount <= 0) return;
  this.recordBattleLog({
    type: 'heal',
    title: `${this.getBattleLogName(source)} → ${this.getBattleLogName(target)}`,
    message: `${action}으로 HP ${formatNumber(safeAmount)} 회복`,
  });
},

recordEffectLog({ source, target, action = '지원', effect = '' } = {}) {
  if (!source || !target) return;
  this.recordBattleLog({
    type: 'effect',
    title: `${this.getBattleLogName(source)} → ${this.getBattleLogName(target)}`,
    message: effect ? `${action}: ${effect}` : action,
  });
},
getActorPassive(actor) {
  if (!actor || actor.team !== 'ally') return null;
  return getUnitCommonPassive(actor.unit);
},

maybeShowPassiveCue(actor, { target = actor, x = actor?.x, y = actor?.y, type = 'buff', chance = 1 } = {}) {
  const passive = this.getActorPassive(actor);
  if (!passive || Math.random() > chance) return;
  const isUnique = Boolean(passive.unique);
  const label = passive.label || (isUnique ? '\uace0\uc720 \ud328\uc2dc\ube0c' : '\ud328\uc2dc\ube0c');
  const effect = passive.text || (isUnique ? '\uace0\uc720 \ud328\uc2dc\ube0c \ubc1c\ub3d9' : '\ud328\uc2dc\ube0c \ubc1c\ub3d9');
  const variant = type === 'limit' ? 'limit-dmg' : type === 'heal' ? 'heal' : 'buff';
  this.addFloater({
    x: clamp(Number(x) || actor.x, 8, 92),
    y: clamp((Number(y) || actor.y) + 18, 10, 92),
    value: label,
    variant,
  });
  this.recordEffectLog({
    source: actor,
    target: target || actor,
    action: isUnique ? '\uace0\uc720 \ud328\uc2dc\ube0c' : '\ud328\uc2dc\ube0c',
    effect: `${label} - ${effect}`,
  });
},
recordUnitBattleStat(actor, key, amount = 1) {
  if (!actor?.unit?.id) return;
  this.ensureBattleTracking();
  const stats = this.state.home.battleStats;
  if (!stats[actor.unit.id]) {
    stats[actor.unit.id] = {
      name: actor.unit.name,
      damage: 0,
      healing: 0,
      buffs: 0,
      debuffs: 0,
      kills: 0,
      turns: 0,
    };
  }
  stats[actor.unit.id].name = actor.unit.name;
  stats[actor.unit.id][key] = (stats[actor.unit.id][key] || 0) + Math.max(0, Math.floor(Number(amount) || 0));
},

advanceSkillClock(actor) {
  actor.skillClock = (actor.skillClock || 0) + 1;
},

canUseSkill(actor, skill) {
  return (actor.skillCooldowns?.[skill] || 0) <= (actor.skillClock || 0);
},

setSkillCooldown(actor, skill, turns = 1) {
  if (!actor.skillCooldowns) actor.skillCooldowns = {};
  actor.skillCooldowns[skill] = (actor.skillClock || 0) + Math.max(1, turns);
},

activateOpeningTactics() {
  const firstEnemy = pickAlive(this.enemies).sort((a, b) => Number(b.isBoss) - Number(a.isBoss) || b.maxHp - a.maxHp)[0] || null;
  this.allies.forEach((ally) => {
    const job = this.getJob(ally);
    if (!ally.effects) ally.effects = {};
    if (this.hasJobRole(ally, '탱커')) {
      this.applyBuff(ally, 'guard', job === '성기사' || job === '룬나이트' ? 5 : 3, 'GUARD');
      this.applyBuff(ally, 'taunt', job === '성기사' ? 4 : 2, '도발');
    }
    if (this.hasJobRole(ally, '버퍼')) {
      const target = this.getPreferredBuffTarget(ally);
      this.applyBuff(target, 'attackUp', 3, 'ATK↑');
      this.applyBuff(target, 'critUp', job === '도박사' ? 4 : 3, 'CRIT↑');
    }
    if (this.hasJobRole(ally, '디버퍼') && firstEnemy) {
      this.applyBreak(firstEnemy, job === '학자' || job === '청마도사' ? 3 : 2, 'BREAK');
    }
  });
},

getAllyFormationSlots(party) {
  // x: 화면 오른쪽 기준 (transform -50% 적용됨)
  // y: bottom % — 낮을수록 앞쪽(하단), 높을수록 뒤쪽(상단)
  // x: left% 기준, transform -50%로 스프라이트 중심 정렬
  // y: bottom% — 높을수록 뒤쪽(화면 위), 낮을수록 앞쪽(화면 아래)
  // 2열 사각 포메이션:
  //   뒷줄(x≈68~72): 화면 안쪽, y 높음(위쪽)
  //   앞줄(x≈82~86): 화면 바깥쪽(오른쪽), y 낮음(아래쪽)
  // FF2 스타일: 오른쪽 세로 일렬 배치
  // x는 동일(78%), y만 위(뒤)→아래(앞) 순서
  // 적 x=16 기준 대칭 → 아군 x=84 (오른쪽 벽 동일 거리)
  // 바닥 영역(y=2~28) — 세라핌 잘림 방지, 균등 간격
  const defaults = [
    { x: 72, y: 28 },
    { x: 58, y: 20 },
    { x: 72, y: 11 },
    { x: 58, y: 3 },
  ];

  const byRow = {
    back: [
      { x: 81, y: 38 },
      { x: 74, y: 26 },
      { x: 82, y: 14 },
      { x: 76, y: 3 },
    ],
    front: [
      { x: 64, y: 35 },
      { x: 56, y: 23 },
      { x: 67, y: 11 },
      { x: 53, y: 1 },
    ],
  };

  const byAsset = {
    seraphim:    { x: 72, y: 28 },
    slasher:     { x: 58, y: 20 },
    shadow_fang: { x: 72, y: 11 },
    guardian:    { x: 58, y: 3 },
    blade:       { x: 58, y: 3 },
    stone_wall:  { x: 72, y: 11 },
    aura_mage:   { x: 72, y: 28 },
    flare_witch: { x: 58, y: 20 },
  };

  const formation = normalizePartyFormation(this.state.party?.formation);
  return party.map((unit, index) => {
    const profile = UNIT_RENDER_PROFILES[unit.assetKey] || {};
    const slotIndex = this.state.party?.slots?.indexOf(unit.id) ?? index;
    const row = formation[slotIndex] || 'back';
    const slot = byRow[row]?.[slotIndex] || byRow[row]?.[index] || byAsset[unit.assetKey] || defaults[index] || defaults[defaults.length - 1];
    return {
      x: slot.x,
      y: slot.y + (profile.shiftBattleY || 0),
    };
  });
},

getEnemyFormationSlots(count, isBossWave) {
  if (isBossWave) {
    return [{ x: 30, y: 30 }];
  }
  // FF2 스타일: 왼쪽 세로 일렬
  // 전체 y +12 올림
  const patterns = {
    2: [
      { x: 22, y: 40 },
      { x: 38, y: 28 },
    ],
    3: [
      { x: 22, y: 40 },
      { x: 38, y: 30 },
      { x: 22, y: 20 },
    ],
    4: [
      { x: 22, y: 40 },
      { x: 38, y: 34 },
      { x: 22, y: 26 },
      { x: 38, y: 19 },
    ],
    5: [
      { x: 22, y: 40 },
      { x: 38, y: 35 },
      { x: 22, y: 29 },
      { x: 38, y: 23 },
      { x: 22, y: 16 },
    ],
    6: [
      { x: 22, y: 40 },
      { x: 38, y: 35 },
      { x: 22, y: 30 },
      { x: 38, y: 25 },
      { x: 22, y: 19 },
      { x: 38, y: 14 },
    ],
  };
  return patterns[count] || patterns[3];
},

spawnEncounter() {
  const home = this.state.home;
  const ground = resolveGround(home.groundId);
  const isBossWave = home.wave % 5 === 0;
  const enemyScale = Math.max(0.5, Number(ground.enemyScale) || 1);
  const count = isBossWave ? 1 : home.wave % 6 === 0 ? 6 : home.wave % 5 === 0 ? 5 : home.wave % 4 === 0 ? 4 : home.wave % 3 === 0 ? 3 : 2;
  const pool = isBossWave ? ground.boss : ground.normal;
  const slots = this.getEnemyFormationSlots(count, isBossWave);
  this.enemies = Array.from({ length: count }, (_, index) => {
    const monsterId = pool[(this.seed + home.wave * 3 + index * 7) % pool.length];
    const slot = slots[index] || slots[slots.length - 1];
    const maxHp = Math.round((isBossWave ? 8000 + home.wave * 200 : 400 + index * 100 + home.wave * 30) * enemyScale);
    const baseDefense = Math.round((isBossWave ? 92 + home.wave * 5 : 28 + home.wave * 2 + index * 6) * enemyScale);
    const isMagical = (Number(monsterId.slice(-1)) + home.wave + index) % 3 === 0;
    return {
      id: `${home.wave}-${index}-${monsterId}`,
      team: 'enemy',
      monsterId,
      isBoss: isBossWave,
      hp: maxHp,
      maxHp,
      element: this.getEnemyElement(monsterId, index, home.wave, isBossWave),
      def: Math.round(baseDefense * (isBossWave ? 1.08 : 1)),
      spr: Math.round(baseDefense * (isMagical ? 1.16 : 0.92)),
      attackType: isMagical ? 'magical' : 'physical',
      state: 'idle',
      prevSpriteState: null,
      x: slot.x,
      y: slot.y,
      homeX: slot.x,
      homeY: slot.y,
      motion: null,
      turnIndex: index,
      effects: { break: 0, expose: 0 },
    };
  });
  this.seed += 1;
  this.actorOrderIndex = 0;
  this.activeActorId = null;
  this.activateOpeningTactics();
},

loop(now) {
  if (this.destroyed) return;
  this.updateMotion(now, [...this.allies, ...this.enemies]);
  this.updateFloaters(now);
  this.frame = requestAnimationFrame((time) => this.loop(time));
},

updateMotion(now, actors) {
  actors.forEach((actor) => {
    if (!actor.motion) return;
    const { fromX, fromY, toX, toY, startAt, duration, resolve, stateOnEnd } = actor.motion;
    const t = clamp((now - startAt) / duration, 0, 1);
    actor.x = lerp(fromX, toX, t);
    actor.y = lerp(fromY, toY, t);
    this.syncCombatant(actor);
    if (t >= 1) {
      actor.motion = null;
      actor.x = toX;
      actor.y = toY;
      if (stateOnEnd) actor.state = stateOnEnd;
      this.syncCombatant(actor);
      resolve?.();
    }
  });
},

moveActor(actor, toX, toY, duration, stateWhileMoving, stateOnEnd = null) {
  actor.state = stateWhileMoving;
  this.syncCombatant(actor);
  return new Promise((resolve) => {
    actor.motion = {
      fromX: actor.x,
      fromY: actor.y,
      toX,
      toY,
      duration: Math.max(1, duration * 0.5),
      startAt: performance.now(),
      resolve,
      stateOnEnd,
    };
  });
},

pickClosestTarget(actor, targets) {
  let alive = [...targets];
  if (actor.team === 'enemy') {
    const taunting = alive.filter((target) => target.effects?.taunt > 0);
    if (taunting.length) alive = taunting;
  }
  const preference = actor.team === 'ally'
    ? (target) => target.homeX
    : (target) => 100 - target.homeX;

  return alive.sort((a, b) => {
    const laneA = Math.abs((a.homeY ?? a.y) - actor.homeY);
    const laneB = Math.abs((b.homeY ?? b.y) - actor.homeY);
    if (laneA !== laneB) return laneA - laneB;
    const depthA = preference(a);
    const depthB = preference(b);
    if (depthA !== depthB) return depthA - depthB;
    return (a.homeY ?? a.y) - (b.homeY ?? b.y);
  })[0] || null;
},

pickAllyTarget(actor, targets) {
  const alive = [...targets];
  if (!alive.length) return null;
  const baseTarget = this.pickClosestTarget(actor, alive);
  const limitReady = actor.actionCount >= this.getLimitThreshold(actor);
  const scoreTarget = (target) => {
    const hpRate = target.maxHp > 0 ? target.hp / target.maxHp : 1;
    const lanePenalty = Math.abs((target.homeY ?? target.y) - actor.homeY) * 1.8;
    let score = 100 - lanePenalty;
    if (target === baseTarget) score += 10;
    if (target.isBoss) score += limitReady ? 180 : 50;
    if (hpRate <= 0.28) score += 80;
    if (hpRate <= 0.12) score += 60;
    if (this.hasJobRole(actor, '\uB514\uBC84\uD37C')) {
      score += target.isBoss ? 130 : 0;
      score += (target.effects?.break || 0) <= 0 ? 55 : -25;
      score += Math.min(70, (target.maxHp || 0) / 420);
    } else if (this.hasJobRole(actor, '\uBB3C\uB9AC \uB51C\uB7EC') || this.hasJobRole(actor, '\uB9C8\uBC95 \uB51C\uB7EC')) {
      score += hpRate <= 0.35 ? 70 : 0;
      score += target.isBoss ? 35 : 0;
    } else if (this.hasJobRole(actor, '\uD0F1\uCEE4')) {
      score += target === baseTarget ? 45 : 0;
    }
    return score;
  };
  return alive.sort((a, b) => scoreTarget(b) - scoreTarget(a))[0] || baseTarget;
},

shouldUseAllyLimit(actor, target) {
  if (!target || actor.actionCount < this.getLimitThreshold(actor)) return false;
  if (target.isBoss) return true;
  if (this.hasJobRole(actor, '\uD790\uB7EC')) {
    const low = this.getLowestHpAlly();
    if (low && low.hp / low.maxHp <= 0.45) return true;
  }
  if (this.hasJobRole(actor, '\uD0F1\uCEE4')) {
    const low = this.getLowestHpAlly();
    if (low && low.id !== actor.id && low.hp / low.maxHp <= 0.38) return true;
  }
  return false;
},

getAllyContact(actor, target, isLimitTurn = false) {
  const profile = actor.renderProfile || {};
  const moveType = profile.moveType || 'melee';
  const depthMap = {
    hover: target.x + (isLimitTurn ? 16 : 18),
    ranged: target.x + (isLimitTurn ? 12 : 15),
    support: target.x + (isLimitTurn ? 13 : 16),
    skirmish: target.x + (isLimitTurn ? 7 : 10),
    melee: target.x + (isLimitTurn ? 4 : 7),
    'melee-heavy': target.x + (isLimitTurn ? 2 : 4),
  };
  const yMap = {
    hover: lerp(actor.homeY, target.homeY, 0.24) + 1.0,
    ranged: lerp(actor.homeY, target.homeY, 0.18) + 0.6,
    support: lerp(actor.homeY, target.homeY, 0.16) + 0.2,
    skirmish: lerp(actor.homeY, target.homeY, 0.36),
    melee: lerp(actor.homeY, target.homeY, 0.52),
    'melee-heavy': lerp(actor.homeY, target.homeY, 0.64) - 0.6,
  };
  const laneBias = actor.lane === 0 ? 1.2 : actor.lane === 1 ? 0.5 : actor.lane === 2 ? -0.2 : -1.0;
  return {
    x: clamp(depthMap[moveType] ?? target.x + 12, 20, 52),
    y: clamp((yMap[moveType] ?? actor.homeY) + laneBias, 2, 38),
  };
},

getEnemyContact(actor, target) {
  const laneBlend = actor.isBoss ? 0.6 : 0.48;
  const laneTarget = lerp(actor.homeY, target.homeY, laneBlend);
  return {
    x: clamp(target.x - (actor.isBoss ? 6 : 7), 6, 46),
    y: clamp(laneTarget - (actor.isBoss ? 0.4 : 0), 3, 38),
  };
},

getRecoveryPoint(actor, contact) {
  if (actor.team === 'ally') {
    const moveType = actor.renderProfile?.moveType || 'melee';
    const recoilMap = {
      hover: 5,
      ranged: 4,
      support: 4,
      skirmish: 5,
      melee: 6,
      'melee-heavy': 7,
    };
    const liftMap = {
      hover: 0.6,
      ranged: 0.4,
      support: 0.3,
      skirmish: 0.2,
      melee: -0.1,
      'melee-heavy': -0.2,
    };
    return {
      x: clamp(contact.x + (recoilMap[moveType] ?? 5), 18, 92),
      y: clamp(contact.y + (liftMap[moveType] ?? 0), 3, 44),
    };
  }

  return {
    x: clamp(contact.x - (actor.isBoss ? 3 : 2), 8, 52),
    y: clamp(contact.y + (actor.isBoss ? 0.2 : 0.4), 4, 42),
  };
},

getTurnQueue() {
  const allyQueue = pickAlive(this.allies).sort((a, b) => a.turnIndex - b.turnIndex);
  const enemyQueue = pickAlive(this.enemies).sort((a, b) => a.turnIndex - b.turnIndex);
  return [...allyQueue, ...enemyQueue];
},

async turnLoop() {
  while (!this.destroyed) {
    if (!this.state.home.autoRunning || !this.root) {
      await wait(120);
      continue;
    }

    const actors = this.getTurnQueue();
    if (!actors.length) {
      await wait(120);
      continue;
    }

    const actor = actors[this.actorOrderIndex % actors.length];
    this.actorOrderIndex += 1;

    if (!actor || actor.hp <= 0) {
      await wait(60);
      continue;
    }

    this.setActiveActor(actor);
    if (actor.team === 'ally') {
      await this.runAllyTurn(actor);
    } else {
      await this.runEnemyTurn(actor);
    }
    this.clearActiveActor();

    if (!pickAlive(this.enemies).length) {
      await this.finishWave();
    }

    if (!pickAlive(this.allies).length) {
      // 전멸 — defeat GIF 먼저 보여주고 리셋
      this.allies.forEach((ally) => {
        ally.state = 'defeat';
        this.syncCombatant(ally);
      });
      const defeatDur = Math.max(...this.allies.map(a => a.gifDuration || 0), 500);
      await wait(Math.min(Math.max(defeatDur, 500), 3000));
      this.resetParty();
      await wait(400);
    }
  }
},

async runAllyTurn(actor) {
  const target = this.pickAllyTarget(actor, pickAlive(this.enemies));
  if (!target) return;

  const job = this.getJob(actor);
  const isLimitTurn = this.shouldUseAllyLimit(actor, target);
  const moveType = actor.renderProfile?.moveType || 'melee';
  this.advanceSkillClock(actor);
  this.recordUnitBattleStat(actor, 'turns');
  await wait(100);

  if (isLimitTurn) {
    actor.state = 'attack';
    this.syncCombatant(actor);
    await wait(100);
    actor.limitStartTime = Date.now();
    actor._limitSkipResolve = null;
    actor.limitOverlayActive = true;
    this.syncCombatant(actor);
    // 리미트는 타겟 종류와 무관하게 전투 화면 중앙에서 재생한다.
    this.showLimitCutscene(actor, target);
    actor.state = 'attack';
    this.syncCombatant(actor);
    // 중앙 리미트 GIF는 백그라운드에서 재생, 타격 루프는 동시 진행
  }

  if (!isLimitTurn && this.hasJobRole(actor, '힐러')) {
    const healTarget = this.getLowestHpAlly();
    const healLine = job === '백마도사' ? 0.7 : job === '소환사' ? 0.58 : 0.65;
    if (healTarget && healTarget.hp < healTarget.maxHp * healLine) {
      actor.state = job === '백마도사' || job === '소환사' ? 'casting' : 'attack';
      this.syncCombatant(actor);
      await waitForMedia(actor, 140, 520);
      const healRate = job === '백마도사' ? 0.26 : job === '소환사' ? 0.18 : 0.2;
      this.addFloater({ x: clamp(actor.x + 1, 8, 92), y: clamp(actor.y + 20, 10, 92), value: this.getJobActionLabel(actor, { support: 'heal' }), variant: 'heal' });
      const healed = this.applyHeal(healTarget, Math.round(healTarget.maxHp * healRate), 'heal');
      this.recordUnitBattleStat(actor, 'healing', healed);
      this.recordHealLog({ source: actor, target: healTarget, amount: healed, action: this.getJobActionLabel(actor, { support: 'heal' }) });
      this.maybeShowPassiveCue(actor, { target: healTarget, type: 'heal', chance: 0.65 });
      this.addArenaFlash({ color: 'ally', strength: 'soft', duration: 160 });
      actor.actionCount += 1;
      actor.idleState = 'idle';
      actor.state = actor.idleState;
      this.syncCombatant(actor);
      await wait(70);
      return;
    }
  }

  if (!isLimitTurn && this.hasJobRole(actor, '탱커') && this.canUseSkill(actor, 'stance')) {
    const bossAlive = pickAlive(this.enemies).some((enemy) => enemy.isBoss);
    const needsGuard = (actor.effects?.guard || 0) <= 0 || bossAlive || (actor.hp / actor.maxHp < 0.55 && job === '전사');
    const needsTaunt = ((actor.effects?.taunt || 0) <= 0 || bossAlive) && (job === '성기사' || job === '전사' || job === '몽크' || job === '룬나이트');
    if (needsGuard || needsTaunt) {
      if (needsGuard) this.applyBuff(actor, 'guard', job === '성기사' || job === '룬나이트' ? 3 : 2, 'GUARD');
      if (needsTaunt) this.applyBuff(actor, 'taunt', job === '성기사' ? 3 : 2, '도발');
      this.setSkillCooldown(actor, 'stance', job === '성기사' ? 1 : 2);
    }
  }

  if (!isLimitTurn && this.hasJobRole(actor, '버퍼') && this.canUseSkill(actor, 'buff')) {
    const buffTarget = this.getBuffRefreshTarget(actor);
    if (buffTarget) {
      actor.state = job === '기공사' || job === '도박사' || job === '몽크' ? 'attack' : 'casting';
      this.syncCombatant(actor);
      await waitForMedia(actor, 100, 360);
      this.addFloater({ x: clamp(actor.x + 1, 8, 92), y: clamp(actor.y + 20, 10, 92), value: this.getJobActionLabel(actor, { support: 'buff' }), variant: 'buff' });
      this.applyBuff(buffTarget, 'attackUp', job === '기공사' || job === '학자' ? 4 : 3, 'ATK↑');
      this.applyBuff(buffTarget, 'critUp', job === '도박사' ? 4 : 3, 'CRIT↑');
      this.recordUnitBattleStat(actor, 'buffs', 2);
      this.recordEffectLog({ source: actor, target: buffTarget, action: this.getJobActionLabel(actor, { support: 'buff' }), effect: '공격/치명 강화' });
      this.maybeShowPassiveCue(actor, { target: buffTarget, type: 'buff', chance: 0.65 });
      this.setSkillCooldown(actor, 'buff', job === '백마도사' || job === '소환사' ? 2 : 1);
    }
  }

  const contact = this.getAllyContact(actor, target, isLimitTurn);
  const recovery = this.getRecoveryPoint(actor, contact);
  const approachDuration = moveType === 'hover' ? 290 : moveType === 'ranged' || moveType === 'support' ? 270 : moveType === 'skirmish' ? 310 : 390;
  const recoilDuration = moveType === 'hover' ? 140 : moveType === 'ranged' || moveType === 'support' ? 120 : 150;
  const returnDuration = moveType === 'hover' ? 250 : moveType === 'skirmish' ? 280 : 330;
  if (isLimitTurn) {
    await wait(80);
  } else {
    await this.moveActor(actor, contact.x, contact.y, approachDuration, 'move', 'attack');
  }
  if (isLimitTurn) await wait(40);

  const limitData = isLimitTurn ? getLimitBurstData(actor.unit) : null;
  const limitActionLabel = limitData?.name || this.getJobActionLabel(actor, { isLimit: true });
  const hitCount = isLimitTurn ? Math.max(1, Math.floor(Number(limitData?.hitCount) || 3)) : 1;
  const limitMediaMs = isLimitTurn
    ? Math.min(Math.max(await (actor.mediaDurationPromise || actor.gifDurationPromise || Promise.resolve(actor.mediaDuration || actor.gifDuration || 0)) || 900, 500), 8000)
    : 0;
  const attackMediaMs = !isLimitTurn
    ? Math.min(Math.max(await (actor.mediaDurationPromise || actor.gifDurationPromise || Promise.resolve(actor.mediaDuration || actor.gifDuration || 0)) || 900, 900), 8000)
    : 0;
  const longAttackChain = !isLimitTurn && attackMediaMs >= 1600;
  const limitHitWait = isLimitTurn ? Math.max(90, Math.floor(limitMediaMs / hitCount)) : 0;
  let limitWaitSpent = 0;
  const roleBaseDamage = this.getAllyAttackBaseDamage(actor);
  const totalDamage = isLimitTurn
    ? Math.floor(roleBaseDamage * ((Number(limitData?.damageMultiplier) || 3.05) + Math.random() * 0.22) * (target.isBoss ? (Number(limitData?.bossBonus) || 1) : 1))
    : roleBaseDamage + Math.floor(Math.random() * Math.floor(roleBaseDamage * 0.2));
  const baseSlice = Math.floor(totalDamage / hitCount);

  for (let i = 0; i < hitCount; i += 1) {
    actor.state = 'attack';
    this.syncCombatant(actor);
    const finisher = isLimitTurn && i === hitCount - 1;
    const burstX = clamp(target.x + (target.isBoss ? 8 : 5) + (isLimitTurn ? (i - 1) * 1.4 : 0), 10, 90);
    const burstY = clamp(target.y + (target.isBoss ? 16 : 11) + (isLimitTurn ? (i % 2 === 0 ? 1.2 : -0.8) : 0), 8, 86);
    const critRoll = this.rollCrit(actor, { isLimit: isLimitTurn, finisher, target });
    const elementRoll = this.getElementMatchup(actor, target);
    const dealt = Math.max(1, Math.round(baseSlice * this.computeAttackMultiplier(actor, target, { isLimit: isLimitTurn, finisher }) * critRoll.multiplier));
    if (!isLimitTurn) await waitForMedia(actor, 900, 8000);
    const wasAlive = target.hp > 0;
    target.hp = Math.max(0, target.hp - dealt);
    this.recordUnitBattleStat(actor, 'damage', dealt);
    this.recordDamageLog({ source: actor, target, amount: dealt, action: isLimitTurn ? limitActionLabel : this.getJobActionLabel(actor, { isLimit: false }), crit: critRoll.crit, limit: isLimitTurn });
    if (i === 0) this.maybeShowPassiveCue(actor, { target, x: burstX, y: burstY, type: isLimitTurn ? 'limit' : 'damage', chance: isLimitTurn ? 1 : 0.35 });
    if (wasAlive && target.hp <= 0) this.recordUnitBattleStat(actor, 'kills');

    // 슬래시 스트릭: 리미트는 3회 모두, 일반도 크리·보스타격 시 재생
    const showSlash = isLimitTurn || critRoll.crit || target.isBoss;
    if (showSlash) {
      this.addSlashStreak({
        fromX: contact.x - 2 + (isLimitTurn ? i * 0.8 : 0),
        fromY: contact.y + 7 - (isLimitTurn ? i * 0.4 : 0),
        toX: burstX, toY: burstY, color: 'ally',
        duration: finisher ? 380 : isLimitTurn ? 280 : critRoll.crit ? 260 : 220,
      });
    }

    // 아레나 플래시: 강도 분류 세분화
    const flashStrength = finisher ? 'limit' : isLimitTurn ? 'normal' : critRoll.crit && target.isBoss ? 'normal' : critRoll.crit ? 'soft' : target.isBoss ? 'soft' : null;
    if (flashStrength) {
      this.addArenaFlash({ color: 'ally', strength: flashStrength, duration: finisher ? 280 : isLimitTurn ? 190 : 160 });
    }

    this.flashTarget(target, target.isBoss ? 420 : isLimitTurn ? 340 : critRoll.crit ? 260 : 200);
    this.reactTargetHit(target, { sourceTeam: actor.team, heavy: isLimitTurn || critRoll.crit, boss: Boolean(target.isBoss) });
    const actionLabel = isLimitTurn ? limitActionLabel : this.getJobActionLabel(actor, { isLimit: false });
    const dmgEmoji = isLimitTurn ? '💫 ' : critRoll.crit ? '⚡ ' : '';
    const elementTag = elementRoll.tag ? `${elementRoll.tag} ` : '';
    this.addFloater({
      x: burstX,
      y: clamp(burstY + 2, 10, 88),
      value: `${dmgEmoji}${actionLabel} ${elementTag}${formatNumber(dealt)}`,
      crit: critRoll.crit,
      variant: isLimitTurn ? 'limit-dmg' : elementRoll.variant,
    });

    if (longAttackChain) {
      const secondary = pickAlive(this.enemies).find((enemy) => enemy !== target);
      if (secondary) {
        const chainDamage = Math.max(1, Math.round(dealt * 0.65));
        const secondaryWasAlive = secondary.hp > 0;
        const chainX = clamp(secondary.x + (secondary.isBoss ? 8 : 5), 10, 90);
        const chainY = clamp(secondary.y + (secondary.isBoss ? 16 : 11), 8, 86);
        secondary.hp = Math.max(0, secondary.hp - chainDamage);
        this.recordUnitBattleStat(actor, 'damage', chainDamage);
        this.recordDamageLog({ source: actor, target: secondary, amount: chainDamage, action: '\uc5f0\uacc4 \uacf5\uaca9', crit: critRoll.crit });
        if (secondaryWasAlive && secondary.hp <= 0) this.recordUnitBattleStat(actor, 'kills');
        this.addSlashStreak({
          fromX: contact.x + 2,
          fromY: contact.y + 8,
          toX: chainX,
          toY: chainY,
          color: 'ally',
          duration: critRoll.crit ? 260 : 220,
        });
        this.flashTarget(secondary, secondary.isBoss ? 360 : 240);
        this.reactTargetHit(secondary, { sourceTeam: actor.team, heavy: critRoll.crit, boss: Boolean(secondary.isBoss) });
        this.addFloater({
          x: chainX,
          y: clamp(chainY + 2, 10, 88),
          value: `\uc5f0\uacc4 ${formatNumber(chainDamage)}`,
          crit: critRoll.crit,
          variant: elementRoll.variant,
        });
        this.syncCombatant(secondary);
      }
    }
    // 보스 타격: 수직 진동 추가로 묵직함 표현
    const shakeI = isLimitTurn ? (target.isBoss ? 22 : 14) : critRoll.crit ? (target.isBoss ? 16 : 10) : (target.isBoss ? 12 : 5);
    const shakeD = isLimitTurn ? 360 : critRoll.crit ? 260 : 200;
    this.shakeArena(shakeI, shakeD, target.isBoss);
    this.pulseActor(actor, isLimitTurn ? 1.18 : critRoll.crit ? 1.12 : 1.07, isLimitTurn ? 300 : critRoll.crit ? 220 : 180);
    this.syncCombatant(target);
    if (target.effects?.break) {
      target.effects.break = Math.max(0, target.effects.break - 1);
      this.syncCombatant(target);
    }
    // 크리 연속 콤보 카운터
    if (critRoll.crit) {
      this._comboCount = (this._comboCount || 0) + 1;
      this.addComboHit(burstX, burstY, this._comboCount);
    } else {
      this._comboCount = 0;
    }
    if (isLimitTurn) {
      await wait(limitHitWait);
      limitWaitSpent += limitHitWait;
    } else {
      await wait(0);
    }
    if (target.hp <= 0) {
      this.spawnEnemyDeathParticles(target);
      target.state = 'idle';
      this.syncCombatant(target);
      break;
    }
  }

  if (isLimitTurn && limitData) {
    const liveAllies = pickAlive(this.allies);
    const liveEnemies = pickAlive(this.enemies);
    const splashMultiplier = Math.max(0, Number(limitData.splashMultiplier) || 0);
    if (splashMultiplier > 0) {
      liveEnemies.filter((enemy) => enemy !== target).forEach((enemy) => {
        const splash = Math.max(1, Math.round(roleBaseDamage * splashMultiplier));
        const wasAlive = enemy.hp > 0;
        enemy.hp = Math.max(0, enemy.hp - splash);
        this.recordUnitBattleStat(actor, 'damage', splash);
        this.recordDamageLog({ source: actor, target: enemy, amount: splash, action: `${limitActionLabel} 여파`, limit: true });
        this.addFloater({ x: clamp(enemy.x + 5, 10, 90), y: clamp(enemy.y + 14, 10, 88), value: `${limitActionLabel} ${formatNumber(splash)}`, variant: 'limit-dmg' });
        this.flashTarget(enemy, enemy.isBoss ? 360 : 260);
        this.syncCombatant(enemy);
        if (wasAlive && enemy.hp <= 0) this.recordUnitBattleStat(actor, 'kills');
      });
    }
    if (limitData.breakTurns && target.hp > 0) {
      this.applyBreak(target, Math.max(1, Math.floor(Number(limitData.breakTurns) || 0)), 'LIMIT BREAK');
      this.recordUnitBattleStat(actor, 'debuffs');
      this.recordEffectLog({ source: actor, target, action: limitActionLabel, effect: limitData.logEffect || '리미트 약화' });
    }
    if (limitData.healAll) {
      liveAllies.forEach((ally) => {
        const healed = this.applyHeal(ally, Math.round(ally.maxHp * Number(limitData.healAll)), 'heal');
        this.recordUnitBattleStat(actor, 'healing', healed);
        this.recordHealLog({ source: actor, target: ally, amount: healed, action: limitActionLabel });
      });
    }
    if (limitData.guardAll) {
      liveAllies.forEach((ally) => {
        this.applyBuff(ally, 'guard', Math.max(1, Math.floor(Number(limitData.guardAll) || 0)), 'GUARD');
        this.recordUnitBattleStat(actor, 'buffs');
      });
    }
    if (limitData.attackBuffTurns || limitData.critBuffTurns) {
      liveAllies.forEach((ally) => {
        if (limitData.attackBuffTurns) this.applyBuff(ally, 'attackUp', Math.max(1, Math.floor(Number(limitData.attackBuffTurns) || 0)), 'ATK+');
        if (limitData.critBuffTurns) this.applyBuff(ally, 'critUp', Math.max(1, Math.floor(Number(limitData.critBuffTurns) || 0)), 'CRIT+');
        this.recordUnitBattleStat(actor, 'buffs');
      });
    }
    if (limitData.selfGuardTurns) this.applyBuff(actor, 'guard', Math.max(1, Math.floor(Number(limitData.selfGuardTurns) || 0)), 'GUARD');
    if (limitData.rewardGoldBonus || limitData.rewardGrowthStoneBonus) {
      this.state.home.limitRewardBonus = this.state.home.limitRewardBonus || { gold: 0, growthStone: 0 };
      this.state.home.limitRewardBonus.gold = Math.max(this.state.home.limitRewardBonus.gold || 0, Number(limitData.rewardGoldBonus) || 0);
      this.state.home.limitRewardBonus.growthStone = Math.max(this.state.home.limitRewardBonus.growthStone || 0, Number(limitData.rewardGrowthStoneBonus) || 0);
      this.recordEffectLog({ source: actor, target: actor, action: limitActionLabel, effect: limitData.logEffect || '보상 감각' });
    }
  }
  if (isLimitTurn && limitMediaMs) {
    const remainingLimitMediaMs = Math.max(0, limitMediaMs - limitWaitSpent);
    if (remainingLimitMediaMs > 0) await wait(remainingLimitMediaMs);
    actor.state = 'idle';
    this.syncCombatant(actor);
  }

  if (this.hasJobRole(actor, '디버퍼') && (isLimitTurn || (this.canUseSkill(actor, 'debuff') && ((target.effects?.break || 0) <= 0 || target.isBoss)))) {
    const exposeTurns = job === '학자' || job === '청마도사' || job === '소환사' ? 3 : 2;
    this.addFloater({ x: clamp(target.x + 1, 8, 92), y: clamp(target.y + 20, 10, 92), value: this.getJobActionLabel(actor, { support: 'debuff' }), variant: 'debuff' });
    this.applyBreak(target, isLimitTurn ? 3 : exposeTurns, isLimitTurn || job === '도적' || job === '닌자' ? 'EXPOSE' : 'BREAK');
    this.recordUnitBattleStat(actor, 'debuffs');
    this.recordEffectLog({ source: actor, target, action: this.getJobActionLabel(actor, { support: 'debuff' }), effect: isLimitTurn ? '강화 약화' : '방어 약화' });
    if (!isLimitTurn) this.setSkillCooldown(actor, 'debuff', job === '흑마도사' || job === '소환사' ? 2 : 1);
  }
  if (this.hasJobRole(actor, '탱커') && isLimitTurn) {
    this.applyBuff(actor, 'guard', job === '성기사' ? 4 : 3, 'GUARD');
    this.applyBuff(actor, 'taunt', job === '성기사' ? 4 : 3, '도발');
  }
  if (isLimitTurn && this.hasJobRole(actor, '힐러')) {
    const rate = job === '백마도사' ? 0.18 : 0.12;
    pickAlive(this.allies).forEach((ally) => {
      const healed = this.applyHeal(ally, Math.round(ally.maxHp * rate), 'heal');
      this.recordUnitBattleStat(actor, 'healing', healed);
      this.recordHealLog({ source: actor, target: ally, amount: healed, action: this.getJobActionLabel(actor, { support: 'heal' }) });
    });
  }
  if (isLimitTurn && this.hasJobRole(actor, '버퍼')) {
    pickAlive(this.allies).forEach((ally) => {
      this.applyBuff(ally, 'attackUp', 2, 'ATK↑');
      this.applyBuff(ally, 'critUp', 2, 'CRIT↑');
      this.recordUnitBattleStat(actor, 'buffs', 2);
      this.recordEffectLog({ source: actor, target: ally, action: this.getJobActionLabel(actor, { support: 'buff' }), effect: '공격/치명 강화' });
    });
  }
  if (isLimitTurn) {
    const limitMs = await actor.limitDurationPromise;
    const elapsed = Date.now() - (actor.limitStartTime || Date.now());
    const remaining = Math.max(0, limitMs - elapsed);
    if (remaining > 0) await wait(remaining);
    this.hideLimitCutscene();
    actor.limitOverlayActive = false;
    this.syncCombatant(actor);
    await wait(80);
  } else {
    await wait(35);
  }
  if (Math.abs(recovery.x - actor.homeX) > 3 || Math.abs(recovery.y - actor.homeY) > 0.5) {
    await this.moveActor(actor, recovery.x, recovery.y, recoilDuration, 'move', 'move');
    await wait(20);
  }
  await this.moveActor(actor, actor.homeX, actor.homeY, returnDuration, 'move', 'idle');

  if (isLimitTurn) {
    actor.limitOverlayActive = false;
    actor.actionCount = 0;
    actor.idleState = 'idle';
    actor.state = 'idle';
  } else {
    actor.actionCount += 1;
    actor.idleState = 'idle';
    actor.state = actor.idleState;
  }
  this.decayAllyActionEffects(actor);
  this.syncCombatant(actor);
  this.syncDangerState();
  await wait(50);
},

async runEnemyTurn(actor) {
  const target = this.pickClosestTarget(actor, pickAlive(this.allies));
  if (!target) return;

  await wait(actor.isBoss ? 90 : 70);
  const contact = this.getEnemyContact(actor, target);
  const recovery = this.getRecoveryPoint(actor, contact);
  await this.moveActor(actor, contact.x, contact.y, actor.isBoss ? 220 : 170, 'idle', 'attack');
  actor.state = 'attack';
  this.syncCombatant(actor);
  await waitForMedia(actor, actor.isBoss ? 520 : 260, actor.isBoss ? 1000 : 520);

  const baseDamage = 420 + Math.floor(Math.random() * 220);
  const critRoll = this.rollCrit(actor, { target });
  const guardMult = target.effects?.guard ? 0.72 : 1;
  const elementRoll = this.getElementMatchup(actor, target);
  const defenseMult = this.getDefenseMultiplier(actor, target);
  const damage = Math.max(1, Math.round(baseDamage * critRoll.multiplier * guardMult * elementRoll.multiplier * defenseMult));
  const burstX = clamp(target.x + 2, 8, 92);
  const burstY = clamp(target.y + 12, 10, 88);
  target.hp = Math.max(0, target.hp - damage);
  this.recordDamageLog({ source: actor, target, amount: damage, action: actor.isBoss ? '보스 공격' : '공격', crit: critRoll.crit });
  const elementTag = elementRoll.tag ? `${elementRoll.tag} ` : '';

  // 보스 공격: 슬래시 2줄 + 수직 진동 + 강한 플래시
  if (actor.isBoss) {
    this.addSlashStreak({ fromX: contact.x, fromY: contact.y + 5, toX: burstX, toY: burstY + 2, color: 'enemy', duration: 360 });
    this.addSlashStreak({ fromX: contact.x + 1, fromY: contact.y + 9, toX: burstX + 2, toY: burstY - 2, color: 'enemy', duration: 300 });
    this.addArenaFlash({ color: 'enemy', strength: 'normal', duration: 260 });
    this.flashTarget(target, 380);
    this.reactTargetHit(target, { sourceTeam: actor.team, heavy: true, boss: false });
    this.addFloater({ x: burstX, y: burstY, value: `💢 ${elementTag}${formatNumber(damage)}`, crit: critRoll.crit, variant: 'enemy-dmg' });
    this.shakeArena(critRoll.crit ? 20 : 16, critRoll.crit ? 380 : 320, true);
    this.pulseActor(actor, critRoll.crit ? 1.16 : 1.12, 300);
  } else {
    if (critRoll.crit) {
      this.addSlashStreak({ fromX: contact.x, fromY: contact.y + 6, toX: burstX, toY: burstY, color: 'enemy', duration: 260 });
    }
    this.addArenaFlash({ color: 'enemy', strength: critRoll.crit ? 'normal' : 'soft', duration: critRoll.crit ? 190 : 150 });
    this.flashTarget(target, critRoll.crit ? 240 : 180);
    this.reactTargetHit(target, { sourceTeam: actor.team, heavy: critRoll.crit, boss: false });
    const atkEmoji = critRoll.crit ? '💢⚡ ' : '💢 ';
    this.addFloater({ x: burstX, y: burstY, value: `${atkEmoji}${elementTag}${formatNumber(damage)}`, crit: critRoll.crit, variant: 'enemy-dmg' });
    this.shakeArena(critRoll.crit ? 9 : 5, critRoll.crit ? 200 : 150);
    this.pulseActor(actor, critRoll.crit ? 1.1 : 1.04, critRoll.crit ? 200 : 150);
  }
  this.syncCombatant(target);
  await wait(0);

  if (Math.abs(recovery.x - actor.homeX) > 2 || Math.abs(recovery.y - actor.homeY) > 0.4) {
    await this.moveActor(actor, recovery.x, recovery.y, actor.isBoss ? 80 : 60, 'idle', 'idle');
    await wait(20);
  }
  await this.moveActor(actor, actor.homeX, actor.homeY, actor.isBoss ? 190 : 150, 'idle', 'idle');
  actor.state = 'idle';
  this.syncCombatant(actor);
  this.decayEnemyTurnEffects();
  this.syncDangerState();
  await wait(55);
},

async finishWave() {
  const clearedWave = this.state.home.wave;
  const groundId = this.state.home.groundId || 'meadow';
  const ground = resolveGround(groundId);
  const clearedBossWave = clearedWave % 5 === 0;
  const repeatBoss = ground.repeatBoss || { gold: 0, gems: 150 };
  const firstClear = ground.firstClear || { gold: 0, gems: 0 };
  const baseGold = 240 + Math.floor(Math.random() * 180);
  const passiveRewards = getPartyCommonPassiveSummary(this.state);
  let goldReward = Math.round(baseGold * (Number(ground.rewardGold) || 1)) + (clearedBossWave ? Math.floor(Number(repeatBoss.gold) || 0) : 0);
  const gemReward = clearedBossWave ? Math.floor(Number(repeatBoss.gems) || 150) : 0;
  let growthStoneReward = Math.max(6, Math.round((18 + clearedWave * 1.4) * (Number(ground.rewardGold) || 1))) + (clearedBossWave ? 80 : 0);
  goldReward = Math.round(goldReward * (1 + (Number(passiveRewards.rewardGoldBonus) || 0)));
  growthStoneReward = Math.round(growthStoneReward * (1 + (Number(passiveRewards.rewardGrowthStoneBonus) || 0)));
  const stageState = getGroundStageState(this.state, groundId);
  const firstClearReward = clearedBossWave && clearedWave >= stageState.targetWave && !stageState.cleared
    ? { gold: Math.floor(Number(firstClear.gold) || 0), gems: Math.floor(Number(firstClear.gems) || 0), growthStone: Math.max(120, Math.floor((Number(firstClear.gems) || 0) * 0.8)) }
    : null;
  const nextGroundEntry = firstClearReward
    ? Object.entries(GROUND_DATA).find(([, nextGround]) => nextGround.requires === groundId)
    : null;

  // 웨이브 클리어 텍스트
  this.showWaveClear();

  // 생존 아군 victory GIF
  pickAlive(this.allies).forEach((ally) => {
    ally.state = 'victory';
    this.syncCombatant(ally);
  });
  // 가장 긴 victory GIF 재생 완료까지 대기
  const victoryDur = Math.max(...pickAlive(this.allies).map(a => a.gifDuration || 0), 900);
  await wait(Math.min(Math.max(victoryDur, 900), 5000));

  this.state.home.wave += 1;
  if (!this.state.home.stageBestWaves || typeof this.state.home.stageBestWaves !== 'object') this.state.home.stageBestWaves = {};
  if (!this.state.home.stageClears || typeof this.state.home.stageClears !== 'object') this.state.home.stageClears = {};
  this.state.home.stageBestWaves[groundId] = Math.max(this.state.home.wave, Number(this.state.home.stageBestWaves[groundId]) || 0);
  this.state.home.winsToBoss = Math.max(1, 5 - (this.state.home.wave % 5 || 5));
  this.state.resources.gold += goldReward;
  this.state.home.rewardGold = 0;
  this.recordResourceGain('gold', goldReward);
  this.state.resources.growthStone = (Number(this.state.resources.growthStone) || 0) + growthStoneReward;
  this.recordResourceGain('growthStone', growthStoneReward);
  this.recordResourceGain('waves', 1);
  if (gemReward) {
    this.state.resources.gems = (this.state.resources.gems || 0) + gemReward;
    this.recordResourceGain('gems', gemReward);
    this.recordResourceGain('bosses', 1);
  }
  if (firstClearReward) {
    this.state.resources.gold += firstClearReward.gold;
    this.state.resources.gems = (this.state.resources.gems || 0) + firstClearReward.gems;
    this.state.resources.growthStone = (Number(this.state.resources.growthStone) || 0) + firstClearReward.growthStone;
    this.state.home.stageClears[groundId] = true;
    this.recordResourceGain('gold', firstClearReward.gold);
    this.recordResourceGain('gems', firstClearReward.gems);
    this.recordResourceGain('growthStone', firstClearReward.growthStone);
    this.recordResourceGain('firstClears', 1);
    this.addFloater({ x: 50, y: 72, value: 'FIRST CLEAR +' + formatNumber(firstClearReward.gems) + '💎', variant: 'limit-dmg' });
  }

  // 웨이브 리셋 — HP 유지, 턴 카운트만 초기화
  this.allies.forEach((ally) => {
    ally.actionCount = 0;
    ally.skillClock = 0;
    ally.skillCooldowns = {};
    ally.idleState = 'idle';
    ally.state = 'idle';
    this.syncCombatant(ally);
  });
  this.spawnEncounter();
  this.buildCombatantNodes();
  this.syncStaticUI();
  this.syncAll();
  this.onStateChange();
  if (clearedBossWave) {
    const rewards = [
      { label: '골드', icon: 'G ', amount: goldReward },
      { label: '다이아', icon: 'D ', amount: gemReward },
      { label: '성장석', icon: 'S ', amount: growthStoneReward },
    ];
    if (firstClearReward) {
      rewards.push(
        { label: '첫 클리어 골드', icon: 'G ', amount: firstClearReward.gold },
        { label: '첫 클리어 다이아', icon: 'D ', amount: firstClearReward.gems },
        { label: '첫 클리어 성장석', icon: 'S ', amount: firstClearReward.growthStone },
      );
    }
    this.recordBattleLog({
      type: firstClearReward ? 'first-clear' : 'boss',
      title: firstClearReward ? `${ground.label} 클리어` : `W${clearedWave} 보스 격파`,
      message: firstClearReward
        ? `${ground.chapter || 'STAGE'} 목표 달성${nextGroundEntry ? ` · ${nextGroundEntry[1].label} 해금` : ''}`
        : `${ground.label} 반복 보상 획득`,
      rewards,
    });
  }
  if (gemReward) {
    this.showGemReward(gemReward);
  }
  if (this.state.home.limitRewardBonus) this.state.home.limitRewardBonus = { gold: 0, growthStone: 0 };
  // 보스 웨이브 등장 연출
  if (this.state.home.wave % 5 === 0) {
    await wait(180);
    this.showBossEntrance();
  }
  await wait(420);
},

resetParty() {
  // 전멸 — 잠깐 defeat GIF 보여준 뒤 HP 회복
  this.allies.forEach((ally) => {
    ally.state = 'defeat';
    this.syncCombatant(ally);
  });
  // defeat 연출은 turnLoop의 wait(400) 안에서 보임
  // 바로 HP/좌표 리셋 (defeat GIF는 syncCombatant가 is-hidden 처리하므로 hp>0 후 idle로)
  this.allies.forEach((ally) => {
    ally.hp = ally.maxHp;
    ally.x = ally.homeX;
    ally.y = ally.homeY;
    ally.actionCount = 0;
    ally.skillClock = 0;
    ally.skillCooldowns = {};
    ally.idleState = 'idle';
    ally.state = 'idle';
    ally.effects = { guard: 0, taunt: 0, attackUp: 0, critUp: 0 };
    this.syncCombatant(ally);
  });
},

claimRewards() {
  if (this.state.home.rewardGold <= 0) return;
  this.state.resources.gold += this.state.home.rewardGold;
  this.state.home.rewardGold = 0;
  this.onStateChange();
  this.syncStaticUI();
},

getSummary() {
  const first = this.allies[0];
  const synergy = first ? 18 : 0;
  return {
    waveHint: `다음 보스 웨이브까지 ${this.state.home.winsToBoss}승`,
    synergyHint: `시너지 보너스 +${synergy}%`,
  };
}
  });
}
