// tab-units.js - party placement panel
import {
  FORMATION_ROW_ICONS,
  FORMATION_ROW_LABELS,
  formatNumber,
  getFormationRoleFit,
  getFormationRowForSlot,
  getFormationSummary,
  getPartyPower,
  getRarityStyle,
  getRoleComboSummary,
  getSynergyCatalogSummary,
  getSeriesSynergySummary,
  getUnitBattleRole,
  normalizePartyFormation,
  renderJobTooltipAttrs,
  renderStars,
  renderVisualVars,
  resolveUnitPortrait,
} from './utils.js';

let selectedSlot = -1;
let sortMode = 'level'; // 'level' | 'role' | 'series'
let synergyPanelMode = 'current'; // 'current' | 'catalog'

const SORT_LABELS = { level: '등급순', role: '역할별', series: '시리즈별' };
const ROLE_ORDER = { '물리 딜러': 0, '마법 딜러': 1, '탱커': 2, '버퍼': 3, '디버퍼': 4, '힐러': 5 };
const SERIES_ORDER = { FF1: 0, FF2: 1, FF3: 2, FF4: 3, FF5: 4, FF6: 5, FF7: 6, FF8: 7, FF9: 8, FF10: 9, 'C-AD': 10, 'C-KH': 11, 'C-NA': 12, 'C-ToM': 13, 'C-VF': 14 };

function sortUnits(units) {
  const arr = [...units];
  if (sortMode === 'level') {
    arr.sort((a, b) => b.level - a.level || b.stars - a.stars);
  } else if (sortMode === 'role') {
    arr.sort((a, b) => (ROLE_ORDER[getUnitBattleRole(a)] ?? 99) - (ROLE_ORDER[getUnitBattleRole(b)] ?? 99) || b.level - a.level);
  } else if (sortMode === 'series') {
    arr.sort((a, b) => (SERIES_ORDER[a.series] ?? 99) - (SERIES_ORDER[b.series] ?? 99) || b.level - a.level);
  }
  return arr;
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

function getRoleShort(role) {
  return {
    '물리 딜러': '⚔',
    '마법 딜러': '🔮',
    '탱커': '🛡',
    '버퍼': '✨',
    '디버퍼': '🩸',
    '힐러': '💚',
  }[role] || '•';
}

function getRoleColor(roleShort) {
  return { '⚔': '#ff4444', '🔮': '#aa66ff', '🛡': '#28d970', '✨': '#ffcc33', '🩸': '#3399ff', '💚': '#ff66aa' }[roleShort] || '#4488cc';
}

function makePreviewState(state, slotIndex, unitId) {
  const slots = [...(state.party?.slots || [])];
  const existingSlot = slots.indexOf(unitId);
  if (existingSlot >= 0) {
    slots[existingSlot] = slots[slotIndex] || null;
  }
  slots[slotIndex] = unitId;
  return {
    ...state,
    party: {
      ...state.party,
      slots,
    },
  };
}

function formatPowerDelta(value) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded > 0) return `+${formatNumber(rounded)}`;
  if (rounded < 0) return `-${formatNumber(Math.abs(rounded))}`;
  return '±0';
}

function buildPreviewTags(current, preview) {
  const tags = [];
  if (preview.series.series !== current.series.series || preview.series.bonus !== current.series.bonus) {
    const arrow = preview.series.bonus > current.series.bonus ? '↑' : preview.series.bonus < current.series.bonus ? '↓' : '';
    tags.push(`시리즈${arrow} ${preview.series.bonus > 0 ? `${preview.series.series} +${preview.series.bonus}%` : preview.series.label}`);
  }
  if (preview.combo.bonus !== current.combo.bonus || preview.combo.label !== current.combo.label) {
    const arrow = preview.combo.bonus > current.combo.bonus ? '↑' : preview.combo.bonus < current.combo.bonus ? '↓' : '';
    tags.push(`조합${arrow} ${preview.combo.bonus > 0 ? `+${preview.combo.bonus}%` : preview.combo.label}`);
  }
  return tags.slice(0, 2);
}

