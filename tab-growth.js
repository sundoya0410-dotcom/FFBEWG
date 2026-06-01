// tab-growth.js — 성장 탭 (레벨업 / 승급)
import {
  renderStars,
  formatNumber,
  resolveUnitPortrait,
  resolveUnitSprite,
  resolveUnitImageSprite,
  ensureEquipmentState,
  recordQuestProgress,
  getEquippedItemsForUnit,
  getEffectiveUnitStats,
  getRarityStyle,
  getUnitBattleRole,
  getUnitJobRoles,
  renderJobTooltipAttrs,
  renderVisualVars,
  getUnitCommonPassive,
} from './utils.js';
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_TYPE_ICONS,
  formatEquipmentStats,
  getEquipmentDisplayIcon,
} from './equipment-data.js';
import { describeLimitBurst } from './limit-data.js';

export const ELEMENT_INFO = {
  '묵': { icon: '✊', color: '#ff6644', weak: '찌', resist: '빠' },
  '찌': { icon: '✌️', color: '#44cc66', weak: '빠', resist: '묵' },
  '빠': { icon: '🖐️', color: '#44aaff', weak: '묵', resist: '찌' },
};

const LEGACY_ELEMENT_MAP = { '화': '묵', '목': '찌', '수': '빠', '화속': '묵', '천속': '찌', '지속': '빠' };

function normalizeElement(element) {
  return LEGACY_ELEMENT_MAP[element] || element;
}

let growthSelectedId = null;
let growthTab = 'levelup'; // 'levelup' | 'starUp' | 'equipment'
let growthSortMode = 'grade'; // 'grade' | 'role' | 'series'
let growthSortDir = 'desc'; // 'desc' | 'asc'

const SORT_LABELS = { grade: '등급순', level: '등급순', role: '역할순', series: '시리즈순' };
const ROLE_ORDER  = { '물리 딜러':0, '마법 딜러':1, '탱커':2, '버퍼':3, '디버퍼':4, '힐러':5 };
const SERIES_ORDER = { FF1:0,FF2:1,FF3:2,FF4:3,FF5:4,FF6:5,FF7:6,FF8:7,FF9:8,FF10:9,'C-AD':10,'C-KH':11,'C-NA':12,'C-ToM':13,'C-VF':14 };

function getSortTier(unit) {
  return Number(unit.tier || unit.stars || unit.minTier || 1) || 1;
}

function sortGrowthUnits(units) {
  const arr = [...units];
  if (growthSortMode === 'grade' || growthSortMode === 'level') {
    const dir = growthSortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const gradeDiff = getSortTier(a) - getSortTier(b);
      if (gradeDiff) return gradeDiff * dir;
      return ((Number(a.level) || 1) - (Number(b.level) || 1)) * dir
        || ((Number(a.power) || 0) - (Number(b.power) || 0)) * dir
        || String(a.name || '').localeCompare(String(b.name || ''));
    });
  } else if (growthSortMode === 'role') {
    arr.sort((a, b) => (ROLE_ORDER[getUnitBattleRole(a)] ?? 99) - (ROLE_ORDER[getUnitBattleRole(b)] ?? 99) || getSortTier(b) - getSortTier(a) || b.level - a.level);
  } else if (growthSortMode === 'series') {
    arr.sort((a, b) => (SERIES_ORDER[a.series] ?? 99) - (SERIES_ORDER[b.series] ?? 99) || getSortTier(b) - getSortTier(a) || b.level - a.level);
  }
  return arr;
}

