import { FULL_UNIT_LIBRARY } from './unit-data.js';
import { formatNumber, renderStars, resolveUnitPortrait, ensureEquipmentState, renderVisualVars, saveAppState } from './utils.js';
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_RARITIES,
  createEquipmentDrop,
  formatEquipmentStats,
  getEquipmentDisplayIcon,
} from './equipment-data.js';

const NORMAL_WEIGHTS = { 1: 69.5, 3: 30, 5: 0.5 };
const RARE_WEIGHTS = { 3: 90, 5: 10 };

export const SUMMON_COST = {
  normal_single: 50,
  normal_multi: 450,
  rare_single: 150,
  rare_multi: 1350,
};

const EQUIPMENT_SUMMON_COST = {
  single: 150,
  multi: 1350,
};

const SUMMON_ACTION_META = {
  normal_1: { label: '일반 1회', cost: SUMMON_COST.normal_single },
  normal_10: { label: '일반 10회', cost: SUMMON_COST.normal_multi },
  rare_1: { label: '레어 1회', cost: SUMMON_COST.rare_single },
  rare_10: { label: '레어 10회', cost: SUMMON_COST.rare_multi },
  equipment_1: { label: '장비 1회', cost: EQUIPMENT_SUMMON_COST.single },
  equipment_10: { label: '장비 10회', cost: EQUIPMENT_SUMMON_COST.multi },
};

const UNIT_POOL = FULL_UNIT_LIBRARY;

let smnView = 'unit';
let smnResults = null;
let smnResultType = '';
let smnRepeatAction = '';

function getPortraitSources(unit) {
  return resolveUnitPortrait(unit).filter(Boolean);
}

function renderPortraitImg(state, unit, className = '') {
  const sources = getPortraitSources(unit);
  const src = sources[0] || '';
  const fallback = sources[1] || '';
  if (!src) return '';
  const fallbackAttr = fallback ? ` data-fallback="${fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback"` : ' onerror="this.style.display=\'none\'"';
  return `<img class="${className}" src="${src}" alt="${unit.name}" style="${renderVisualVars(state, unit)}"${fallbackAttr} draggable="false">`;
}

function pickByWeight(weightMap) {
  const total = Object.values(weightMap).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of Object.entries(weightMap)) {
    roll -= weight;
    if (roll <= 0) return Number(key);
  }
  return Number(Object.keys(weightMap)[0]);
}

function pickUnit(state, weights) {
  const stars = pickByWeight(weights);
  const pool = UNIT_POOL.filter((unit) => unit.stars === stars);
  const picked = pool[Math.floor(Math.random() * pool.length)] || UNIT_POOL[0];
  const owned = state.units.find((unit) => unit.folderKey === picked.folderKey);
  const isDup = !!owned;

  if (owned) {
    owned.shards = (owned.shards || 0) + 1;
  } else {
    state.units.push({
      ...picked,
      tier: picked.minTier,
      level: 1,
      shards: 0,
      hp: picked.maxHp,
    });
  }

  return { ...picked, isDup };
}

async function doUnitSummon(state, save, syncHud, type, count) {
  const costKey = `${type}_${count === 1 ? 'single' : 'multi'}`;
  const cost = SUMMON_COST[costKey];
  if (state.resources.gems < cost) return null;

  const previousGems = state.resources.gems;
  const previousUnits = state.units.map((unit) => ({ ...unit }));
  state.resources.gems -= cost;
  const weights = type === 'normal' ? NORMAL_WEIGHTS : RARE_WEIGHTS;
  const results = Array.from({ length: count }, () => pickUnit(state, weights));

  const saveResult = await save({ silent: false });
  if (!saveResult.cloud) {
    state.resources.gems = previousGems;
    state.units = previousUnits;
    saveAppState(state);
    syncHud();
    return null;
  }
  syncHud();
  return results;
}

