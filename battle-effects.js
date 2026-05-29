import { formatNumber } from './assets.js';
import { clamp, pickAlive } from './battle-shared.js';

const ELEMENT_ADVANTAGE = { '묵': '찌', '찌': '빠', '빠': '묵' };
const ELEMENT_META = {
  '묵': { icon: '✊', color: '#ff6644' },
  '찌': { icon: '✌️', color: '#44cc66' },
  '빠': { icon: '🖐️', color: '#44aaff' },
};
const ELEMENT_KEYS = Object.keys(ELEMENT_ADVANTAGE);

const JOB_BATTLE_PROFILES = {
  '전사': { attackKind: 'physical', powerMult: 0.084, statMult: 7.1, damageMult: 1.04, critBonus: 0.02 },
  '모험가': { attackKind: 'physical', powerMult: 0.078, statMult: 6.6, damageMult: 0.98, critBonus: 0.03 },
  '성기사': { attackKind: 'physical', powerMult: 0.074, statMult: 6.0, damageMult: 0.9, critBonus: 0.01 },
  '암흑기사': { attackKind: 'physical', powerMult: 0.092, statMult: 7.9, damageMult: 1.18, critBonus: 0.04 },
  '용기사': { attackKind: 'physical', powerMult: 0.088, statMult: 7.6, damageMult: 1.12, critBonus: 0.06 },
  '몽크': { attackKind: 'physical', powerMult: 0.08, statMult: 7.3, damageMult: 1.0, critBonus: 0.05 },
  '무사': { attackKind: 'physical', powerMult: 0.09, statMult: 7.8, damageMult: 1.14, critBonus: 0.08 },
  '닌자': { attackKind: 'physical', powerMult: 0.082, statMult: 7.0, damageMult: 1.04, critBonus: 0.09 },
  '도적': { attackKind: 'physical', powerMult: 0.074, statMult: 6.5, damageMult: 0.95, critBonus: 0.06 },
  '기공사': { attackKind: 'physical', powerMult: 0.076, statMult: 6.6, damageMult: 0.98, critBonus: 0.03 },
  '도박사': { attackKind: 'physical', powerMult: 0.076, statMult: 6.2, damageMult: 0.96, critBonus: 0.1 },
  '백마도사': { attackKind: 'magical', powerMult: 0.062, statMult: 5.8, damageMult: 0.82, critBonus: 0.01 },
  '흑마도사': { attackKind: 'magical', powerMult: 0.086, statMult: 8.2, damageMult: 1.13, critBonus: 0.03 },
  '청마도사': { attackKind: 'magical', powerMult: 0.082, statMult: 7.5, damageMult: 1.04, critBonus: 0.04 },
  '소환사': { attackKind: 'magical', powerMult: 0.084, statMult: 7.8, damageMult: 1.08, critBonus: 0.03 },
  '마도전사': { attackKind: 'hybrid', powerMult: 0.084, statMult: 7.4, damageMult: 1.08, critBonus: 0.04 },
  '룬나이트': { attackKind: 'hybrid', powerMult: 0.078, statMult: 6.9, damageMult: 0.98, critBonus: 0.03 },
  '학자': { attackKind: 'magical', powerMult: 0.07, statMult: 6.4, damageMult: 0.9, critBonus: 0.02 },
  '양파검사': { attackKind: 'hybrid', powerMult: 0.086, statMult: 7.6, damageMult: 1.1, critBonus: 0.05 },
};

const DEFAULT_JOB_PROFILE = { attackKind: 'physical', powerMult: 0.074, statMult: 6.4, damageMult: 1, critBonus: 0.02 };

const JOB_ACTION_LABELS = {
  '전사': '돌파',
  '모험가': '임기응변',
  '성기사': '성역',
  '암흑기사': '심연',
  '용기사': '점프 어택',
  '몽크': '기합',
  '무사': '일섬',
  '닌자': '그림자 베기',
  '도적': '기습',
  '기공사': '합기',
  '도박사': '승부수',
  '백마도사': '기도',
  '흑마도사': '마법 폭발',
  '청마도사': '청마법',
  '소환사': '소환',
  '마도전사': '마도검',
  '룬나이트': '룬가드',
  '학자': '전술 분석',
  '양파검사': '만능전술',
};