// ── 성장 공식 ──────────────────────────────────────────────
export function maxLevel(unit) {
  const promotedToFinalTier = getCurrentTier(unit) >= getMaxTier(unit);
  const breaks = promotedToFinalTier ? Math.max(0, Math.floor(Number(unit?.limitBreak) || 0)) : 0;
  return Math.min(100, 25 + breaks * 5);
}
export function calcLevelUpCost(unit) {
  const level = Number(unit.level) || 1;
  return Math.floor(180 + level * 70 + (Number(unit.stars) || 1) * 120);
}
export function calcLevelUpStoneCost(unit) {
  const level = Number(unit.level) || 1;
  return Math.floor(8 + level * 2 + (Number(unit.stars) || 1) * 4);
}
export function calcPowerGain(unit) {
  const cap = Math.max(1, maxLevel(unit));
  return Math.max(90, Math.floor(((Number(unit.power) || 0) / cap) * 0.36 + (Number(unit.stars) || 1) * 32));
}
export function calcLevelStatGain(unit, stat) {
  const level = Number(unit.level) || 1;
  const stars = Number(unit.stars) || 1;
  if (stat === 'maxHp') return Math.max(120, Math.floor((Number(unit.maxHp) || 0) * 0.025 + stars * 45));
  if (stat === 'mp') return Math.max(2, Math.floor(2 + stars * 0.8 + level * 0.08));
  const base = Number(unit[stat]) || 0;
  return Math.max(2, Math.floor(base * 0.025 + stars * 1.6));
}
export function canLevelUp(unit, resources = {}) {
  const gold = typeof resources === 'number' ? resources : Number(resources.gold) || 0;
  const growthStone = typeof resources === 'number' ? Infinity : Number(resources.growthStone) || 0;
  return unit.level < maxLevel(unit) && gold >= calcLevelUpCost(unit) && growthStone >= calcLevelUpStoneCost(unit);
}
function getLevelUpBatch(unit, resources = {}, desired = 1) {
  const maxCount = Math.max(1, Math.floor(Number(desired) || 1));
  const result = { count: 0, gold: 0, growthStone: 0, power: 0, maxHp: 0, mp: 0, atk: 0, mag: 0, def: 0, spr: 0 };
  const shadow = { ...unit };
  let gold = Number(resources.gold) || 0;
  let stones = Number(resources.growthStone) || 0;
  while (result.count < maxCount && shadow.level < maxLevel(shadow)) {
    const goldCost = calcLevelUpCost(shadow);
    const stoneCost = calcLevelUpStoneCost(shadow);
    if (gold < goldCost || stones < stoneCost) break;
    const gains = {
      power: calcPowerGain(shadow),
      maxHp: calcLevelStatGain(shadow, 'maxHp'),
      mp: calcLevelStatGain(shadow, 'mp'),
      atk: calcLevelStatGain(shadow, 'atk'),
      mag: calcLevelStatGain(shadow, 'mag'),
      def: calcLevelStatGain(shadow, 'def'),
      spr: calcLevelStatGain(shadow, 'spr'),
    };
    gold -= goldCost;
    stones -= stoneCost;
    result.gold += goldCost;
    result.growthStone += stoneCost;
    Object.entries(gains).forEach(([key, value]) => { result[key] += value; shadow[key] = (Number(shadow[key]) || 0) + value; });
    shadow.level = (Number(shadow.level) || 1) + 1;
    shadow.hp = Number(shadow.maxHp) || shadow.hp;
    result.count += 1;
  }
  return result;
}
function applyLevelUpBatch(unit, batch) {
  if (!unit || !batch?.count) return;
  unit.level = (Number(unit.level) || 1) + batch.count;
  ['power', 'maxHp', 'mp', 'atk', 'mag', 'def', 'spr'].forEach((key) => {
    unit[key] = Math.max(0, Math.floor((Number(unit[key]) || 0) + (Number(batch[key]) || 0)));
  });
  unit.hp = Number(unit.maxHp) || unit.hp;
}
export function getPromotionShardCost(unit) { return 3; }
function getCurrentTier(unit) {
  return Math.max(1, Math.min(6, Math.floor(Number(unit?.tier || unit?.stars || unit?.minTier || 1) || 1)));
}
function getMaxTier(unit) {
  const folderMax = unit?.tierFolders && typeof unit.tierFolders === 'object'
    ? Math.max(...Object.keys(unit.tierFolders).map(Number).filter(Number.isFinite), getCurrentTier(unit))
    : getCurrentTier(unit);
  return Math.max(getCurrentTier(unit), Math.min(6, Math.floor(Number(unit?.maxTier || folderMax) || folderMax)));
}
function getPromotionPreview(unit) {
  const currentTier = getCurrentTier(unit);
  const maxTier = getMaxTier(unit);
  const nextTier = currentTier < maxTier ? currentTier + 1 : currentTier;
  const currentMaxLevel = maxLevel(unit);
  const nextMaxLevel = Math.min(100, currentMaxLevel + 5);
  return { currentTier, maxTier, nextTier, currentMaxLevel, nextMaxLevel };
}
export function canStarUp(unit) {
  const promotion = getPromotionPreview(unit);
  const canTierUp = promotion.nextTier > promotion.currentTier;
  const canLimitBreak = promotion.currentTier >= promotion.maxTier && promotion.currentMaxLevel < 100;
  return (canTierUp || canLimitBreak) && (Number(unit.shards) || 0) >= getPromotionShardCost(unit);
}

function getGrowthUnitStatus(unit) {
  const promotion = getPromotionPreview(unit);
  const shards = Number(unit?.shards) || 0;
  const cost = getPromotionShardCost(unit);
  if (canStarUp(unit)) return { tone: 'ready', label: promotion.nextTier > promotion.currentTier ? '승급 가능' : '레벨캡 확장 가능' };
  if (promotion.nextTier > promotion.currentTier || promotion.currentMaxLevel < 100) return { tone: 'need', label: `조각 ${shards}/${cost}` };
  return { tone: 'max', label: '성장 완료' };
}

function renderCommonPassiveBadge(unit) {
  const passive = getUnitCommonPassive(unit);
  if (!passive) return '';
  return `<span class="ginfo__passive" title="${passive.text || ''}">${passive.label}</span>`;
}