async function doEquipmentSummon(state, save, syncHud, count) {
  const cost = count === 10 ? EQUIPMENT_SUMMON_COST.multi : EQUIPMENT_SUMMON_COST.single;
  if (state.resources.gems < cost) return null;

  const previousGems = state.resources.gems;
  const previousInventory = [...(state.equipment?.inventory || [])];
  state.resources.gems -= cost;
  const equipment = ensureEquipmentState(state);
  const results = Array.from({ length: count }, () => createEquipmentDrop());
  equipment.inventory.push(...results);

  const saveResult = await save({ silent: false });
  if (!saveResult.cloud) {
    state.resources.gems = previousGems;
    equipment.inventory = previousInventory;
    saveAppState(state);
    syncHud();
    return null;
  }
  syncHud();
  return results;
}

function renderRatePills(weights) {
  return Object.entries(weights)
    .map(([stars, rate]) => `
      <span class="smn-rate-pill smn-rate-pill--star${stars}">
        <b>${renderStars(Number(stars))}</b>
        <em>${rate}%</em>
      </span>
    `).join('');
}

function renderEquipmentRatePills() {
  return EQUIPMENT_RARITIES.map((rarity) => `
    <span class="smn-rate-pill" style="--rate-color:${rarity.color}">
      <b>${rarity.label}</b>
      <em>${rarity.weight}%</em>
    </span>
  `).join('');
}

function renderRepeatSummonButton(state, hidden = false) {
  const meta = SUMMON_ACTION_META[smnRepeatAction];
  if (!meta) return '';
  const canBuy = state.resources.gems >= meta.cost;
  return `
    <button class="smn-repeat-btn ${canBuy ? '' : 'is-disabled'}" id="smnRepeatBtn" data-smn="${smnRepeatAction}" ${canBuy ? '' : 'disabled'} ${hidden ? 'hidden' : ''} type="button">
      <span>연속 ${meta.label}</span>
      <strong>다이아 ${formatNumber(meta.cost)}</strong>
    </button>
  `;
}

function renderSummonButton(label, cost, action, gems) {
  const canBuy = gems >= cost;
  return `
    <button class="smn-btn ${canBuy ? '' : 'is-disabled'}" data-smn="${action}" ${canBuy ? '' : 'disabled'} type="button">
      <span>${label}</span>
      <strong>다이아 ${formatNumber(cost)}</strong>
    </button>
  `;
}

export function renderSummonScreen(ctx) {
  const state = ctx.state;
  const equipment = ensureEquipmentState(state);
  const view = smnView === 'equipment' || smnView === 'item' ? 'equipment' : 'unit';
  const resultOverlay = renderResultOverlay(state);

  return `
    <section class="smn-screen smn-shell">
      ${resultOverlay}
      <div class="smn-head">
        <div class="smn-title-block">
          <span class="smn-kicker">SUMMON</span>
          <h2>소환</h2>
        </div>
        <div class="smn-currency-row">
          <div class="smn-currency">
            <span>다이아</span>
            <strong>${formatNumber(state.resources.gems)}</strong>
          </div>
          <div class="smn-currency">
            <span>${view === 'unit' ? '보유 유닛' : '보유 장비'}</span>
            <strong>${view === 'unit' ? state.units.length : equipment.inventory.length}</strong>
          </div>
        </div>
      </div>

      <div class="smn-tabs" role="tablist">
        <button class="smn-tab ${view === 'unit' ? 'is-active' : ''}" data-smngo="unit" type="button">유닛 소환</button>
        <button class="smn-tab ${view === 'equipment' ? 'is-active' : ''}" data-smngo="equipment" type="button">장비 소환</button>
      </div>

      ${view === 'unit' ? renderUnitSummonView(state) : renderEquipmentSummonView(state, equipment)}
    </section>
  `;
}

