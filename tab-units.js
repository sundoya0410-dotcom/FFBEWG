// tab-units.js — 유닛 탭 (파티 편성)
import { formatNumber, getPartyPower, renderStars, resolveUnitSprite } from './utils.js';

let selectedSlot = -1;
let sortMode = 'level'; // 'level' | 'role' | 'series'

const SORT_LABELS = { level: '등급순', role: '역할순', series: '시리즈순' };
const SORT_NEXT   = { level: 'role', role: 'series', series: 'level' };

const ROLE_ORDER = { '물리 딜러':0, '마법 딜러':1, '탱커':2, '버퍼':3, '디버퍼':4, '힐러':5 };
const SERIES_ORDER = { FF1:0,FF2:1,FF3:2,FF4:3,FF5:4,FF6:5,FF7:6,FF8:7,FF9:8,FF10:9,'C-AD':10,'C-KH':11,'C-NA':12,'C-ToM':13,'C-VF':14 };

function sortUnits(units) {
  const arr = [...units];
  if (sortMode === 'level') {
    arr.sort((a, b) => b.level - a.level || b.stars - a.stars);
  } else if (sortMode === 'role') {
    arr.sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) || b.level - a.level);
  } else if (sortMode === 'series') {
    arr.sort((a, b) => (SERIES_ORDER[a.series] ?? 99) - (SERIES_ORDER[b.series] ?? 99) || b.level - a.level);
  }
  return arr;
}

function getIdleSprite(unit) {
  const sprites = resolveUnitSprite(unit, 'idle');
  return sprites[0] || '';
}