function renderAbilityInfoCards(unit) {
  const passive = getUnitCommonPassive(unit);
  const limit = describeLimitBurst(unit);
  return `
    <div class="ginfo__ability-grid">
      <div class="ginfo__ability-card ginfo__ability-card--passive">
        <span class="ginfo__ability-kicker">고유 패시브</span>
        <strong>${passive ? passive.label : '없음'}</strong>
        <p>${passive ? passive.text : '이 유닛은 아직 고유 패시브가 없습니다.'}</p>
      </div>
      <div class="ginfo__ability-card ginfo__ability-card--limit">
        <span class="ginfo__ability-kicker">리미트기</span>
        <strong>${limit.name}</strong>
        <p>${limit.text}</p>
      </div>
    </div>`;
}
function getPortraitSources(unit) {
  return resolveUnitPortrait(unit).filter(Boolean);
}

function renderPortraitImg(unit, className = '') {
  const sources = getPortraitSources(unit);
  const src = sources[0] || '';
  const fallback = sources[1] || '';
  if (!src) return '';
  const fallbackAttr = fallback ? ` data-fallback="${fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback"` : '';
  return `<img src="${src}" alt="${unit.name}"${className ? ` class="${className}"` : ''}${fallbackAttr} draggable="false">`;
}

function renderSpriteImg(unit, className = '', motion = 'idle') {
  const sources = resolveUnitImageSprite(unit, motion).filter(Boolean);
  const src = sources[0] || '';
  const fallback = sources[1] || '';
  if (!src) return renderPortraitImg(unit, className);
  const fallbackAttr = fallback ? ` data-fallback="${fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback"` : '';
  return `<img src="${src}" alt="${unit.name}"${className ? ` class="${className}"` : ''}${fallbackAttr} draggable="false">`;
}
function renderStat(label, baseValue, effectiveValue) {
  const base = Number(baseValue) || 0;
  const effective = Number(effectiveValue) || 0;
  const bonus = Math.max(0, effective - base);
  return `
    <div class="gstat">
      <span class="gstat__label">${label}</span>
      <span class="gstat__val">${formatNumber(effective)}${bonus ? `<em class="gstat__bonus">+${formatNumber(bonus)}</em>` : ''}</span>
    </div>`;
}

function getEquippedIdSet(state) {
  return new Set(Object.values(state.equipment?.equipped || {}).flatMap((slots) => Object.values(slots || {})));
}

function makeGrowthCard(unit, isSelected, isParty = false, state = null) {
  const battleRole = getUnitBattleRole(unit);
  const jobLabel = unit.job || battleRole;
  const roleShort = { '물리 딜러':'⚔','마법 딜러':'🔮','탱커':'🛡','버퍼':'✨','디버퍼':'🩸','힐러':'💚' }[battleRole] || '•';
  const roleColor = { '⚔':'#ff4444', '🔮':'#aa66ff', '🛡':'#28d970', '✨':'#ffcc33', '🩸':'#3399ff', '💚':'#ff66aa' }[roleShort] || '#4488cc';
  const element = normalizeElement(unit.element);
  const el = ELEMENT_INFO[element] || { icon: '?', color: '#aaa' };
  const maxLv = maxLevel(unit);
  const lvPct = Math.round((unit.level / maxLv) * 100);
  const growthStatus = getGrowthUnitStatus(unit);
  return `
    <div class="unit-card2${isSelected ? ' is-selected' : ''}${isParty ? ' growth-is-party' : ''} is-growth-${growthStatus.tone}" data-gunit="${unit.id}" style="--role-color:${roleColor};${getRarityStyle(unit)};${renderVisualVars(state, unit)}">
      <div class="unit-card2__art">
        ${renderPortraitImg(unit, 'unit-card2__sprite')}
        <span class="unit-card2__el-dot" style="background:${el.color}">${el.icon}</span>
        <div class="unit-card2__lvbar"><span style="width:${lvPct}%"></span></div>
        <div class="unit-card2__promote unit-card2__promote--${growthStatus.tone}">${growthStatus.label}</div>
      </div>
      <div class="unit-card2__stars">${renderStars(unit.stars)}</div>
      <div class="unit-card2__name">${unit.name}</div>
      <div class="unit-card2__job job-tip-host" ${renderJobTooltipAttrs(unit)}>${jobLabel}</div>
    </div>`;
}

function makeGrowthPartyChip(unit, isSelected, slotIndex, state) {
  const battleRole = getUnitBattleRole(unit);
  const jobLabel = unit.job || battleRole;
  const roleShort = { '물리 딜러':'⚔','마법 딜러':'🔮','탱커':'🛡','버퍼':'✨','디버퍼':'🩸','힐러':'💚' }[battleRole] || '•';
  const roleColor = { '⚔':'#ff4444', '🔮':'#aa66ff', '🛡':'#28d970', '✨':'#ffcc33', '🩸':'#3399ff', '💚':'#ff66aa' }[roleShort] || '#4488cc';
  const effective = getEffectiveUnitStats(state, unit) || unit;
  return `
    <button class="growth-party-chip${isSelected ? ' is-selected' : ''}" data-gunit="${unit.id}" type="button" style="--role-color:${roleColor};${getRarityStyle(unit)};${renderVisualVars(state, unit)}">
      <span class="growth-party-chip__slot">${slotIndex + 1}</span>
      <span class="growth-party-chip__portrait">
        ${renderPortraitImg(unit)}
      </span>
      <span class="growth-party-chip__main">
        <strong>${unit.name}</strong>
        <em>LV ${unit.level} · ${jobLabel}${canStarUp(unit) ? ' · 승급 가능' : ''}</em>
      </span>
      <span class="growth-party-chip__power">${formatNumber(effective.power || unit.power || 0)}</span>
    </button>
  `;
}

