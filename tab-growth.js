// tab-growth.js — 성장 탭 (레벨업 / 승급)
import {
  renderStars,
  formatNumber,
  resolveUnitPortrait,
  ensureEquipmentState,
  getEquippedItemsForUnit,
  getEffectiveUnitStats,
  getRarityStyle,
  getUnitBattleRole,
  getUnitJobRoles,
  renderJobTooltipAttrs,
  renderVisualVars,
} from './utils.js';
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_TYPE_ICONS,
  formatEquipmentStats,
  getEquipmentDisplayIcon,
} from './equipment-data.js';

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
let growthSortMode = 'level'; // 'level' | 'role' | 'series'

const SORT_LABELS = { level: '등급순', role: '역할순', series: '시리즈순' };
const ROLE_ORDER  = { '물리 딜러':0, '마법 딜러':1, '탱커':2, '버퍼':3, '디버퍼':4, '힐러':5 };
const SERIES_ORDER = { FF1:0,FF2:1,FF3:2,FF4:3,FF5:4,FF6:5,FF7:6,FF8:7,FF9:8,FF10:9,'C-AD':10,'C-KH':11,'C-NA':12,'C-ToM':13,'C-VF':14 };

function sortGrowthUnits(units) {
  const arr = [...units];
  if (growthSortMode === 'level') {
    arr.sort((a, b) => b.level - a.level || b.stars - a.stars);
  } else if (growthSortMode === 'role') {
    arr.sort((a, b) => (ROLE_ORDER[getUnitBattleRole(a)] ?? 99) - (ROLE_ORDER[getUnitBattleRole(b)] ?? 99) || b.level - a.level);
  } else if (growthSortMode === 'series') {
    arr.sort((a, b) => (SERIES_ORDER[a.series] ?? 99) - (SERIES_ORDER[b.series] ?? 99) || b.level - a.level);
  }
  return arr;
}

