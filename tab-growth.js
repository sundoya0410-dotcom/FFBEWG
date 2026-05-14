// tab-growth.js — 성장 탭 (레벨업 / 승급)
import { renderStars, formatNumber, resolveUnitSprite } from './utils.js';

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
let growthTab = 'levelup'; // 'levelup' | 'starUp'
let growthSortMode = 'level'; // 'level' | 'role' | 'series'

const SORT_LABELS = { level: '등급순', role: '역할순', series: '시리즈순' };
const ROLE_ORDER  = { '물리 딜러':0, '마법 딜러':1, '탱커':2, '버퍼':3, '디버퍼':4, '힐러':5 };
const SERIES_ORDER = { FF1:0,FF2:1,FF3:2,FF4:3,FF5:4,FF6:5,FF7:6,FF8:7,FF9:8,FF10:9,'C-AD':10,'C-KH':11,'C-NA':12,'C-ToM':13,'C-VF':14 };

function sortGrowthUnits(units) {
  const arr = [...units];
  if (growthSortMode === 'level') {
    arr.sort((a, b) => b.level - a.level || b.stars - a.stars);
  } else if (growthSortMode === 'role') {
    arr.sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) || b.level - a.level);
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

function getIdleSprite(unit) {
  const sprites = resolveUnitSprite(unit, 'idle');
  return sprites[0] || '';
}

function makeGrowthCard(unit, isSelected, isParty = false) {
  const img = getIdleSprite(unit);
  const roleShort = { '물리 딜러':'ATK','마법 딜러':'MAG','탱커':'DEF','버퍼':'BUF','디버퍼':'DEB','힐러':'HLR' }[unit.role] || '---';
  const roleColor = { ATK:'#ff2222', MAG:'#aa44ff', DEF:'#22cc55', BUF:'#ffcc00', DEB:'#2288ff', HLR:'#ff66aa' }[roleShort] || '#4488cc';
  const element = normalizeElement(unit.element);
  const el = ELEMENT_INFO[element] || { icon: '?', color: '#aaa' };
  const maxLv = maxLevel(unit);
  const lvPct = Math.round((unit.level / maxLv) * 100);
  return `
    <div class="unit-card2${isSelected ? ' is-selected' : ''}${isParty ? ' growth-is-party' : ''}" data-gunit="${unit.id}" style="--role-color:${roleColor}">
      <div class="unit-card2__art">
        ${img ? `<img src="${img}" alt="${unit.name}" class="unit-card2__sprite" draggable="false">` : ''}
        <div class="unit-card2__glow"></div>
        <span class="unit-card2__role">${roleShort}</span>
        <span class="unit-card2__el-dot" style="background:${el.color}">${el.icon}</span>
        <div class="unit-card2__lvbar"><span style="width:${lvPct}%"></span></div>
      </div>
      <div class="unit-card2__stars">${renderStars(unit.stars)}</div>
      <div class="unit-card2__name">${unit.name}</div>
    </div>`;
}