export function attachBattleEffects(HomeBattleCore) {
  Object.assign(HomeBattleCore.prototype, {
getRole(actor) {
  return actor?.unit?.battleRole || actor?.unit?.role || '';
},

getJob(actor) {
  return actor?.unit?.job || this.getRole(actor) || '';
},

getJobRoles(actor) {
  const roles = actor?.unit?.jobRoles;
  if (Array.isArray(roles) && roles.length) return roles;
  return [this.getRole(actor)].filter(Boolean);
},

hasJobRole(actor, role) {
  return this.getJobRoles(actor).includes(role);
},

getJobProfile(actor) {
  return JOB_BATTLE_PROFILES[this.getJob(actor)] || DEFAULT_JOB_PROFILE;
},

getJobActionLabel(actor, { isLimit = false, support = '' } = {}) {
  const job = this.getJob(actor);
  if (support === 'heal') return job === '소환사' ? '소환 치유' : JOB_ACTION_LABELS[job] || '회복';
  if (support === 'buff') return job === '기공사' ? '합기' : job === '도박사' ? '승부수' : JOB_ACTION_LABELS[job] || '지원';
  if (support === 'debuff') return job === '도적' ? '기습' : job === '닌자' ? '그림자 베기' : JOB_ACTION_LABELS[job] || '약화';
  if (!isLimit) return JOB_ACTION_LABELS[job] || '공격';
  return {
    '무사': '필살 일섬',
    '마도전사': '마도검 해방',
    '소환사': '대소환',
    '성기사': '성역 개방',
    '용기사': '천공 점프',
    '암흑기사': '심연 해방',
    '기공사': '합기 난무',
  }[job] || `${JOB_ACTION_LABELS[job] || '리미트'} LIMIT`;
},

getLimitThreshold(actor) {
  return ['무사', '마도전사', '소환사', '성기사'].includes(this.getJob(actor)) ? 2 : 3;
},

normalizeElement(element) {
  const map = {
    '화': '묵',
    '목': '찌',
    '수': '빠',
    '화속': '묵',
    '천속': '찌',
    '지속': '빠',
  };
  return map[element] || (ELEMENT_ADVANTAGE[element] ? element : null);
},

getEnemyElement(monsterId, index = 0, wave = 1, isBoss = false) {
  const idScore = String(monsterId || '')
    .split('')
    .reduce((sum, ch) => sum + (Number(ch) || ch.charCodeAt(0)), 0);
  const offset = isBoss ? 1 : 0;
  return ELEMENT_KEYS[(idScore + index + wave + offset) % ELEMENT_KEYS.length];
},

getElementMatchup(attacker, target) {
  const attackerElement = this.normalizeElement(attacker?.unit?.element || attacker?.element);
  const targetElement = this.normalizeElement(target?.unit?.element || target?.element);
  if (!attackerElement || !targetElement) {
    return { multiplier: 1, label: '', tag: '', variant: '', attackerElement, targetElement };
  }

  if (attackerElement === targetElement) {
    return { multiplier: 0.9, label: '상쇄', tag: `${ELEMENT_META[attackerElement]?.icon || ''}상쇄`, variant: 'same-el', attackerElement, targetElement };
  }
  if (ELEMENT_ADVANTAGE[attackerElement] === targetElement) {
    return { multiplier: 1.5, label: '약점', tag: `${ELEMENT_META[attackerElement]?.icon || ''}약점!`, variant: 'weak-el', attackerElement, targetElement };
  }
  if (ELEMENT_ADVANTAGE[targetElement] === attackerElement) {
    return { multiplier: 0.6, label: '내성', tag: `${ELEMENT_META[attackerElement]?.icon || ''}내성`, variant: 'resist-el', attackerElement, targetElement };
  }
  return { multiplier: 1, label: '', tag: '', variant: '', attackerElement, targetElement };
},

getAttackKind(actor) {
  if (actor?.attackType) return actor.attackType;
  const profile = this.getJobProfile(actor);
  if (profile.attackKind !== 'hybrid') return profile.attackKind;
  const unit = actor?.unit || {};
  return (Number(unit.mag) || 0) > (Number(unit.atk) || 0) ? 'magical' : 'physical';
},

getDefenseValue(attacker, target) {
  const kind = this.getAttackKind(attacker);
  const source = target?.unit || target || {};
  const value = kind === 'magical' ? source.spr : source.def;
  return Math.max(0, Number(value) || 0);
},

getDefenseMultiplier(attacker, target) {
  const defense = this.getDefenseValue(attacker, target);
  if (!defense) return 1;

  const scale = target?.team === 'enemy'
    ? target.isBoss ? 540 : 420
    : 360;
  return clamp(scale / (scale + defense), 0.45, 1);
},

getLowestHpAlly() {
  return pickAlive(this.allies).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || null;
},

getPreferredBuffTarget(source) {
  return pickAlive(this.allies)
    .filter((ally) => ally.id !== source.id)
    .sort((a, b) => (b.unit.power || 0) - (a.unit.power || 0))[0] || source;
},

getBuffRefreshTarget(source) {
  const allies = pickAlive(this.allies);
  const candidates = allies.filter((ally) => ally.id !== source.id);
  const needingBuff = candidates
    .filter((ally) => (ally.effects?.attackUp || 0) <= 0 || (ally.effects?.critUp || 0) <= 0)
    .sort((a, b) => (b.unit.power || 0) - (a.unit.power || 0));
  if (needingBuff.length) return needingBuff[0];
  if (allies.length === 1 && ((source.effects?.attackUp || 0) <= 0 || (source.effects?.critUp || 0) <= 0)) return source;
  return null;
},

applyHeal(target, amount, variant = 'heal') {
  if (!target || target.hp <= 0) return 0;
  const healed = Math.max(0, Math.min(target.maxHp - target.hp, amount));
  if (!healed) return 0;
  target.hp += healed;
  this.addFloater({ x: clamp(target.x + 2, 8, 92), y: clamp(target.y + 16, 10, 92), value: `💚 +${formatNumber(healed)}`, variant: 'heal' });
  this.addImpactBurst({ x: clamp(target.x + 3, 8, 92), y: clamp(target.y + 12, 10, 88), size: 'normal', color: 'ally' });
  this.syncCombatant(target);
  return healed;
},

applyBuff(target, kind, turns = 1, label = 'BUFF') {
  if (!target?.effects) return;
  target.effects[kind] = Math.max(target.effects[kind] || 0, turns);
  const icons = { attackUp: '⚔️ ATK↑', critUp: '🎯 CRIT↑', guard: '🛡️ GUARD', taunt: '🔥 도발' };
  const display = icons[kind] || `✨ ${label}`;
  this.addFloater({ x: clamp(target.x + 1, 8, 92), y: clamp(target.y + 16, 10, 92), value: display, variant: 'buff' });
  this.syncCombatant(target);
},

applyBreak(target, turns = 2, label = 'BREAK') {
  if (!target?.effects) return;
  target.effects.break = Math.max(target.effects.break || 0, turns);
  const display = label === 'EXPOSE' ? '💥 EXPOSE' : '🩸 BREAK';
  this.addFloater({ x: clamp(target.x + 1, 8, 92), y: clamp(target.y + 16, 10, 92), value: display, variant: 'debuff' });
  this.syncCombatant(target);
},

decayAllyActionEffects(actor) {
  if (!actor?.effects) return;
  actor.effects.attackUp = Math.max(0, (actor.effects.attackUp || 0) - 1);
  actor.effects.critUp = Math.max(0, (actor.effects.critUp || 0) - 1);
  this.syncCombatant(actor);
},

decayEnemyTurnEffects() {
  this.allies.forEach((ally) => {
    if (!ally.effects) return;
    ally.effects.guard = Math.max(0, (ally.effects.guard || 0) - 1);
    ally.effects.taunt = Math.max(0, (ally.effects.taunt || 0) - 1);
    this.syncCombatant(ally);
  });
},

getOffenseStat(actor) {
  const unit = actor?.unit || {};
  const kind = this.getAttackKind(actor);
  if (this.getJob(actor) === '마도전사') {
    return Math.max(0, (Number(unit.atk) || 0) + (Number(unit.mag) || 0));
  }
  if (this.getJobProfile(actor).attackKind === 'hybrid') {
    return Math.max(0, Math.round(((Number(unit.atk) || 0) + (Number(unit.mag) || 0)) / 2));
  }
  return Math.max(0, Number(kind === 'magical' ? unit.mag : unit.atk) || 0);
},

getAllyAttackBaseDamage(actor) {
  const profile = this.getJobProfile(actor);
  const power = Math.max(0, Number(actor?.unit?.power) || 0);
  const offense = this.getOffenseStat(actor);
  return Math.max(1, Math.floor(power * profile.powerMult + offense * profile.statMult));
},

computeAttackMultiplier(actor, target, { isLimit = false, finisher = false } = {}) {
  let mult = 1;
  const job = this.getJob(actor);
  mult *= this.getJobProfile(actor).damageMult;
  if (job === '용기사' && isLimit) mult *= 1.1;
  if (job === '무사' && finisher) mult *= 1.18;
  if (job === '암흑기사' && target?.hp / target?.maxHp <= 0.5) mult *= 1.12;
  if (job === '닌자' && target?.effects?.break) mult *= 1.1;
  if (job === '도박사') mult *= Math.random() < 0.33 ? 1.24 : 0.94;
  if (job === '양파검사' && actor.actionCount >= 2) mult *= 1.08;
  if (actor.effects?.attackUp) mult *= 1.24;
  if (target?.effects?.break) mult *= 1.22;
  mult *= this.getElementMatchup(actor, target).multiplier;
  mult *= this.getDefenseMultiplier(actor, target);
  if (isLimit) mult *= finisher ? 1.18 : 1.05;
  return mult;
},

getCritBonus(actor, target) {
  let bonus = 0;
  bonus += this.getJobProfile(actor).critBonus || 0;
  const job = this.getJob(actor);
  if (job === '도적' && target?.effects?.break) bonus += 0.06;
  if (job === '무사' && target?.hp / target?.maxHp <= 0.35) bonus += 0.08;
  if (job === '용기사') bonus += 0.03;
  if (actor.effects?.critUp) bonus += 0.16;
  if (target?.effects?.break) bonus += 0.08;
  return bonus;
},

addFloater({ x, y, value, crit = false, variant = '' }) {
  if (!this.dom.fxLayer) return;
  const now = performance.now();
  const nearby = this.floaters.filter(f => {
    const age = (now - f.createdAt) / f.ttl;
    return age < 0.8 && Math.abs(f.x - x) < 8;
  });
  const stackOffset = nearby.length * 7;
  const sideOffset = nearby.length ? (nearby.length % 2 === 0 ? 1 : -1) * Math.ceil(nearby.length / 2) * 2.5 : 0;
  const finalX = clamp(x + sideOffset, 5, 95);
  const finalY = clamp(y + stackOffset, 5, 92);

  const node = document.createElement('div');
  node.className = `floater${crit ? ' is-crit' : ''}${variant ? ` floater--${variant}` : ''}`;
  node.textContent = value;
  node.style.left = `${finalX}%`;
  node.style.bottom = `${finalY}%`;
  this.dom.fxLayer.appendChild(node);
  const ttl = variant === 'buff' || variant === 'debuff' || variant === 'heal' ? 800 : 520;
  this.floaters.push({
    node, x: finalX, y: finalY,
    createdAt: now,
    ttl,
  });
},

addImpactBurst({ x, y, size = 'normal', color = 'ally' }) {
  if (!this.dom.fxLayer) return;
  const node = document.createElement('div');
  node.className = `impact-burst impact-burst--${size} impact-burst--${color}`;
  node.style.left = `${x}%`;
  node.style.bottom = `${y}%`;
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), size === 'limit' ? 520 : 360);
},

shakeArena(intensity = 8, duration = 220, vertical = false) {
  const arena = this.dom.battleArena;
  if (!arena?.animate) return;
  const h = intensity;
  const v = vertical ? Math.round(intensity * 0.5) : 0;
  arena.animate([
    { transform: 'translate3d(0, 0, 0)' },
    { transform: `translate3d(${-h}px, ${v}px, 0)` },
    { transform: `translate3d(${h}px, ${-v}px, 0)` },
    { transform: `translate3d(${-Math.round(h * 0.7)}px, ${Math.round(v * 0.5)}px, 0)` },
    { transform: `translate3d(${Math.round(h * 0.45)}px, 0, 0)` },
    { transform: `translate3d(${-Math.round(h * 0.2)}px, 0, 0)` },
    { transform: 'translate3d(0, 0, 0)' },
  ], { duration, easing: 'cubic-bezier(.15,.7,.25,1)' });
},

pulseActor(actor, scale = 1.08, duration = 220) {
  if (!actor?.node?.animate) return;
  const base = 'translate(var(--shift-x, 0px), var(--shift-y, 0px)) scale(var(--scale, 1))';
  actor.node.animate([
    { transform: base },
    { transform: `translate(var(--shift-x, 0px), calc(var(--shift-y, 0px) - 2px)) scale(calc(var(--scale, 1) * ${scale}))`, offset: 0.3 },
    { transform: `translate(var(--shift-x, 0px), var(--shift-y, 0px)) scale(calc(var(--scale, 1) * ${scale * 0.96}))`, offset: 0.65 },
    { transform: base },
  ], { duration, easing: 'cubic-bezier(.22,.8,.3,1)' });
},

rollCrit(actor, { isLimit = false, finisher = false, target = null } = {}) {
  if (isLimit) return { crit: true, multiplier: finisher ? 1.32 : 1.12 };
  const moveType = actor.renderProfile?.moveType || 'melee';
  const chanceByType = {
    hover: 0.18,
    ranged: 0.2,
    support: 0.1,
    skirmish: 0.24,
    melee: 0.18,
    'melee-heavy': 0.14,
  };
  const baseChance = actor.team === 'ally' ? (chanceByType[moveType] ?? 0.16) : (actor.isBoss ? 0.08 : 0.11);
  const crit = Math.random() < (baseChance + this.getCritBonus(actor, target));
  return { crit, multiplier: crit ? (actor.team === 'ally' ? 1.7 : 1.45) : 1 };
},

reactTargetHit(actor, { sourceTeam = 'ally', heavy = false, boss = false } = {}) {
  if (!actor?.node?.animate) return;
  const direction = sourceTeam === 'ally' ? -1 : 1;
  // 보스: 묵직하게 크게 밀림 / heavy(크리·리미트): 중간 / 일반: 살짝
  const push = boss ? 14 : heavy ? 10 : 6;
  const settle = boss ? 5 : heavy ? 4 : 2;
  const duration = boss ? 420 : heavy ? 280 : 200;
  // 보스 피격 시 가로로 찌그러지는 squash 효과
  const squashX = boss ? 0.88 : heavy ? 0.93 : 0.97;
  const squashY = boss ? 1.08 : heavy ? 1.04 : 1.02;
  const base = 'translate(calc(-50% + var(--shift-x, 0px)), calc(var(--shift-y, 0px) * -1)) scale(var(--scale, 1))';
  const active = `translate(calc(-50% + var(--shift-x, 0px) + ${direction * push}px), calc(var(--shift-y, 0px) * -1 - ${boss ? 2 : 1}px)) scale(calc(var(--scale, 1) * ${squashX}), calc(var(--scale, 1) * ${squashY}))`;
  const settleTf = `translate(calc(-50% + var(--shift-x, 0px) + ${direction * settle}px), calc(var(--shift-y, 0px) * -1)) scale(var(--scale, 1))`;
  actor.node.animate([
    { transform: base },
    { transform: active, offset: boss ? 0.28 : 0.24 },
    { transform: settleTf, offset: 0.62 },
    { transform: base },
  ], { duration, easing: boss ? 'cubic-bezier(.08,.82,.18,1)' : 'ease-out', fill: 'none' });
},

flashTarget(actor, duration = 180) {
  actor.hitFlashUntil = performance.now() + duration;
  this.syncCombatant(actor);
  setTimeout(() => {
    if (this.destroyed) return;
    actor.hitFlashUntil = 0;
    this.syncCombatant(actor);
  }, duration + 16);
},

addArenaFlash({ color = 'ally', strength = 'normal', duration = 220 } = {}) {
  if (!this.dom.fxLayer) return;
  const node = document.createElement('div');
  node.className = `arena-flash arena-flash--${color} arena-flash--${strength}`;
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), duration);
},