// ── 성장 공식 ──────────────────────────────────────────────
export function calcLevelUpCost(unit) {
  return Math.floor(200 + unit.level * 80 + unit.stars * 120);
}
export function calcPowerGain(unit) {
  return Math.floor((unit.power / unit.level) * 1.08);
}
export function maxLevel(unit) { return 20 + unit.stars * 5; }
export function canLevelUp(unit, gold) {
  return unit.level < maxLevel(unit) && gold >= calcLevelUpCost(unit);
}
export function canStarUp(unit) {
  if (!unit.tierFolders) return false;
  const nextTier = (unit.tier || unit.minTier) + 1;
  return !!unit.tierFolders[nextTier] && (unit.shards || 0) >= 3;
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
  return `
    <div class="unit-card2${isSelected ? ' is-selected' : ''}${isParty ? ' growth-is-party' : ''}" data-gunit="${unit.id}" style="--role-color:${roleColor};${getRarityStyle(unit)};${renderVisualVars(state, unit)}">
      <div class="unit-card2__art">
        ${renderPortraitImg(unit, 'unit-card2__sprite')}
        <span class="unit-card2__el-dot" style="background:${el.color}">${el.icon}</span>
        <div class="unit-card2__lvbar"><span style="width:${lvPct}%"></span></div>
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
        <em>LV ${unit.level} · ${jobLabel}</em>
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
        <button class="sort-btn" id="growthSortBtn" type="button">${SORT_LABELS[growthSortMode]} ▾</button>
      </div>
      <div class="growth-sort-menu" id="growthSortMenu" hidden>
        <button class="sort-opt${growthSortMode==='level'  ?' is-on':''}" data-gsort="level">등급순</button>
        <button class="sort-opt${growthSortMode==='role'   ?' is-on':''}" data-gsort="role">역할별</button>
        <button class="sort-opt${growthSortMode==='series' ?' is-on':''}" data-gsort="series">시리즈별</button>
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
  const gold = state.resources.gold;
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
  const battleRole = getUnitBattleRole(sel);
  const jobLabel = sel.job || battleRole;
  const roleLabel = getUnitJobRoles(sel).join(' · ');

  return `
    <div class="ginfo-panel" id="gInfoPanel">
      <button class="ginfo-close" data-gclose type="button">✕</button>
      <div class="ginfo__header">
        <div class="ginfo__portrait" style="--el-color:${el.color};${getRarityStyle(sel)};${renderVisualVars(state, sel)}">
          ${renderPortraitImg(sel, 'ginfo__portrait-img')}
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
          </div>
          <div class="ginfo__lv">LV ${sel.level} / ${maxLv}${sel.level >= maxLv ? ' <span class="gdetail__max-badge">MAX</span>' : ''}</div>
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
        <button class="gtab${growthTab === 'starUp' ? ' is-active' : ''}" data-gtab="starUp">승급 ▲</button>
        <button class="gtab${growthTab === 'equipment' ? ' is-active' : ''}" data-gtab="equipment">장비</button>
      </div>
      ${growthTab === 'levelup' ? `
        <div class="gdetail__action">
          <div class="gaction-preview">
            <span>전투력 ${formatNumber(effective.power)}</span>
            <span class="gaction-arrow">→</span>
            <span class="gaction-after">${sel.level < maxLv ? formatNumber(sel.power + calcPowerGain(sel) + (effective.equipmentPower || 0)) : 'MAX'}</span>
          </div>
          <div class="growth-cost">
            <span>💰 ${formatNumber(lvCost)} 골드</span>
            <span class="growth-cost__have">보유: ${formatNumber(gold)}</span>
          </div>
          <button class="growth-action-btn${canLevelUp(sel, gold) ? '' : ' is-disabled'}" data-action="levelup" ${canLevelUp(sel, gold) ? '' : 'disabled'}>
            ${sel.level >= maxLv ? '최대 레벨' : canLevelUp(sel, gold) ? '레벨업' : '골드 부족'}
          </button>
        </div>
      ` : growthTab === 'starUp' ? `
        <div class="gdetail__action">
          <div class="gaction-preview">
            <span>${renderStars(sel.stars)}</span>
            <span class="gaction-arrow">→</span>
            <span class="gaction-after">${sel.stars < 6 ? renderStars(sel.stars + 1) : 'MAX'}</span>
          </div>
          <div class="growth-cost">
            <span>🔮 조각 3개 필요</span>
            <span class="growth-cost__have">조각: ${sel.shards || 0}/3 · 현재 T${sel.tier || sel.minTier || 1} → T${(sel.tier || sel.minTier || 1)+1}</span>
          </div>
          <button class="growth-action-btn${canStarUp(sel) ? '' : ' is-disabled'}" data-action="starup" ${canStarUp(sel) ? '' : 'disabled'}>
            ${!canStarUp(sel) && sel.tierFolders && !(sel.tierFolders[(sel.tier||sel.minTier||1)+1]) ? '최대 티어' : canStarUp(sel) ? `승급 T${sel.tier||sel.minTier||1} → T${(sel.tier||sel.minTier||1)+1}` : `조각 부족 (${sel.shards||0}/3)`}
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

  overlay.querySelector('[data-gclose]')?.addEventListener('click', closePanel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });

  overlay.querySelectorAll('[data-gtab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      growthTab = btn.dataset.gtab;
      overlay.innerHTML = renderGrowthPanelHTML(sel, state);
      overlay.querySelector('[data-gclose]')?.addEventListener('click', closePanel);
      overlay.querySelectorAll('[data-gtab]').forEach((b) => {
        b.addEventListener('click', () => { growthTab = b.dataset.gtab; renderGrowthPanel(ctx); });
      });
      overlay.querySelector('[data-action]')?.addEventListener('click', (e) => handleGrowthAction(e, ctx));
      bindEquipmentButtons(ctx);
    });
  });
  overlay.querySelector('[data-action]')?.addEventListener('click', (e) => handleGrowthAction(e, ctx));
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

  if (btn.dataset.action === 'levelup' && canLevelUp(unit, state.resources.gold)) {
    state.resources.gold -= calcLevelUpCost(unit);
    const gain = calcPowerGain(unit);
    unit.level  += 1;
    unit.power  += gain;
    unit.maxHp  += gain;
    unit.hp      = Math.min(unit.hp + gain, unit.maxHp);
    save(); syncHud();
    const bc = getBattleCore();
    if (state.party.slots.includes(unit.id) && bc) { bc.destroy(); setBattleCore(null); refreshBattle?.(); }
  }

  if (btn.dataset.action === 'starup' && canStarUp(unit)) {
    unit.shards  = (unit.shards || 0) - 3;
    unit.tier    = (unit.tier || unit.minTier) + 1;
    if (unit.tier <= 2)      unit.stars = 1;
    else if (unit.tier <= 4) unit.stars = 3;
    else                     unit.stars = 5;
    unit.power  = Math.floor(unit.power * 1.35);
    unit.maxHp  = Math.floor(unit.maxHp * 1.35);
    unit.hp     = unit.maxHp;
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
  const sortBtn  = el.querySelector('#growthSortBtn');
  const sortMenu = el.querySelector('#growthSortMenu');
  if (sortBtn && sortMenu) {
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sortMenu.hidden = !sortMenu.hidden;
    });
    sortMenu.querySelectorAll('[data-gsort]').forEach((opt) => {
      opt.addEventListener('click', () => {
        growthSortMode = opt.dataset.gsort;
        sortMenu.hidden = true;
        refs.contentEntry.innerHTML = renderGrowthScreen(ctx);
        renderGrowthPanel(ctx);
        bindGrowthEvents(ctx);
      });
    });
    document.addEventListener('click', function closeGrowthSortMenu() {
      sortMenu.hidden = true;
      document.removeEventListener('click', closeGrowthSortMenu);
    });
  }

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
  growthSortMode = 'level';
}
