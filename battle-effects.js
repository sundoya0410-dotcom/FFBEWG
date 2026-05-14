import { formatNumber } from './assets.js';
import { clamp, pickAlive } from './battle-shared.js';

const ELEMENT_ADVANTAGE = { '묵': '찌', '찌': '빠', '빠': '묵' };
const ELEMENT_META = {
  '묵': { icon: '✊', color: '#ff6644' },
  '찌': { icon: '✌️', color: '#44cc66' },
  '빠': { icon: '🖐️', color: '#44aaff' },
};
const ELEMENT_KEYS = Object.keys(ELEMENT_ADVANTAGE);

export function attachBattleEffects(HomeBattleCore) {
  Object.assign(HomeBattleCore.prototype, {
getRole(actor) {
  return actor?.unit?.role || '';
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
    return { multiplier: 0.9, label: '무승부', tag: `${ELEMENT_META[attackerElement]?.icon || ''}DRAW`, variant: 'same-el', attackerElement, targetElement };
  }
  if (ELEMENT_ADVANTAGE[attackerElement] === targetElement) {
    return { multiplier: 1.5, label: '우위', tag: `${ELEMENT_META[attackerElement]?.icon || ''}WIN`, variant: 'weak-el', attackerElement, targetElement };
  }
  if (ELEMENT_ADVANTAGE[targetElement] === attackerElement) {
    return { multiplier: 0.6, label: '열세', tag: `${ELEMENT_META[attackerElement]?.icon || ''}LOSE`, variant: 'resist-el', attackerElement, targetElement };
  }
  return { multiplier: 1, label: '', tag: '', variant: '', attackerElement, targetElement };
},

getAttackKind(actor) {
  if (actor?.attackType) return actor.attackType;
  const role = this.getRole(actor);
  return role === '마법 딜러' || role === '힐러' ? 'magical' : 'physical';
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
  const icons = { attackUp: '⚔️ ATK↑', critUp: '🎯 CRIT↑', guard: '🛡️ GUARD', taunt: '🔥 DRAW' };
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

computeAttackMultiplier(actor, target, { isLimit = false, finisher = false } = {}) {
  let mult = 1;
  const role = this.getRole(actor);
  if (role === '물리 딜러') mult *= 1.12;
  else if (role === '마법 딜러') mult *= 1.08;
  else if (role === '탱커') mult *= 0.86;
  else if (role === '디버퍼') mult *= 0.94;
  else if (role === '힐러') mult *= 0.78;
  else if (role === '버퍼') mult *= 0.82;
  if (actor.effects?.attackUp) mult *= 1.24;
  if (target?.effects?.break) mult *= 1.22;
  mult *= this.getElementMatchup(actor, target).multiplier;
  mult *= this.getDefenseMultiplier(actor, target);
  if (isLimit) mult *= finisher ? 1.18 : 1.05;
  return mult;
},

getCritBonus(actor, target) {
  let bonus = 0;
  if (actor.effects?.critUp) bonus += 0.16;
  if (target?.effects?.break) bonus += 0.08;
  return bonus;
},

addFloater({ x, y, value, crit = false, variant = '' }) {
  // 같은 x 근처(±8%)에 살아있는 floater 수 세서 위로 쌓기
  const now = performance.now();
  const nearby = this.floaters.filter(f => {
    const age = (now - f.createdAt) / f.ttl;
    return age < 0.85 && Math.abs(f.x - x) < 8;
  });
  const stackOffset = nearby.length * 10; // floater 1개당 10% 위로
  const finalY = clamp(y + stackOffset, 5, 92);

  const node = document.createElement('div');
  node.className = `floater${crit ? ' is-crit' : ''}${variant ? ` floater--${variant}` : ''}`;
  node.textContent = value;
  node.style.left = `${x}%`;
  node.style.bottom = `${finalY}%`;
  this.dom.fxLayer.appendChild(node);
  const ttl = variant === 'buff' || variant === 'debuff' || variant === 'heal' ? 1100 : 750;
  this.floaters.push({
    node, x, y: finalY,
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
    floater.node.style.opacity = String(progress < 0.75 ? 1 : 1 - (progress - 0.75) * 4);
    floater.node.style.transform = `translate(-50%, ${-44 * progress}px)`;
    return true;
  });
}
  });
}