showBossEntrance() {
  this.shakeArena(28, 520, true);
  this.addArenaFlash({ color: 'enemy', strength: 'limit', duration: 320 });
  setTimeout(() => {
    if (this.destroyed) return;
    this.shakeArena(16, 340, false);
    this.addArenaFlash({ color: 'enemy', strength: 'normal', duration: 220 });
  }, 360);
  const boss = this.enemies.find(e => e.isBoss);
  if (boss?.node) {
    boss.node.classList.add('boss-enter');
    setTimeout(() => boss.node?.classList.remove('boss-enter'), 900);
  }
},

showWaveClear() {
  if (!this.dom.fxLayer) return;
  const node = document.createElement('div');
  node.className = 'wave-clear-text';
  node.textContent = 'WAVE CLEAR!';
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 1400);
},

showGemReward(count = 150) {
  if (!this.dom.fxLayer) return;
  const node = document.createElement('div');
  node.className = 'gem-reward-text';
  node.innerHTML = `<span>💎</span><strong>RARE SUMMON +${formatNumber(count)}</strong>`;
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 1700);
},

spawnEnemyDeathParticles(enemy) {
  if (!this.dom.fxLayer) return;
  const count = enemy.isBoss ? 14 : 7;
  for (let i = 0; i < count; i++) {
    const node = document.createElement('div');
    node.className = `death-particle death-particle--${enemy.isBoss ? 'boss' : 'normal'}`;
    const angle = (360 / count) * i + Math.random() * 20;
    const dist = enemy.isBoss ? 6 + Math.random() * 10 : 3 + Math.random() * 7;
    const tx = Math.cos(angle * Math.PI / 180) * dist;
    const ty = Math.sin(angle * Math.PI / 180) * dist;
    node.style.left = `${enemy.x}%`;
    node.style.bottom = `${enemy.y + 8}%`;
    node.style.setProperty('--tx', `${tx}vw`);
    node.style.setProperty('--ty', `${ty}vh`);
    this.dom.fxLayer.appendChild(node);
    setTimeout(() => node.remove(), enemy.isBoss ? 700 : 500);
  }
  this.addImpactBurst({ x: enemy.x, y: enemy.y + 8, size: enemy.isBoss ? 'limit' : 'normal', color: 'ally' });
  if (enemy.isBoss) {
    this.shakeArena(20, 420, true);
    this.addArenaFlash({ color: 'ally', strength: 'limit', duration: 300 });
  }
},

