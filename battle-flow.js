import {
  UNIT_RENDER_PROFILES,
  getPartyUnits,
  formatNumber,
  resolveGround,
  resolveUnitSprite,
} from './assets.js';
import { clamp, lerp, wait, pickAlive, waitForGif, getBattleSpeed } from './battle-shared.js';

export function attachBattleFlow(HomeBattleCore) {
  Object.assign(HomeBattleCore.prototype, {
ensureCombatants() {
  const party = getPartyUnits(this.state);
  const formation = this.getAllyFormationSlots(party);
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
    lane: index,
    turnIndex: index,
    element: this.normalizeElement(unit.element),
    renderProfile: UNIT_RENDER_PROFILES[unit.assetKey] || { scale: 1, shiftY: 0, size: 108, contact: 10 },
    effects: { guard: 0, taunt: 0, attackUp: 0, critUp: 0 },
  }));
  this.spawnEncounter();
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

  const byFormation = {
    back:        defaults[0],
    'mid-back':  defaults[1],
    mid:         defaults[2],
    'mid-front': defaults[2],
    front:       defaults[3],
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

  return party.map((unit, index) => {
    const profile = UNIT_RENDER_PROFILES[unit.assetKey] || {};
    const slot = byAsset[unit.assetKey] || byFormation[profile.formation] || defaults[index] || defaults[defaults.length - 1];
    return { x: slot.x, y: slot.y };
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
  const count = isBossWave ? 1 : home.wave % 6 === 0 ? 6 : home.wave % 5 === 0 ? 5 : home.wave % 4 === 0 ? 4 : home.wave % 3 === 0 ? 3 : 2;
  const pool = isBossWave ? ground.boss : ground.normal;
  const slots = this.getEnemyFormationSlots(count, isBossWave);
  this.enemies = Array.from({ length: count }, (_, index) => {
    const monsterId = pool[(this.seed + home.wave * 3 + index * 7) % pool.length];
    const slot = slots[index] || slots[slots.length - 1];
    const maxHp = isBossWave ? 8000 + home.wave * 200 : 400 + index * 100 + home.wave * 30;
    const baseDefense = isBossWave ? 92 + home.wave * 5 : 28 + home.wave * 2 + index * 6;
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
      duration: duration / getBattleSpeed(),
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

getAllyContact(actor, target, isLimitTurn = false) {
  const profile = actor.renderProfile || {};
  const moveType = profile.moveType || 'melee';
  const depthMap = {
    hover: target.x + (isLimitTurn ? 16 : 18),
    ranged: target.x + (isLimitTurn ? 12 : 15),
    support: target.x + (isLimitTurn ? 13 : 16),
    skirmish: target.x + (isLimitTurn ? 5 : 8),
    melee: target.x + (isLimitTurn ? 2 : 4),
    'melee-heavy': target.x + (isLimitTurn ? 0 : 1),
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
  const target = this.pickClosestTarget(actor, pickAlive(this.enemies));
  if (!target) return;

  const role = this.getRole(actor);
  const isLimitTurn = actor.actionCount >= 3;
  const moveType = actor.renderProfile?.moveType || 'melee';
  await wait(100);

  if (isLimitTurn) {
    actor.state = 'casting';
    this.syncCombatant(actor);
    await wait(200);
    actor.state = 'limit';
    this.syncCombatant(actor);
    actor.limitStartTime = Date.now();
    actor._limitSkipResolve = null;
    // 컷씬 표시 여부: 연출 ON이면 항상, OFF여도 보스 막타면 강제 재생
    const isBossWave = this.state.home.wave % 5 === 0;
    const showCutscene = (this._cutsceneOn) || (isLimitTurn && isBossWave && target.isBoss);
    if (showCutscene) {
      this.showLimitCutscene(actor);
    } else {
      // 연출 OFF — victory.gif 시작만 하고 바로 limit으로 전환
      actor.state = 'victory';
      this.syncCombatant(actor);
      await wait(80);
      actor.state = 'limit';
      this.syncCombatant(actor);
    }
    // 컷씬은 백그라운드에서 재생 — 타격 루프와 동시 진행
  }

  if (!isLimitTurn && role === '힐러') {
    const healTarget = this.getLowestHpAlly();
    if (healTarget && healTarget.hp < healTarget.maxHp * 0.92) {
      actor.state = 'casting';
      this.syncCombatant(actor);
      await waitForGif(actor, 300, 1200);
      this.applyHeal(healTarget, Math.round(healTarget.maxHp * 0.16), 'heal');
      this.addArenaFlash({ color: 'ally', strength: 'soft', duration: 160 });
      actor.actionCount += 1;
      actor.idleState = actor.actionCount >= 3 ? 'casting' : 'idle';
      actor.state = actor.idleState;
      this.syncCombatant(actor);
        await wait(120);
      return;
    }
  }

  if (!isLimitTurn && role === '버퍼') {
    const buffTarget = this.getPreferredBuffTarget(actor);
    actor.state = 'casting';
    this.syncCombatant(actor);
    await waitForGif(actor, 300, 1200);
    this.applyBuff(buffTarget, 'attackUp', 1, 'ATK↑');
    this.applyBuff(buffTarget, 'critUp', 1, 'CRIT↑');
    actor.actionCount += 1;
    actor.idleState = actor.actionCount >= 3 ? 'casting' : 'idle';
    actor.state = actor.idleState;
    this.syncCombatant(actor);
    await wait(120);
    return;
  }

  const contact = this.getAllyContact(actor, target, isLimitTurn);
  const recovery = this.getRecoveryPoint(actor, contact);
  const approachDuration = moveType === 'hover' ? 290 : moveType === 'ranged' || moveType === 'support' ? 270 : moveType === 'skirmish' ? 310 : 390;
  const recoilDuration = moveType === 'hover' ? 140 : moveType === 'ranged' || moveType === 'support' ? 120 : 150;
  const returnDuration = moveType === 'hover' ? 250 : moveType === 'skirmish' ? 280 : 330;
  await this.moveActor(actor, contact.x, contact.y, approachDuration, 'move', isLimitTurn ? 'limit' : 'attack');
  await wait(isLimitTurn ? 60 : 80);

  const hitCount = isLimitTurn ? 3 : 1;
  const power = actor.unit?.power || 8000;
  const roleMult = role === '물리 딜러' ? 0.18 : role === '마법 딜러' ? 0.17 : role === '디버퍼' ? 0.14 : role === '탱커' ? 0.13 : role === '힐러' ? 0.12 : role === '버퍼' ? 0.13 : 0.15;
  const roleBaseDamage = Math.floor(power * roleMult);
  const totalDamage = isLimitTurn
    ? Math.floor(power * (0.55 + Math.random() * 0.15))
    : roleBaseDamage + Math.floor(Math.random() * Math.floor(roleBaseDamage * 0.2));
  const baseSlice = Math.floor(totalDamage / hitCount);

  for (let i = 0; i < hitCount; i += 1) {
    actor.state = isLimitTurn ? 'limit' : 'attack';
    this.syncCombatant(actor);
    const finisher = isLimitTurn && i === hitCount - 1;
    const burstX = clamp(target.x + (target.isBoss ? 8 : 5) + (isLimitTurn ? (i - 1) * 1.4 : 0), 10, 90);
    const burstY = clamp(target.y + (target.isBoss ? 16 : 11) + (isLimitTurn ? (i % 2 === 0 ? 1.2 : -0.8) : 0), 8, 86);
    const critRoll = this.rollCrit(actor, { isLimit: isLimitTurn, finisher, target });
    const elementRoll = this.getElementMatchup(actor, target);
    const dealt = Math.max(1, Math.round(baseSlice * this.computeAttackMultiplier(actor, target, { isLimit: isLimitTurn, finisher }) * critRoll.multiplier));
    target.hp = Math.max(0, target.hp - dealt);

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
    const dmgEmoji = isLimitTurn ? '💫 ' : critRoll.crit ? '⚡ ' : '';
    const elementTag = elementRoll.tag ? `${elementRoll.tag} ` : '';
    this.addFloater({
      x: burstX,
      y: clamp(burstY + 2, 10, 88),
      value: `${dmgEmoji}${elementTag}${formatNumber(dealt)}`,
      crit: critRoll.crit,
      variant: isLimitTurn ? 'limit-dmg' : elementRoll.variant,
    });
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
    if (isLimitTurn && !this._cutsceneOn) {
      await wait(finisher ? 220 : 140);
    } else {
      await waitForGif(actor, isLimitTurn ? (finisher ? 500 : 300) : 200, isLimitTurn ? 8000 : 3000);
    }
    if (target.hp <= 0) {
      this.spawnEnemyDeathParticles(target);
      target.state = 'idle';
      this.syncCombatant(target);
      break;
    }
  }

  if (role === '디버퍼') {
    this.applyBreak(target, isLimitTurn ? 3 : 2, isLimitTurn ? 'EXPOSE' : 'BREAK');
  }
  if (role === '탱커') {
    this.applyBuff(actor, 'guard', isLimitTurn ? 3 : 2, 'GUARD');
    this.applyBuff(actor, 'taunt', isLimitTurn ? 3 : 2, 'DRAW');
  }
  if (isLimitTurn && role === '힐러') {
    pickAlive(this.allies).forEach((ally) => this.applyHeal(ally, Math.round(ally.maxHp * 0.12), 'heal'));
  }
  if (isLimitTurn && role === '버퍼') {
    pickAlive(this.allies).forEach((ally) => {
      this.applyBuff(ally, 'attackUp', 1, 'ATK↑');
      this.applyBuff(ally, 'critUp', 1, 'CRIT↑');
    });
  }

  if (isLimitTurn) {
    const isBossWave = this.state.home.wave % 5 === 0;
    const showCutscene = (this._cutsceneOn) || (isBossWave && target.isBoss);
    if (showCutscene) {
      // 스킵 가능 Promise: 탭 스킵 또는 재생 완료 중 먼저 오는 것
      const limitMs = await actor.limitDurationPromise;
      const elapsed = Date.now() - (actor.limitStartTime || Date.now());
      const remaining = Math.max(0, (limitMs / 1.5) - elapsed);
      await new Promise(r => {
        actor._limitSkipResolve = r;
        if (remaining > 0) setTimeout(r, remaining);
        else r();
      });
      this.hideLimitCutscene();
      await wait(150);
    } else {
      await wait(70);
    }
  } else {
    await wait(70);
  }
  if (Math.abs(recovery.x - actor.homeX) > 3 || Math.abs(recovery.y - actor.homeY) > 0.5) {
    await this.moveActor(actor, recovery.x, recovery.y, recoilDuration, 'move', 'move');
    await wait(40);
  }
  await this.moveActor(actor, actor.homeX, actor.homeY, returnDuration, 'move', 'idle');

  if (isLimitTurn) {
    actor.actionCount = 0;
    actor.idleState = 'idle';
    actor.state = 'idle';
  } else {
    actor.actionCount += 1;
    actor.idleState = actor.actionCount >= 3 ? 'casting' : 'idle';
    actor.state = actor.idleState;
  }
  this.decayAllyActionEffects(actor);
  this.syncCombatant(actor);
  this.syncDangerState();
  await wait(100);
},

async runEnemyTurn(actor) {
  const target = this.pickClosestTarget(actor, pickAlive(this.allies));
  if (!target) return;

  await wait(actor.isBoss ? 180 : 140);
  const contact = this.getEnemyContact(actor, target);
  const recovery = this.getRecoveryPoint(actor, contact);
  await this.moveActor(actor, contact.x, contact.y, actor.isBoss ? 440 : 340, 'idle', 'attack');
  await wait(actor.isBoss ? 170 : 120);
  actor.state = 'attack';
  this.syncCombatant(actor);

  const baseDamage = 420 + Math.floor(Math.random() * 220);
  const critRoll = this.rollCrit(actor, { target });
  const guardMult = target.effects?.guard ? 0.72 : 1;
  const elementRoll = this.getElementMatchup(actor, target);
  const defenseMult = this.getDefenseMultiplier(actor, target);
  const damage = Math.max(1, Math.round(baseDamage * critRoll.multiplier * guardMult * elementRoll.multiplier * defenseMult));
  const burstX = clamp(target.x + 2, 8, 92);
  const burstY = clamp(target.y + 12, 10, 88);
  target.hp = Math.max(0, target.hp - damage);
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
  await wait(actor.isBoss ? 340 : 250);

  if (Math.abs(recovery.x - actor.homeX) > 2 || Math.abs(recovery.y - actor.homeY) > 0.4) {
    await this.moveActor(actor, recovery.x, recovery.y, actor.isBoss ? 160 : 120, 'idle', 'idle');
    await wait(40);
  }
  await this.moveActor(actor, actor.homeX, actor.homeY, actor.isBoss ? 380 : 300, 'idle', 'idle');
  actor.state = 'idle';
  this.syncCombatant(actor);
  this.decayEnemyTurnEffects();
  this.syncDangerState();
  await wait(110);
},

async finishWave() {
  const clearedBossWave = this.state.home.wave % 5 === 0;
  const gemReward = clearedBossWave ? 150 : 0;

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
  this.state.home.winsToBoss = Math.max(1, 5 - (this.state.home.wave % 5 || 5));
  this.state.home.rewardGold += 240 + Math.floor(Math.random() * 180);
  if (gemReward) {
    this.state.resources.gems = (this.state.resources.gems || 0) + gemReward;
  }

  // 웨이브 리셋 — HP 유지, 턴 카운트만 초기화
  this.allies.forEach((ally) => {
    ally.actionCount = 0;
    ally.idleState = 'idle';
    ally.state = 'idle';
    this.syncCombatant(ally);
  });
  this.spawnEncounter();
  this.buildCombatantNodes();
  this.syncStaticUI();
  this.syncAll();
  this.onStateChange();
  if (gemReward) {
    this.showGemReward(gemReward);
  }
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