function makeUnitOrb(unit, { inParty = false, slotIdx = -1, isSelected = false, isSelectable = false } = {}) {
  const img = getIdleSprite(unit);
  const roleShort = { '물리 딜러':'ATK','마법 딜러':'MAG','탱커':'DEF','버퍼':'BUF','디버퍼':'DEB','힐러':'HLR' }[unit.role] || '---';
  const roleColor = { ATK:'#ff2222', MAG:'#aa44ff', DEF:'#22cc55', BUF:'#ffcc00', DEB:'#2288ff', HLR:'#ff66aa' }[roleShort] || '#4488cc';
  const dataAttr = slotIdx >= 0 ? `data-slot="${slotIdx}"` : `data-unit="${unit.id}"`;
  const classes = [
    'unit-card2',
    inParty ? 'unit-card2--party' : '',
    isSelected ? 'is-selected' : '',
    isSelectable ? 'is-selectable' : '',
    !isSelectable && !inParty ? 'is-dim' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" ${dataAttr} style="--role-color:${roleColor}">
      <div class="unit-card2__art">
        ${img ? `<img src="${img}" alt="${unit.name}" class="unit-card2__sprite" draggable="false">` : ''}
        <div class="unit-card2__glow"></div>
        <span class="unit-card2__role">${roleShort}</span>
        ${slotIdx >= 0 ? `<span class="unit-card2__badge">파티</span>` : ''}
        ${slotIdx >= 0 ? `<button class="unit-card2__remove" data-remove="${slotIdx}" type="button">✕</button>` : ''}
        ${isSelected ? '<div class="unit-card2__sel"></div>' : ''}
      </div>
      <div class="unit-card2__stars">${renderStars(unit.stars)}</div>
      <div class="unit-card2__name">${unit.name}</div>
    </div>`;
}

function makeEmptyOrb(slotIdx, isSelected) {
  return `
    <div class="unit-card2 unit-card2--empty${isSelected ? ' is-selected' : ''}" data-slot="${slotIdx}">
      <div class="unit-card2__art unit-card2__art--empty">
        ${isSelected ? '<div class="unit-card2__sel"></div>' : ''}
      </div>
      <div class="unit-card2__name" style="opacity:0.35">빈 슬롯</div>
    </div>`;
}

export function renderUnitsScreen(ctx) {
  const { state } = ctx;
  const allUnits = state.units;
  const sorted   = sortUnits(allUnits);
  const partyIds = new Set(state.party.slots.filter(Boolean));
  const partyPower = getPartyPower(state);

  const slotHtml = state.party.slots.map((id, i) => {
    const unit = id ? allUnits.find((u) => u.id === id) : null;
    const isSelected = selectedSlot === i;
    if (!unit) return makeEmptyOrb(i, isSelected);
    return makeUnitOrb(unit, { inParty: true, slotIdx: i, isSelected });
  }).join('');

  const allHtml = sorted.map((unit) => {
    const inParty = partyIds.has(unit.id);
    const isSelectable = selectedSlot >= 0;
    return makeUnitOrb(unit, { inParty, slotIdx: -1, isSelectable: isSelectable && !inParty });
  }).join('');

  return `
    <section class="units-screen">
      <div class="units-topbar">
        <div class="units-topbar__main">
          <span class="units-topbar__title">파티 편성</span>
          <span class="units-topbar__hint">${selectedSlot >= 0 ? '배치할 유닛을 선택하세요' : '슬롯을 눌러 편성 변경'}</span>
        </div>
        <div class="units-topbar__power">
          <span>전투력</span>
          <strong>${formatNumber(partyPower)}</strong>
        </div>
      </div>
      <div class="units-party-row" id="partySlots">${slotHtml}</div>
      <div class="units-divider">
        <span>보유 유닛 (${allUnits.length})</span>
        <button class="sort-btn" id="sortBtn" type="button">${SORT_LABELS[sortMode]} ▾</button>
      </div>
      <div class="units-sort-menu" id="sortMenu" hidden>
        <button class="sort-opt${sortMode==='level'  ?' is-on':''}" data-sort="level">등급순</button>
        <button class="sort-opt${sortMode==='role'   ?' is-on':''}" data-sort="role">역할별</button>
        <button class="sort-opt${sortMode==='series' ?' is-on':''}" data-sort="series">시리즈별</button>
      </div>
      <div class="units-grid" id="reserveList">${allHtml}</div>
    </section>
  `;
}

export function bindUnitsEvents(ctx) {
  const { state, refs, save, syncHud, getBattleCore, setBattleCore } = ctx;
  const el = refs.contentEntry;

  function applyPartyChange() {
    save();
    const bc = getBattleCore();
    if (bc) { bc.destroy(); setBattleCore(null); }
    refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
    bindUnitsEvents(ctx);
    syncHud();
  }

  // 정렬 버튼
  const sortBtn  = el.querySelector('#sortBtn');
  const sortMenu = el.querySelector('#sortMenu');
  if (sortBtn && sortMenu) {
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sortMenu.hidden = !sortMenu.hidden;
    });
    sortMenu.querySelectorAll('[data-sort]').forEach((opt) => {
      opt.addEventListener('click', () => {
        sortMode = opt.dataset.sort;
        sortMenu.hidden = true;
        refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
        bindUnitsEvents(ctx);
      });
    });
    document.addEventListener('click', function closeSortMenu() {
      sortMenu.hidden = true;
      document.removeEventListener('click', closeSortMenu);
    });
  }

  // 슬롯 클릭 — 선택
  el.querySelectorAll('[data-slot]').forEach((node) => {
    node.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove]')) return;
      const i = Number(node.dataset.slot);
      selectedSlot = selectedSlot === i ? -1 : i;
      refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
      bindUnitsEvents(ctx);
    });
  });

  // 제거 버튼
  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(btn.dataset.remove);
      state.party.slots[i] = null;
      selectedSlot = -1;
      applyPartyChange();
    });
  });

  // 예비 유닛 클릭 — 선택된 슬롯에 배치
  el.querySelectorAll('[data-unit]').forEach((node) => {
    node.addEventListener('click', () => {
      if (selectedSlot < 0) return;
      const unitId = node.dataset.unit;
      const existingSlot = state.party.slots.indexOf(unitId);
      if (existingSlot >= 0) {
        state.party.slots[existingSlot] = state.party.slots[selectedSlot];
      }
      state.party.slots[selectedSlot] = unitId;
      selectedSlot = -1;
      applyPartyChange();
    });
  });
}

export function resetUnitsTabState() {
  selectedSlot = -1;
}