addComboHit(x, y, count) {
  if (!this.dom.fxLayer || count < 2) return;
  const node = document.createElement('div');
  node.className = 'combo-hit';
  node.textContent = `${count} HIT!`;
  node.style.left = `${x}%`;
  node.style.bottom = `${clamp(y + 20, 15, 90)}%`;
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), 700);
},

syncDangerState() {
  this.allies.forEach(ally => {
    const inDanger = ally.hp > 0 && (ally.hp / ally.maxHp) <= 0.3;
    ally.node?.classList.toggle('is-danger', inDanger);
  });
},

addSlashStreak({ fromX, fromY, toX, toY, color = 'ally', duration = 280 }) {
  if (!this.dom.fxLayer) return;
  const node = document.createElement('div');
  node.className = `slash-streak slash-streak--${color}`;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.max(6, Math.hypot(dx, dy) * 10.5);
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  node.style.left = `${fromX}%`;
  node.style.bottom = `${fromY}%`;
  node.style.width = `${distance}px`;
  node.style.transform = `translateY(-50%) rotate(${angle}deg)`;
  this.dom.fxLayer.appendChild(node);
  setTimeout(() => node.remove(), duration);
},

updateFloaters(now) {
  this.floaters = this.floaters.filter((floater) => {
    const progress = (now - floater.createdAt) / floater.ttl;
    if (progress >= 1) {
      floater.node.remove();
      return false;
    }
    // 초반 80% 유지, 후반 20% 페이드아웃
    floater.node.style.opacity = String(progress < 0.65 ? 1 : 1 - (progress - 0.65) / 0.35);
    floater.node.style.transform = `translate(-50%, ${-58 * progress}px)`;
    return true;
  });
}
  });
}