function getUnitPreviewImpact(state, unit, slotIndex, current) {
  if (slotIndex < 0 || !unit) return null;
  if (state.party?.slots?.[slotIndex] === unit.id) return null;

  const previewState = makePreviewState(state, slotIndex, unit.id);
  const preview = {
    power: getPartyPower(previewState),
    series: getSeriesSynergySummary(previewState),
    combo: getRoleComboSummary(previewState),
  };
  const deltaPower = preview.power - current.power;
  const tags = buildPreviewTags(current, preview);
  const tone = deltaPower > 0 ? 'up' : deltaPower < 0 ? 'down' : tags.length ? 'neutral' : 'same';
  return {
    tone,
    deltaPower,
    tags,
  };
}

function makeRowButton(slotIdx, row) {
  return `
    <button class="unit-card2__row unit-card2__row--${row}" data-row="${slotIdx}" type="button" title="${FORMATION_ROW_LABELS[row]}">
      <span>${FORMATION_ROW_ICONS[row]}</span>
      <strong>${FORMATION_ROW_LABELS[row]}</strong>
    </button>
  `;
}

function makeUnitOrb(unit, {
  inParty = false,
  slotIdx = -1,
  isSelected = false,
  isSelectable = false,
  formationRow = null,
  formationFit = null,
  previewImpact = null,
  state = null,
} = {}) {
  const battleRole = getUnitBattleRole(unit);
  const roleShort = getRoleShort(battleRole);
  const roleColor = getRoleColor(roleShort);
  const jobLabel = unit.job || battleRole;
  const dataAttr = slotIdx >= 0 ? `data-slot="${slotIdx}"` : `data-unit="${unit.id}"`;
  const classes = [
    'unit-card2',
    inParty ? 'unit-card2--party' : '',
    isSelected ? 'is-selected' : '',
    isSelectable ? 'is-selectable' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" ${dataAttr} style="--role-color:${roleColor};${getRarityStyle(unit)};${renderVisualVars(state, unit)}">
      <div class="unit-card2__art">
        ${renderPortraitImg(unit, 'unit-card2__sprite')}
        ${slotIdx >= 0 ? '<span class="unit-card2__badge">파티</span>' : ''}
        ${slotIdx >= 0 ? `<button class="unit-card2__remove" data-remove="${slotIdx}" type="button" title="제외">×</button>` : ''}
        ${slotIdx >= 0 && formationRow ? makeRowButton(slotIdx, formationRow) : ''}
        ${formationFit ? `<span class="unit-card2__fit unit-card2__fit--${formationFit.tone}">${formationFit.label}</span>` : ''}
        ${isSelected ? '<div class="unit-card2__sel"></div>' : ''}
      </div>
      <div class="unit-card2__stars">${renderStars(unit.stars)}</div>
      <div class="unit-card2__name">${unit.name}</div>
      <div class="unit-card2__job job-tip-host" ${renderJobTooltipAttrs(unit)}>${jobLabel}</div>
      ${previewImpact ? `
        <div class="unit-card2__preview unit-card2__preview--${previewImpact.tone}">
          <strong>${formatPowerDelta(previewImpact.deltaPower)}</strong>
          ${previewImpact.tags.length ? `<span>${previewImpact.tags.join(' · ')}</span>` : '<span>전투력 변화</span>'}
        </div>
      ` : ''}
    </div>`;
}

function makeEmptyOrb(slotIdx, isSelected, formationRow) {
  return `
    <div class="unit-card2 unit-card2--empty${isSelected ? ' is-selected' : ''}" data-slot="${slotIdx}">
      <div class="unit-card2__art unit-card2__art--empty">
        ${makeRowButton(slotIdx, formationRow)}
        ${isSelected ? '<div class="unit-card2__sel"></div>' : ''}
      </div>
      <div class="unit-card2__name" style="opacity:0.35">빈 슬롯</div>
    </div>`;
}

function makeFormationCell({ unit, slotIdx, row, active, isSelected, state }) {
  if (!active) {
    return `
      <button class="formation-cell formation-cell--ghost" data-row-set="${slotIdx}:${row}" type="button">
        <span>${slotIdx + 1}</span>
      </button>
    `;
  }

  if (!unit) {
    return `
      <div class="formation-cell formation-cell--empty${isSelected ? ' is-selected' : ''}" data-slot="${slotIdx}">
        <div class="formation-cell__head">
          <span>${slotIdx + 1}번</span>
        </div>
        <div class="formation-cell__empty">빈 슬롯</div>
      </div>
    `;
  }

  const battleRole = getUnitBattleRole(unit);
  const roleShort = getRoleShort(battleRole);
  const roleColor = getRoleColor(roleShort);
  const jobLabel = unit.job || battleRole;
  const fit = getFormationRoleFit(unit, row);

  return `
    <div class="formation-cell formation-cell--filled formation-cell--${fit.tone}${isSelected ? ' is-selected' : ''}" data-slot="${slotIdx}" style="--role-color:${roleColor};${getRarityStyle(unit)};${renderVisualVars(state, unit)}">
      <div class="formation-cell__head">
        <span>${slotIdx + 1}번</span>
        <button class="formation-cell__remove" data-remove="${slotIdx}" type="button" title="제외">×</button>
      </div>
      <div class="formation-cell__name">${unit.name}</div>
      <div class="formation-cell__job job-tip-host" ${renderJobTooltipAttrs(unit)}>${jobLabel}</div>
      <div class="formation-cell__bottom">
        <span class="formation-cell__fit formation-cell__fit--${fit.tone}">${fit.label}</span>
      </div>
    </div>
  `;
}

function renderFormationBoard(state, allUnits) {
  const lanes = state.party.slots.map((_, index) => `<span>${index + 1}번</span>`).join('');
  const rows = ['back', 'front'].map((row) => {
    const cells = state.party.slots.map((id, slotIdx) => {
      const unit = id ? allUnits.find((u) => u.id === id) : null;
      const active = getFormationRowForSlot(state, slotIdx) === row;
      return makeFormationCell({ unit, slotIdx, row, active, isSelected: selectedSlot === slotIdx, state });
    }).join('');

    return `
      <div class="formation-row formation-row--${row}">
        <div class="formation-row__label">
          <strong>${FORMATION_ROW_ICONS[row]} ${FORMATION_ROW_LABELS[row]}</strong>
        </div>
        ${cells}
      </div>
    `;
  }).join('');

  return `
    <div class="formation-board" id="partySlots">
      <div class="formation-lanes"><span></span>${lanes}</div>
      ${rows}
    </div>
  `;
}

function renderCatalogItem(item) {
  const partyRatio = Math.round(Math.max(0, Math.min(1, item.partyCurrent / Math.max(1, item.partyTotal))) * 100);
  const ownedRatio = Math.round(Math.max(0, Math.min(1, item.ownedCurrent / Math.max(1, item.ownedTotal))) * 100);
  const status = item.active
    ? '발동중'
    : item.partyCurrent > 0
      ? `${item.partyTotal - item.partyCurrent}명 배치 필요`
      : '미발동';

  return `
    <div class="synergy-catalog-card${item.active ? ' is-active' : ''}">
      <div class="synergy-catalog-card__top">
        <div>
          <span>${item.groupLabel}</span>
          <strong>${item.label}</strong>
        </div>
        <em>${status}</em>
      </div>
      <p>${item.condition}</p>
      <div class="synergy-catalog-card__meta">
        <span>파티 ${item.partyCurrent}/${item.partyTotal}</span>
        <span>보유 ${item.ownedCurrent}/${item.ownedTotal}</span>
        <strong>+${item.bonus}%</strong>
      </div>
      <div class="synergy-catalog-card__bars">
        <i style="--progress:${partyRatio}%"></i>
        <b style="--progress:${ownedRatio}%"></b>
      </div>
    </div>
  `;
}

function renderSynergyCatalog(state) {
  const catalog = getSynergyCatalogSummary(state);
  const active = catalog.active.slice(0, 6);
  const close = catalog.all
    .filter((item) => !item.active && item.ownedCurrent > 0)
    .slice(0, 14);
  const locked = catalog.all
    .filter((item) => !item.active && item.ownedCurrent <= 0)
    .slice(0, 8);

  const renderSection = (title, items, emptyText) => `
    <div class="synergy-catalog-section">
      <div class="synergy-catalog-section__title">
        <span>${title}</span>
        <strong>${items.length}</strong>
      </div>
      ${items.length ? items.map(renderCatalogItem).join('') : `<div class="deck-bonus-empty">${emptyText}</div>`}
    </div>
  `;

  return `
    <div class="synergy-catalog">
      ${renderSection('발동중', active, '발동 중인 시너지가 없습니다')}
      ${renderSection('맞추기 쉬움', close, '보유 유닛으로 맞출 수 있는 후보가 없습니다')}
      ${renderSection('미보유 목표', locked, '미보유 목표가 없습니다')}
    </div>
  `;
}

function renderDeckSynergyPanel(state, formationSummary, seriesSummary, roleCombo) {
  const groups = [
    ['job', '직업 조합'],
    ['sameJob', '같은 직업'],
    ['bond', '원작 인연'],
  ];
  const renderGroupRows = (items) => items.map((combo) => `
      <div class="deck-bonus-row">
        <span>${combo.label}</span>
        <strong>+${combo.bonus}%</strong>
      </div>
    `).join('');
  const comboHtml = groups.map(([group, label]) => {
    const items = (roleCombo.active || []).filter((combo) => combo.group === group);
    return `
      <div class="deck-combo-group deck-combo-group--${group}">
        <div class="deck-combo-title">
          <span>${label}</span>
          <strong>${items.length ? `+${items.reduce((sum, combo) => sum + combo.bonus, 0)}%` : '-'}</strong>
        </div>
        ${items.length ? renderGroupRows(items) : '<div class="deck-bonus-empty">발동 없음</div>'}
      </div>
    `;
  }).join('');

  return `
    <div class="deck-synergy-panel">
      <div class="deck-synergy-head">
        <div class="deck-synergy-tabs">
          <button class="${synergyPanelMode === 'current' ? 'is-on' : ''}" data-synergy-panel="current" type="button">현재 효과</button>
          <button class="${synergyPanelMode === 'catalog' ? 'is-on' : ''}" data-synergy-panel="catalog" type="button">시너지 도감</button>
        </div>
        <strong>${seriesSummary.bonus + roleCombo.bonus}%</strong>
      </div>
      ${synergyPanelMode === 'catalog' ? renderSynergyCatalog(state) : `
        <div class="deck-bonus-grid">
          <div class="deck-bonus-card deck-bonus-card--${seriesSummary.tone}">
            <span>시리즈</span>
            <strong>${seriesSummary.bonus > 0 ? `${seriesSummary.series} ${seriesSummary.label}` : seriesSummary.label}</strong>
            <em>전투력 +${seriesSummary.bonus}% · 스탯 +${Math.round((seriesSummary.statMultiplier - 1) * 100)}%</em>
          </div>
          <div class="deck-bonus-card deck-bonus-card--${formationSummary.tone}">
            <span>배치</span>
            <strong>${formationSummary.label}</strong>
            <em>전열/후열 효율 ${formationSummary.bonus >= 0 ? '+' : ''}${formationSummary.bonus}%</em>
          </div>
        </div>
        <div class="deck-combo-list">
          ${comboHtml}
        </div>
      `}
    </div>
  `;
}

export function renderUnitsScreen(ctx) {
  const { state } = ctx;
  state.party.formation = normalizePartyFormation(state.party.formation);
  const allUnits = state.units;
  const sorted = sortUnits(allUnits);
  const partyIds = new Set(state.party.slots.filter(Boolean));
  const partyPower = getPartyPower(state);
  const formationSummary = getFormationSummary(state);
  const seriesSummary = getSeriesSynergySummary(state);
  const roleCombo = getRoleComboSummary(state);
  const previewBase = {
    power: partyPower,
    series: seriesSummary,
    combo: roleCombo,
  };

  const formationBoard = renderFormationBoard(state, allUnits);
  const synergyPanel = renderDeckSynergyPanel(state, formationSummary, seriesSummary, roleCombo);

  const allHtml = sorted.map((unit) => {
    const inParty = partyIds.has(unit.id);
    const isSelectable = selectedSlot >= 0;
    const previewImpact = isSelectable ? getUnitPreviewImpact(state, unit, selectedSlot, previewBase) : null;
    return makeUnitOrb(unit, { inParty, slotIdx: -1, isSelectable: isSelectable && !inParty, previewImpact, state });
  }).join('');

  return `
    <section class="units-screen">
      <div class="units-workbench">
        <div class="units-builder-pane">
          <div class="units-topbar">
            <div class="units-topbar__main">
              <span class="units-topbar__title">배치</span>
              <span class="units-topbar__hint">${selectedSlot >= 0 ? '배치할 유닛을 선택하세요' : '전열 · 후열'}</span>
            </div>
            <div class="units-topbar__stats">
              <div class="units-topbar__power">
                <span>전투력</span>
                <strong>${formatNumber(partyPower)}</strong>
              </div>
              <div class="units-topbar__power units-topbar__power--formation units-topbar__power--${formationSummary.tone}">
                <span>효율</span>
                <strong>${formationSummary.label} ${formationSummary.bonus >= 0 ? '+' : ''}${formationSummary.bonus}%</strong>
              </div>
              <div class="units-topbar__power units-topbar__power--series units-topbar__power--${seriesSummary.tone}">
                <span>시리즈</span>
                <strong>${seriesSummary.bonus > 0 ? `${seriesSummary.series} ${seriesSummary.label} +${seriesSummary.bonus}%` : seriesSummary.label}</strong>
              </div>
              <div class="units-topbar__power units-topbar__power--combo units-topbar__power--${roleCombo.tone}">
                <span>조합</span>
                <strong>${roleCombo.bonus > 0 ? `${roleCombo.label} +${roleCombo.bonus}%` : roleCombo.label}</strong>
              </div>
            </div>
          </div>
          ${formationBoard}
          ${synergyPanel}
        </div>
        <div class="units-roster-pane">
          <div class="units-divider">
            <span>보유 유닛 (${allUnits.length})${selectedSlot >= 0 ? ` · ${selectedSlot + 1}번 슬롯 후보` : ''}</span>
            <button class="sort-btn" id="sortBtn" type="button">${SORT_LABELS[sortMode]}⌄</button>
          </div>
          <div class="units-sort-menu" id="sortMenu" hidden>
            <button class="sort-opt${sortMode === 'level' ? ' is-on' : ''}" data-sort="level">등급순</button>
            <button class="sort-opt${sortMode === 'role' ? ' is-on' : ''}" data-sort="role">역할별</button>
            <button class="sort-opt${sortMode === 'series' ? ' is-on' : ''}" data-sort="series">시리즈별</button>
          </div>
          <div class="units-grid" id="reserveList">${allHtml}</div>
        </div>
      </div>
    </section>
  `;
}

export function bindUnitsEvents(ctx) {
  const { state, refs, save, syncHud, getBattleCore, setBattleCore, refreshBattle } = ctx;
  const el = refs.contentEntry;

  function applyPartyChange() {
    save();
    const bc = getBattleCore();
    if (bc) {
      bc.destroy();
      setBattleCore(null);
    }
    refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
    bindUnitsEvents(ctx);
    refreshBattle?.();
    syncHud();
  }

  const sortBtn = el.querySelector('#sortBtn');
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

  el.querySelectorAll('[data-synergy-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      synergyPanelMode = button.dataset.synergyPanel;
      refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
      bindUnitsEvents(ctx);
    });
  });

  el.querySelectorAll('[data-row]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slotIndex = Number(btn.dataset.row);
      const formation = normalizePartyFormation(state.party.formation);
      formation[slotIndex] = formation[slotIndex] === 'front' ? 'back' : 'front';
      state.party.formation = formation;
      applyPartyChange();
    });
  });

  el.querySelectorAll('[data-row-set]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [slotRaw, row] = btn.dataset.rowSet.split(':');
      const slotIndex = Number(slotRaw);
      const formation = normalizePartyFormation(state.party.formation);
      formation[slotIndex] = row;
      state.party.formation = formation;
      applyPartyChange();
    });
  });

  el.querySelectorAll('[data-slot]').forEach((node) => {
    node.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove], [data-row]')) return;
      const i = Number(node.dataset.slot);
      selectedSlot = selectedSlot === i ? -1 : i;
      refs.contentEntry.innerHTML = renderUnitsScreen(ctx);
      bindUnitsEvents(ctx);
    });
  });

  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = Number(btn.dataset.remove);
      state.party.slots[i] = null;
      selectedSlot = -1;
      applyPartyChange();
    });
  });

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