// ── 렌더 ──────────────────────────────────────────────────
export function renderGrowthScreen(ctx) {
  const { state } = ctx;
  const allUnits = state.units;
  const sorted   = sortGrowthUnits(allUnits);
  const partyIdSet = new Set(state.party.slots.filter(Boolean));

  // 파티 슬롯 행
  const partyHtml = state.party.slots.map((id) => {
    const unit = id ? allUnits.find((u) => u.id === id) : null;
    if (!unit) return `<div class="growth-party-slot growth-party-slot--empty"><span>빈 슬롯</span></div>`;
    return `<div class="growth-party-slot" data-gunit="${unit.id}">${makeGrowthCard(unit, growthSelectedId === unit.id)}</div>`;
  }).join('');

  // 전체 유닛 그리드 — 파티원에 growth-is-party 클래스 직접 부여
  const unitGridHtml = sorted.map((unit) => {
    return makeGrowthCard(unit, growthSelectedId === unit.id, partyIdSet.has(unit.id));
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

function renderGrowthPanelHTML(sel, gold) {
  const element = normalizeElement(sel.element);
  const el = ELEMENT_INFO[element] || { icon: '?', color: '#aaa', weak: '-', resist: '-' };
  const weakEl   = ELEMENT_INFO[el.weak]   || { icon: '?', color: '#aaa' };
  const resistEl = ELEMENT_INFO[el.resist] || { icon: '?', color: '#aaa' };
  const maxLv  = maxLevel(sel);
  const lvPct  = Math.round((sel.level / maxLv) * 100);
  const lvCost = calcLevelUpCost(sel);
  const img    = getIdleSprite(sel);

  return `
    <div class="ginfo-panel" id="gInfoPanel">
      <button class="ginfo-close" data-gclose type="button">✕</button>
      <div class="ginfo__header">
        <div class="ginfo__portrait" style="--el-color:${el.color}">
          <div class="ginfo__portrait-bg" style="background:radial-gradient(circle at 50% 110%, ${el.color}55 0%, transparent 65%)"></div>
          ${img ? `<img src="${img}" class="ginfo__portrait-img" draggable="false">` : ''}
        </div>
        <div class="ginfo__title">
          <div class="ginfo__name-row">
            <span class="ginfo__name">${sel.name}</span>
            <span class="ginfo__el-badge" style="background:${el.color}22;border-color:${el.color}66;color:${el.color}">${el.icon} ${element}</span>
          </div>
          <div class="ginfo__sub-row">
            <span class="ginfo__stars">${renderStars(sel.stars)}</span>
            <span class="ginfo__role">${sel.role}</span>
          </div>
          <div class="ginfo__lv">LV ${sel.level} / ${maxLv}${sel.level >= maxLv ? ' <span class="gdetail__max-badge">MAX</span>' : ''}</div>
          <div class="ginfo__lvbar"><span style="width:${lvPct}%"></span></div>
        </div>
      </div>
      <div class="ginfo__body">
        <div class="ginfo__stats">
          <div class="gstat"><span class="gstat__label">HP</span><span class="gstat__val">${formatNumber(sel.maxHp)}</span></div>
          <div class="gstat"><span class="gstat__label">MP</span><span class="gstat__val">${sel.mp || 160}</span></div>
          <div class="gstat"><span class="gstat__label">공격</span><span class="gstat__val">${sel.atk || 80}</span></div>
          <div class="gstat"><span class="gstat__label">마력</span><span class="gstat__val">${sel.mag || 80}</span></div>
          <div class="gstat"><span class="gstat__label">방어</span><span class="gstat__val">${sel.def || 80}</span></div>
          <div class="gstat"><span class="gstat__label">정신</span><span class="gstat__val">${sel.spr || 80}</span></div>
        </div>
        <div class="ginfo__elements">
          <div class="gel-item gel-item--weak">
            <span class="gel-item__label">우위</span>
            <span class="gel-item__icon" style="background:${weakEl.color}33;border-color:${weakEl.color}66">${weakEl.icon}</span>
            <span class="gel-item__rate">×1.5</span>
          </div>
          <div class="gel-item gel-item--self">
            <span class="gel-item__label">무승부</span>
            <span class="gel-item__icon" style="background:${el.color}33;border-color:${el.color}66">${el.icon}</span>
            <span class="gel-item__rate">×0.9</span>
          </div>
          <div class="gel-item gel-item--resist">
            <span class="gel-item__label">열세</span>
            <span class="gel-item__icon" style="background:${resistEl.color}33;border-color:${resistEl.color}66">${resistEl.icon}</span>
            <span class="gel-item__rate">×0.6</span>
          </div>
        </div>
      </div>
      <div class="gdetail__tabs">
        <button class="gtab${growthTab === 'levelup' ? ' is-active' : ''}" data-gtab="levelup">레벨업</button>
        <button class="gtab${growthTab === 'starUp' ? ' is-active' : ''}" data-gtab="starUp">승급 ▲</button>
      </div>
      ${growthTab === 'levelup' ? `
        <div class="gdetail__action">
          <div class="gaction-preview">
            <span>전투력 ${formatNumber(sel.power)}</span>
            <span class="gaction-arrow">→</span>
            <span class="gaction-after">${sel.level < maxLv ? formatNumber(sel.power + calcPowerGain(sel)) : 'MAX'}</span>
          </div>
          <div class="growth-cost">
            <span>💰 ${formatNumber(lvCost)} 골드</span>
            <span class="growth-cost__have">보유: ${formatNumber(gold)}</span>
          </div>
          <button class="growth-action-btn${canLevelUp(sel, gold) ? '' : ' is-disabled'}" data-action="levelup" ${canLevelUp(sel, gold) ? '' : 'disabled'}>
            ${sel.level >= maxLv ? '최대 레벨' : canLevelUp(sel, gold) ? '레벨업' : '골드 부족'}
          </button>
        </div>
      ` : `
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
      `}
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
  overlay.innerHTML = renderGrowthPanelHTML(sel, state.resources.gold);
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
      overlay.innerHTML = renderGrowthPanelHTML(sel, state.resources.gold);
      overlay.querySelector('[data-gclose]')?.addEventListener('click', closePanel);
      overlay.querySelectorAll('[data-gtab]').forEach((b) => {
        b.addEventListener('click', () => { growthTab = b.dataset.gtab; renderGrowthPanel(ctx); });
      });
      overlay.querySelector('[data-action]')?.addEventListener('click', (e) => handleGrowthAction(e, ctx));
    });
  });
  overlay.querySelector('[data-action]')?.addEventListener('click', (e) => handleGrowthAction(e, ctx));
}

function handleGrowthAction(e, ctx) {
  const { state, save, syncHud, getBattleCore, setBattleCore, refs } = ctx;
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
    if (state.party.slots.includes(unit.id) && bc) { bc.destroy(); setBattleCore(null); }
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
    if (state.party.slots.includes(unit.id) && bc) { bc.destroy(); setBattleCore(null); }
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
  growthSortMode = 'level';
}