function renderResultOverlay(state) {
  if (!smnResults) return '';
  if (smnResultType === 'unit') {
    return `
      <div class="smn-overlay" id="smnOverlay">
        <div class="smn-crystal-stage" id="smnStage"></div>
        <div class="smn-result-actions">
          <button class="smn-reveal-all-btn" id="smnToggleBtn" type="button">열기</button>
          ${renderRepeatSummonButton(state, true)}
        </div>
      </div>
    `;
  }

  if (smnResultType === 'equipment') {
    const isMulti = smnResults.length > 1;
    return `
      <div class="smn-overlay smn-overlay--equipment">
        <div class="smn-overlay__title">장비 획득</div>
        <div class="smn-item-results ${isMulti ? 'smn-item-results--multi' : ''}">
          ${smnResults.map((item) => `
            <div class="smn-item-card" style="--item-color:${item.color}">
              <div class="smn-item-card__rarity">${item.rarity}</div>
              <div class="smn-item-card__icon">${getEquipmentDisplayIcon(item)}</div>
              <div class="smn-item-card__name">${item.name}</div>
              <div class="smn-item-card__type">${item.kind || EQUIPMENT_TYPE_LABELS[item.type] || item.type}</div>
              <div class="smn-item-card__stats">${formatEquipmentStats(item.stats)}</div>
              <div class="smn-item-card__power">전투력 +${formatNumber(item.power)}</div>
            </div>
          `).join('')}
        </div>
        <div class="smn-result-actions">
          <button class="smn-reveal-all-btn" data-smn="close" type="button">확인</button>
          ${renderRepeatSummonButton(state)}
        </div>
      </div>
    `;
  }

  return '';
}

function renderUnitSummonView(state) {
  const gems = state.resources.gems;
  const tickets = state.resources.specialTickets || 0;

  return `
    <div class="smn-layout">
      <div class="smn-banner-list">
        <div class="smn-banner-card smn-banner-card--normal">
          <div class="smn-banner-card__head">
            <div>
              <div class="smn-banner-card__title">일반 소환</div>
              <div class="smn-banner-card__sub">1성부터 5성까지 등장</div>
            </div>
            <div class="smn-banner-card__tag">BASIC</div>
          </div>
          <div class="smn-banner-card__rates">${renderRatePills(NORMAL_WEIGHTS)}</div>
          <div class="smn-banner-card__btns">
            ${renderSummonButton('1회', SUMMON_COST.normal_single, 'normal_1', gems)}
            ${renderSummonButton('10회', SUMMON_COST.normal_multi, 'normal_10', gems)}
          </div>
        </div>

        <div class="smn-banner-card smn-banner-card--rare">
          <div class="smn-banner-card__head">
            <div>
              <div class="smn-banner-card__title">레어 소환</div>
              <div class="smn-banner-card__sub">3성 이상 확정, 5성 확률 증가</div>
            </div>
            <div class="smn-banner-card__tag">RARE</div>
          </div>
          <div class="smn-banner-card__rates">${renderRatePills(RARE_WEIGHTS)}</div>
          <div class="smn-banner-card__btns">
            ${renderSummonButton('1회', SUMMON_COST.rare_single, 'rare_1', gems)}
            ${renderSummonButton('10회', SUMMON_COST.rare_multi, 'rare_10', gems)}
          </div>
        </div>
      </div>

      <aside class="smn-side-panel">
        <div class="smn-side-panel__title">소환 재화</div>
        <div class="smn-side-stat">
          <span>다이아</span>
          <strong>${formatNumber(gems)}</strong>
        </div>
        <div class="smn-side-stat smn-side-stat--muted">
          <span>특수 티켓</span>
          <strong>${formatNumber(tickets)}</strong>
          <em>PVP</em>
        </div>
        <div class="smn-side-note">특수 티켓 소환은 PVP 콘텐츠로 이동 예정</div>
      </aside>
    </div>
  `;
}