// ── 렌더 ──────────────────────────────────────────────────
export function renderGrowthScreen(ctx) {
  const { state } = ctx;
  const allUnits = state.units;
  const sorted   = sortGrowthUnits(allUnits);
  const partyIdSet = new Set(state.party.slots.filter(Boolean));

  // 파티 슬롯 행
  const partyHtml = state.party.slots.map((id, index) => {
    const unit = id ? allUnits.find((u) => u.id === id) : null;
    if (!unit) return `<div class="growth-party-chip growth-party-chip--empty"><span>${index + 1}</span><strong>빈 슬롯</strong></div>`;
    return makeGrowthPartyChip(unit, growthSelectedId === unit.id, index, state);
  }).join('');

  // 전체 유닛 그리드 — 파티원에 growth-is-party 클래스 직접 부여
  const unitGridHtml = sorted.map((unit) => {
    return makeGrowthCard(unit, growthSelectedId === unit.id, partyIdSet.has(unit.id), state);
  }).join('');

  return `
    <section class="growth-screen">
      <div class="growth-topbar">
        <span class="growth-topbar__title">성장</span>
        <button class="sort-btn" id="growthSortBtn" data-gsort-toggle type="button">${SORT_LABELS[growthSortMode] || SORT_LABELS.grade} ${growthSortMode === 'grade' || growthSortMode === 'level' ? (growthSortDir === 'desc' ? '↓' : '↑') : '▾'}</button>
      </div>
      <div class="growth-sort-menu" id="growthSortMenu">
        <button class="sort-opt${(growthSortMode === 'grade' || growthSortMode === 'level') && growthSortDir === 'desc' ? ' is-on' : ''}" data-gsort="grade" data-gdir="desc" type="button">등급 내림차순</button>
        <button class="sort-opt${(growthSortMode === 'grade' || growthSortMode === 'level') && growthSortDir === 'asc' ? ' is-on' : ''}" data-gsort="grade" data-gdir="asc" type="button">등급 오름차순</button>
        <button class="sort-opt${growthSortMode==='role'   ?' is-on':''}" data-gsort="role" type="button">역할별</button>
        <button class="sort-opt${growthSortMode==='series' ?' is-on':''}" data-gsort="series" type="button">시리즈별</button>
      </div>
      <div class="growth-party-section">
        <div class="growth-party-label">현재 파티</div>
        <div class="growth-party-row">${partyHtml}</div>
      </div>
      <div class="growth-divider">
        <span>보유 유닛 (${allUnits.length})</span>
      </div>
      <div class="growth-grid" id="growthList">${unitGridHtml}</div>
    </section>
  `;
}

function renderEquipmentPanelHTML(sel, state) {
  const equipment = state.equipment || { inventory: [], equipped: {} };
  const equipped = getEquippedItemsForUnit(state, sel.id);
  const equippedIds = getEquippedIdSet(state);
  const available = [...(equipment.inventory || [])]
    .filter((item) => item && (!equippedIds.has(item.id) || Object.values(equipped).some((eq) => eq?.id === item.id)))
    .sort((a, b) => {
      const typeDiff = EQUIPMENT_TYPES.indexOf(a.type) - EQUIPMENT_TYPES.indexOf(b.type);
      return typeDiff || (b.rarityRank || 0) - (a.rarityRank || 0) || (b.power || 0) - (a.power || 0);
    });

  const slotHtml = EQUIPMENT_TYPES.map((type) => {
    const item = equipped[type];
    return `
      <div class="equip-slot${item ? ' is-filled' : ''}">
        <div class="equip-slot__head">
          <span>${EQUIPMENT_TYPE_ICONS[type]} ${EQUIPMENT_TYPE_LABELS[type]}</span>
          ${item ? `<button class="equip-slot__unequip" data-unequip="${type}" type="button">해제</button>` : ''}
        </div>
        ${item ? `
          <div class="equip-slot__item">
            <strong style="color:${item.color}">${item.name}</strong>
            <span>${formatEquipmentStats(item.stats)}</span>
            <em>전투력 +${formatNumber(item.power)}</em>
          </div>
        ` : '<div class="equip-slot__empty">미장착</div>'}
      </div>`;
  }).join('');

  const inventoryHtml = available.length ? available.map((item) => {
    const equippedHere = Object.values(equipped).some((eq) => eq?.id === item.id);
    return `
      <button class="equip-item${equippedHere ? ' is-equipped-here' : ''}" data-equip-item="${item.id}" type="button" ${equippedHere ? 'disabled' : ''}>
        <span class="equip-item__icon" style="border-color:${item.color};color:${item.color}">${getEquipmentDisplayIcon(item)}</span>
        <span class="equip-item__main">
          <strong style="color:${item.color}">${item.name}</strong>
          <em>${item.kind || EQUIPMENT_TYPE_LABELS[item.type]} · ${formatEquipmentStats(item.stats)}</em>
        </span>
        <span class="equip-item__power">+${formatNumber(item.power)}</span>
      </button>`;
  }).join('') : '<div class="equip-empty">보유 장비가 없습니다. 소환 탭에서 장비를 획득하세요.</div>';

  return `
    <div class="equip-panel">
      <div class="equip-slots">${slotHtml}</div>
      <div class="equip-list-head">
        <span>장착 가능 장비</span>
        <strong>${available.length}</strong>
      </div>
      <div class="equip-list">${inventoryHtml}</div>
    </div>`;
}