function renderEquipmentSummonView(state, equipment) {
  const gems = state.resources.gems;
  const inventory = [...(equipment.inventory || [])]
    .sort((a, b) => (b.rarityRank || 0) - (a.rarityRank || 0) || (b.power || 0) - (a.power || 0));
  const equippedIds = new Set(Object.values(equipment.equipped || {}).flatMap((slots) => Object.values(slots || {})));

  return `
    <div class="smn-layout smn-layout--equipment">
      <div class="smn-banner-list">
        <div class="smn-banner-card smn-banner-card--item">
          <div class="smn-banner-card__head">
            <div>
              <div class="smn-banner-card__title">장비 소환</div>
              <div class="smn-banner-card__sub">무기, 방어구, 장신구가 무작위로 등장</div>
            </div>
            <div class="smn-banner-card__tag">GEAR</div>
          </div>
          <div class="smn-banner-card__rates">${renderEquipmentRatePills()}</div>
          <div class="smn-banner-card__btns">
            ${renderSummonButton('1회', EQUIPMENT_SUMMON_COST.single, 'equipment_1', gems)}
            ${renderSummonButton('10회', EQUIPMENT_SUMMON_COST.multi, 'equipment_10', gems)}
          </div>
        </div>
      </div>

      <div class="smn-equipment-box">
        <div class="smn-equipment-box__header">
          <span>보유 장비</span>
          <strong>${inventory.length}</strong>
        </div>
        <div class="smn-equipment-list">
          ${inventory.length ? inventory.slice(0, 30).map((item) => `
            <div class="smn-equipment-row${equippedIds.has(item.id) ? ' is-equipped' : ''}">
              <div class="smn-equipment-row__icon" style="border-color:${item.color};color:${item.color}">
                ${getEquipmentDisplayIcon(item)}
              </div>
              <div class="smn-equipment-row__main">
                <div class="smn-equipment-row__name" style="color:${item.color}">${item.name}</div>
                <div class="smn-equipment-row__meta">${item.kind || EQUIPMENT_TYPE_LABELS[item.type] || item.type} · ${formatEquipmentStats(item.stats)}</div>
              </div>
              <div class="smn-equipment-row__power">+${formatNumber(item.power)}</div>
            </div>
          `).join('') : '<div class="smn-equipment-empty">장비 없음</div>'}
        </div>
      </div>
    </div>
  `;
}

export function bindSummonEvents(ctx) {
  const { state, refs, save, syncHud } = ctx;
  const el = refs.contentEntry;
  if (el._smnHandler) el.removeEventListener('click', el._smnHandler);

  el._smnHandler = async (e) => {
    const btn = e.target.closest('[data-smngo],[data-smn]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    if (btn.dataset.smngo) {
      smnView = btn.dataset.smngo;
      smnResults = null;
      smnResultType = '';
      smnRepeatAction = '';
      refs.contentEntry.innerHTML = renderSummonScreen(ctx);
      bindSummonEvents(ctx);
      return;
    }

    const action = btn.dataset.smn;
    let repeatAction = '';
    if (action === 'close') {
      smnResults = null;
      smnResultType = '';
      smnRepeatAction = '';
    } else if (action === 'normal_1') {
      smnResults = await doUnitSummon(state, save, syncHud, 'normal', 1);
      smnResultType = 'unit';
      repeatAction = action;
    } else if (action === 'normal_10') {
      smnResults = await doUnitSummon(state, save, syncHud, 'normal', 10);
      smnResultType = 'unit';
      repeatAction = action;
    } else if (action === 'rare_1') {
      smnResults = await doUnitSummon(state, save, syncHud, 'rare', 1);
      smnResultType = 'unit';
      repeatAction = action;
    } else if (action === 'rare_10') {
      smnResults = await doUnitSummon(state, save, syncHud, 'rare', 10);
      smnResultType = 'unit';
      repeatAction = action;
    } else if (action === 'equipment_1') {
      smnResults = await doEquipmentSummon(state, save, syncHud, 1);
      smnResultType = 'equipment';
      repeatAction = action;
    } else if (action === 'equipment_10') {
      smnResults = await doEquipmentSummon(state, save, syncHud, 10);
      smnResultType = 'equipment';
      repeatAction = action;
    }

    if (!smnResults && action !== 'close') {
      refs.contentEntry.innerHTML = renderSummonScreen(ctx);
      bindSummonEvents(ctx);
      return;
    }

    if (smnResults && repeatAction) smnRepeatAction = repeatAction;
    refs.contentEntry.innerHTML = renderSummonScreen(ctx);
    bindSummonEvents(ctx);
    if (smnResults && smnResultType === 'unit') initCrystalStage(smnResults, ctx);
  };

  el.addEventListener('click', el._smnHandler);
}