function renderGrowthPanelHTML(sel, state) {
  const adminFreeResources = Boolean(state.adminMode);
  const levelResources = adminFreeResources ? { gold: Infinity, growthStone: Infinity } : state.resources;
  const gold = Number(state.resources.gold) || 0;
  const growthStone = Number(state.resources.growthStone) || 0;
  const levelResourceHaveText = adminFreeResources ? '관리자 무제한' : `보유: 골드 ${formatNumber(gold)} · 성장석 ${formatNumber(growthStone)}`;
  const effective = getEffectiveUnitStats(state, sel) || sel;
  const bonusStats = effective.equipmentStats || {};
  const baseStats = {
    maxHp: Number(sel.maxHp) || 0,
    mp: Number(sel.mp) || 160,
    atk: Number(sel.atk) || 80,
    mag: Number(sel.mag) || 80,
    def: Number(sel.def) || 80,
    spr: Number(sel.spr) || 80,
  };
  const element = normalizeElement(sel.element);
  const el = ELEMENT_INFO[element] || { icon: '?', color: '#aaa', weak: '-', resist: '-' };
  const weakEl   = ELEMENT_INFO[el.weak]   || { icon: '?', color: '#aaa' };
  const resistEl = ELEMENT_INFO[el.resist] || { icon: '?', color: '#aaa' };
  const maxLv  = maxLevel(sel);
  const lvPct  = Math.round((sel.level / maxLv) * 100);
  const lvCost = calcLevelUpCost(sel);
  const stoneCost = calcLevelUpStoneCost(sel);
  const levelBatch1 = getLevelUpBatch(sel, levelResources, 1);
  const levelBatch5 = getLevelUpBatch(sel, levelResources, 5);
  const activeBatch = levelBatch5.count > 1 ? levelBatch5 : levelBatch1;
  const promotionCost = getPromotionShardCost(sel);
  const promotion = getPromotionPreview(sel);
  const nextMaxLv = promotion.nextMaxLevel;
  const breakCount = Math.max(0, Math.floor(Number(sel.limitBreak) || 0));
  const canTierUp = promotion.nextTier > promotion.currentTier;
  const canLimitBreak = promotion.currentTier >= promotion.maxTier && maxLv < 100;
  const canPromote = (canTierUp || canLimitBreak) && (Boolean(state.adminMode) || canStarUp(sel));
  const promotionShardText = state.adminMode ? '관리자 무료 승급' : `조각: ${sel.shards || 0}/${promotionCost}`;
  const battleRole = getUnitBattleRole(sel);
  const jobLabel = sel.job || battleRole;
  const roleLabel = getUnitJobRoles(sel).join(' · ');
  const passive = getUnitCommonPassive(sel);
  const growthStatus = getGrowthUnitStatus(sel);

  return `
    <div class="ginfo-panel" id="gInfoPanel">
      <button class="ginfo-close" data-gclose type="button">✕</button>
      <div class="ginfo__header">
        <div class="ginfo__portrait ginfo__portrait--sprite" style="--el-color:${el.color};${getRarityStyle(sel)};${renderVisualVars(state, sel)}">
          ${renderSpriteImg(sel, 'ginfo__portrait-img ginfo__portrait-img--sprite')}
        </div>
        <div class="ginfo__title">
          <div class="ginfo__name-row">
            <span class="ginfo__name">${sel.name}</span>
            <span class="ginfo__el-badge" style="background:${el.color}22;border-color:${el.color}66;color:${el.color}">${el.icon} ${element}</span>
          </div>
          <div class="ginfo__sub-row">
            <span class="ginfo__stars">${renderStars(sel.stars)}</span>
            <span class="ginfo__role job-tip-host" ${renderJobTooltipAttrs(sel)}>${jobLabel}</span>
            <span class="ginfo__role">${roleLabel}</span>
            ${renderCommonPassiveBadge(sel)}
          </div>
          <div class="ginfo__lv">LV ${sel.level} / ${maxLv}${maxLv >= 100 ? ' <span class="gdetail__max-badge">LV CAP 100</span>' : sel.level >= maxLv ? ' <span class="gdetail__max-badge">MAX</span>' : ''}</div>
          <div class="ginfo__lvbar"><span style="width:${lvPct}%"></span></div>
          <div class="ginfo__power-row">
            <span>전투력</span>
            <strong>${formatNumber(effective.power)}</strong>
          </div>
        </div>
      </div>
      <div class="ginfo__element-strip">
        <div class="gel-item gel-item--weak">
          <span class="gel-item__label">약점</span>
          <span class="gel-item__icon" style="background:${weakEl.color}33;border-color:${weakEl.color}66">${weakEl.icon}</span>
          <span class="gel-item__rate">×1.5</span>
        </div>
        <div class="gel-item gel-item--self">
          <span class="gel-item__label">상쇄</span>
          <span class="gel-item__icon" style="background:${el.color}33;border-color:${el.color}66">${el.icon}</span>
          <span class="gel-item__rate">×0.9</span>
        </div>
        <div class="gel-item gel-item--resist">
          <span class="gel-item__label">내성</span>
          <span class="gel-item__icon" style="background:${resistEl.color}33;border-color:${resistEl.color}66">${resistEl.icon}</span>
          <span class="gel-item__rate">×0.6</span>
        </div>
      </div>
      ${renderAbilityInfoCards(sel)}
      <div class="ginfo__body">
        <div class="ginfo__stats">
          ${renderStat('HP', baseStats.maxHp, baseStats.maxHp + (Number(bonusStats.maxHp) || 0))}
          ${renderStat('MP', baseStats.mp, baseStats.mp + (Number(bonusStats.mp) || 0))}
          ${renderStat('공격', baseStats.atk, baseStats.atk + (Number(bonusStats.atk) || 0))}
          ${renderStat('마력', baseStats.mag, baseStats.mag + (Number(bonusStats.mag) || 0))}
          ${renderStat('방어', baseStats.def, baseStats.def + (Number(bonusStats.def) || 0))}
          ${renderStat('정신', baseStats.spr, baseStats.spr + (Number(bonusStats.spr) || 0))}
        </div>
      </div>
      <div class="gdetail__tabs">
        <button class="gtab${growthTab === 'levelup' ? ' is-active' : ''}" data-gtab="levelup">레벨업</button>
        <button class="gtab${growthTab === 'starUp' ? ' is-active' : ''}" data-gtab="starUp">승급</button>
        <button class="gtab${growthTab === 'equipment' ? ' is-active' : ''}" data-gtab="equipment">장비</button>
      </div>
      ${growthTab === 'levelup' ? `
        <div class="gdetail__action">
          <div class="gaction-preview">
            <span>전투력 ${formatNumber(effective.power)}</span>
            <span class="gaction-arrow">→</span>
            <span class="gaction-after">${activeBatch.count ? formatNumber(sel.power + activeBatch.power + (effective.equipmentPower || 0)) : 'MAX'}</span>
          </div>
          <div class="growth-cost">
            <span>1회: 골드 ${formatNumber(lvCost)} · 성장석 ${formatNumber(stoneCost)}</span>
            <span class="growth-cost__have">${levelResourceHaveText}</span>
          </div>
          <div class="growth-level-preview">
            <span>예상 상승</span>
            <strong>LV +${activeBatch.count || 0}</strong>
            <em>HP +${formatNumber(activeBatch.maxHp || 0)} · 공격 +${formatNumber(activeBatch.atk || 0)} · 마력 +${formatNumber(activeBatch.mag || 0)} · 전투력 +${formatNumber(activeBatch.power || 0)}</em>
          </div>
          <div class="growth-action-row">
            <button class="growth-action-btn${levelBatch1.count ? '' : ' is-disabled'}" data-action="levelup" data-level-count="1" ${levelBatch1.count ? '' : 'disabled'}>
              ${sel.level >= maxLv ? '최대 레벨' : levelBatch1.count ? '1 레벨업' : (gold < lvCost ? '골드 부족' : '성장석 부족')}
            </button>
            <button class="growth-action-btn growth-action-btn--multi${levelBatch5.count > 1 ? '' : ' is-disabled'}" data-action="levelup" data-level-count="5" ${levelBatch5.count > 1 ? '' : 'disabled'}>
              ${levelBatch5.count > 1 ? `+${levelBatch5.count} 레벨업` : '일괄 불가'}
            </button>
          </div>
        </div>
      ` : growthTab === 'starUp' ? `
        <div class="growth-status growth-status--${growthStatus.tone}">${growthStatus.label}${passive ? ` · 패시브: ${passive.label}` : ''}</div>
        <div class="gdetail__action">
          <div class="gaction-preview">
            <span>${promotion.currentTier}성 승급 ${breakCount}</span>
            <span class="gaction-arrow">→</span>
            <span class="gaction-after">${promotion.nextTier > promotion.currentTier ? `${promotion.nextTier}성` : `LV ${nextMaxLv}`}</span>
          </div>
          <div class="growth-cost">
            <span>${canTierUp ? `같은 캐릭터 조각 ${promotionCost}개로 ${promotion.nextTier}성 승급` : `승급을 모두 마친 유닛만 최대 레벨 +5`}</span>
            <span class="growth-cost__have">${promotionShardText} · ${canTierUp ? `최대 LV ${maxLv} 유지` : `최대 LV ${maxLv} → ${nextMaxLv}`}</span>
          </div>
          <div class="growth-level-preview">
            <span>승급 효과</span>
            <strong>${promotion.nextTier > promotion.currentTier ? `${promotion.currentTier}성 → ${promotion.nextTier}성` : `LV CAP ${maxLv} → ${nextMaxLv}`}</strong>
            <em>전투력 +10% · HP +10% · 공격/마력 +8% · 방어/정신 +7%</em>
          </div>
          <button class="growth-action-btn${canPromote ? '' : ' is-disabled'}" data-action="starup" ${canPromote ? '' : 'disabled'}>
            ${canTierUp || canLimitBreak ? (canPromote ? (canTierUp ? `승급 ${promotion.currentTier}성 → ${promotion.nextTier}성` : `최대 레벨 확장 LV ${maxLv} → ${nextMaxLv}`) : `조각 부족(${sel.shards || 0}/${promotionCost})`) : '최대 승급 완료'}
          </button>
        </div>
      ` : renderEquipmentPanelHTML(sel, state)}
    </div>`;
}

export function renderGrowthPanel(ctx) {
  const { state, refs } = ctx;

  const existing = document.querySelector('.ginfo-overlay');
  if (existing) existing.remove();
  if (!growthSelectedId) return;

  const sel = state.units.find((u) => u.id === growthSelectedId);
  if (!sel) return;

  const overlay = document.createElement('div');
  overlay.className = 'ginfo-overlay';
  overlay.innerHTML = renderGrowthPanelHTML(sel, state);
  refs.contentEntry.appendChild(overlay);

  function closePanel() {
    growthSelectedId = null;
    overlay.remove();
    refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
    bindGrowthEvents(ctx);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-gclose]')) {
      closePanel();
      return;
    }
    const tabBtn = e.target.closest('[data-gtab]');
    if (tabBtn) {
      growthTab = tabBtn.dataset.gtab;
      renderGrowthPanel(ctx);
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      handleGrowthAction({ currentTarget: actionBtn }, ctx);
    }
  });
  bindEquipmentButtons(ctx);
}

function refreshGrowthPanel(ctx) {
  const { refs } = ctx;
  refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
  bindGrowthEvents(ctx);
  renderGrowthPanel(ctx);
}

function resetBattleIfEquippedUnitChanged(unitId, ctx) {
  const { state, getBattleCore, setBattleCore, refreshBattle } = ctx;
  const bc = getBattleCore();
  if (state.party.slots.includes(unitId) && bc) {
    bc.destroy();
    setBattleCore(null);
    refreshBattle?.();
  }
}