export function resetSummonTabState() {
  smnView = 'unit';
  smnResults = null;
  smnResultType = '';
  smnRepeatAction = '';
}

function initCrystalStage(results, ctx) {
  const { refs } = ctx;
  const stage = document.getElementById('smnStage');
  if (!stage) return;

  const colors = {
    1: { glow: '#3db8ff', bg: '#0a2a5e' },
    3: { glow: '#ff5555', bg: '#5e0a0a' },
    5: { glow: '#ffd86a', bg: '#5e4200' },
  };
  const isSingle = results.length === 1;

  stage.className = `smn-crystal-stage${isSingle ? ' smn-crystal-stage--single' : ''}`;
  stage.innerHTML = results.map((result, index) => {
    const color = colors[result.stars] || colors[1];
    return `
      <div class="smn-crystal" data-idx="${index}" style="--glow:${color.glow};--bg:${color.bg};animation-delay:${index * 0.06}s">
        <div class="smn-crystal__inner">
          <div class="smn-crystal__shine"></div>
          <div class="smn-crystal__star">${renderStars(result.stars)}</div>
        </div>
      </div>
    `;
  }).join('');

  function spawnParticles(el, color) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `position:fixed;pointer-events:none;z-index:300;width:6px;height:6px;border-radius:50%;background:${color};left:${cx}px;top:${cy}px;transform:translate(-50%,-50%)`;
      document.body.appendChild(particle);
      const angle = ((Math.PI * 2) / 10) * i;
      const dist = 30 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      particle.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 },
      ], { duration: 400, easing: 'ease-out' }).onfinish = () => particle.remove();
    }
  }

  function breakCrystal(crystal) {
    if (crystal.classList.contains('is-broken')) return;
    const index = parseInt(crystal.dataset.idx, 10);
    const result = results[index];
    const color = colors[result.stars] || colors[1];

    crystal.classList.add('is-broken');
    crystal.innerHTML = `
      <div class="smn-crystal__break" style="--glow:${color.glow}">
        <div class="smn-crystal__shards"></div>
        ${renderPortraitImg(ctx.state, result, 'smn-crystal__unit-img') || `<div class="smn-crystal__unit-text">${result.name}</div>`}
        <div class="smn-crystal__info">
          <div class="smn-crystal__stars" style="color:${color.glow}">${renderStars(result.stars)}</div>
          <div class="smn-crystal__name">${result.name}</div>
          ${result.isDup ? '<div class="smn-crystal__new">조각 +1</div>' : '<div class="smn-crystal__new">NEW</div>'}
        </div>
      </div>
    `;
    spawnParticles(crystal, color.glow);
    syncOpenState();
  }

  stage.addEventListener('click', (e) => {
    const crystal = e.target.closest('.smn-crystal:not(.is-broken)');
    if (crystal) breakCrystal(crystal);
  });

  const btn = document.getElementById('smnToggleBtn');
  const repeatBtn = document.getElementById('smnRepeatBtn');
  if (!btn) return;

  let allOpen = false;
  function syncOpenState() {
    allOpen = !stage.querySelector('.smn-crystal:not(.is-broken)');
    if (!allOpen) return;
    btn.textContent = '닫기';
    if (repeatBtn) repeatBtn.hidden = false;
  }

  btn.onclick = () => {
    if (!allOpen) {
      stage.querySelectorAll('.smn-crystal:not(.is-broken)').forEach((crystal) => breakCrystal(crystal));
      syncOpenState();
      return;
    }

    smnResults = null;
    smnResultType = '';
    smnRepeatAction = '';
    refs.contentEntry.innerHTML = renderSummonScreen(ctx);
    bindSummonEvents(ctx);
  };
}