function bindEquipmentButtons(ctx) {
  const { state, save, syncHud } = ctx;
  const unit = state.units.find((u) => u.id === growthSelectedId);
  if (!unit) return;

  document.querySelectorAll('[data-equip-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.equipItem;
      const equipment = ensureEquipmentState(state);
      const item = equipment.inventory.find((eq) => eq.id === itemId);
      if (!item) return;

      Object.values(equipment.equipped).forEach((slots) => {
        if (slots?.[item.type] === item.id) delete slots[item.type];
      });
      equipment.equipped[unit.id] = equipment.equipped[unit.id] || {};
      equipment.equipped[unit.id][item.type] = item.id;
      recordQuestProgress(state, 'growth', 1);

      resetBattleIfEquippedUnitChanged(unit.id, ctx);
      save();
      syncHud();
      refreshGrowthPanel(ctx);
    });
  });

  document.querySelectorAll('[data-unequip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.unequip;
      const equipment = ensureEquipmentState(state);
      if (equipment.equipped[unit.id]) {
        delete equipment.equipped[unit.id][type];
        if (!Object.keys(equipment.equipped[unit.id]).length) delete equipment.equipped[unit.id];
        recordQuestProgress(state, 'growth', 1);
      }
      resetBattleIfEquippedUnitChanged(unit.id, ctx);
      save();
      syncHud();
      refreshGrowthPanel(ctx);
    });
  });
}

function handleGrowthAction(e, ctx) {
  const { state, save, syncHud, getBattleCore, setBattleCore, refreshBattle, refs } = ctx;
  const btn  = e.currentTarget;
  const unit = state.units.find((u) => u.id === growthSelectedId);
  if (!unit) return;

  if (btn.dataset.action === 'levelup') {
    const desired = Math.max(1, Math.floor(Number(btn.dataset.levelCount) || 1));
    const adminFreeResources = Boolean(state.adminMode);
    const batch = getLevelUpBatch(unit, adminFreeResources ? { gold: Infinity, growthStone: Infinity } : state.resources, desired);
    if (!batch.count) return;
    if (!adminFreeResources) {
      state.resources.gold = Math.max(0, (Number(state.resources.gold) || 0) - batch.gold);
      state.resources.growthStone = Math.max(0, (Number(state.resources.growthStone) || 0) - batch.growthStone);
    }
    applyLevelUpBatch(unit, batch);
    recordQuestProgress(state, 'growth', batch.count);
    save(); syncHud();
    const bc = getBattleCore();
    if (state.party.slots.includes(unit.id) && bc) { bc.destroy(); setBattleCore(null); refreshBattle?.(); }
  }

  if (btn.dataset.action === 'starup') {
    const cost = getPromotionShardCost(unit);
    const promotion = getPromotionPreview(unit);
    const canTierUp = promotion.nextTier > promotion.currentTier;
    const canLimitBreak = promotion.currentTier >= promotion.maxTier && promotion.currentMaxLevel < 100;
    if (!(canTierUp || canLimitBreak) || (!state.adminMode && !canStarUp(unit))) return;
    if (!state.adminMode) unit.shards = Math.max(0, (Number(unit.shards) || 0) - cost);
    if (canTierUp) {
      unit.tier = promotion.nextTier;
      unit.stars = promotion.nextTier;
    } else {
      unit.limitBreak = Math.min(15, Math.max(0, Math.floor(Number(unit.limitBreak) || 0)) + 1);
    }
    unit.power = Math.floor((Number(unit.power) || 0) * 1.10);
    unit.maxHp = Math.floor((Number(unit.maxHp) || 0) * 1.10);
    unit.mp = Math.floor((Number(unit.mp) || 0) * 1.06);
    unit.atk = Math.floor((Number(unit.atk) || 0) * 1.08);
    unit.mag = Math.floor((Number(unit.mag) || 0) * 1.08);
    unit.def = Math.floor((Number(unit.def) || 0) * 1.07);
    unit.spr = Math.floor((Number(unit.spr) || 0) * 1.07);
    unit.hp = unit.maxHp;
    recordQuestProgress(state, 'growth', 1);
    save(); syncHud();
    const bc = getBattleCore();
    if (state.party.slots.includes(unit.id) && bc) { bc.destroy(); setBattleCore(null); refreshBattle?.(); }
  }

  refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
  bindGrowthEvents(ctx);
  renderGrowthPanel(ctx);
}

export function bindGrowthEvents(ctx) {
  const { refs } = ctx;
  const el = refs.contentEntry;

  // 정렬 버튼
  const applyGrowthSort = (mode, dir = '') => {
    growthSortMode = mode === 'level' ? 'grade' : mode;
    if (growthSortMode === 'grade') growthSortDir = dir || (growthSortDir === 'desc' ? 'asc' : 'desc');
    refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
    renderGrowthPanel(ctx);
    bindGrowthEvents(ctx);
  };
  el.querySelector('[data-gsort-toggle]')?.addEventListener('click', () => {
    applyGrowthSort('grade', growthSortMode === 'grade' && growthSortDir === 'desc' ? 'asc' : 'desc');
  });
  el.querySelectorAll('[data-gsort]').forEach((opt) => {
    opt.addEventListener('click', () => applyGrowthSort(opt.dataset.gsort, opt.dataset.gdir || ''));
  });
  // 유닛 카드 클릭 (그리드 + 파티 행 모두)
  const grid = el.querySelector('.growth-grid');
  const partyRow = el.querySelector('.growth-party-row');
  function handleCardClick(e) {
    const card = e.target.closest('[data-gunit]');
    if (!card) return;
    const id = card.dataset.gunit;
    growthSelectedId = growthSelectedId === id ? null : id;
    if (growthSelectedId) growthTab = 'levelup';
    refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
    renderGrowthPanel(ctx);
    bindGrowthEvents(ctx);
  }
  if (grid) grid.addEventListener('click', handleCardClick);
  if (partyRow) partyRow.addEventListener('click', handleCardClick);

  el.querySelectorAll('[data-gclose]').forEach((btn) => {
    btn.addEventListener('click', () => {
      growthSelectedId = null;
      refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
      bindGrowthEvents(ctx);
    });
  });

  const modal = el.querySelector('.ginfo-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        growthSelectedId = null;
        refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
        bindGrowthEvents(ctx);
      }
    });
  }

  el.querySelectorAll('[data-gtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      growthTab = btn.dataset.gtab;
      refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
      bindGrowthEvents(ctx);
    });
  });

  const actionBtn = el.querySelector('[data-action]');
  if (actionBtn) {
    actionBtn.addEventListener('click', (e) => handleGrowthAction(e, ctx));
  }
}

export function resetGrowthTabState() {
  growthSelectedId = null;
  growthTab = 'levelup';
  growthSortMode = 'grade';
  growthSortDir = 'desc';
}
