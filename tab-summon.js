// tab-summon.js — 소환 탭
import { FULL_UNIT_LIBRARY } from './unit-data.js';
import { formatNumber, resolveUnitSprite } from './utils.js';

// ── 소환 상수 ──────────────────────────────────────────────
const NORMAL_WEIGHTS  = { 1:67, 3:32, 5:1 };
const RARE_WEIGHTS    = { 3:80, 5:20 };
const SPECIAL_WEIGHTS = { 5:100 };

export const SUMMON_COST = {
  normal_single:  50,  normal_multi:  450,
  rare_single:   150,  rare_multi:   1350,
};

const ITEM_RARITY = [
  { label:'일반', color:'#94a3b8', weight:55 },
  { label:'레어', color:'#60a5fa', weight:30 },
  { label:'에픽', color:'#c084fc', weight:12 },
  { label:'레전', color:'#ffd86a', weight:3  },
];

const ITEM_POOL = {
  weapon:    ['목검','철검','미스릴 소드','전설의 블레이드','루인블레이드'],
  armor:     ['가죽 갑옷','사슬 갑옷','미스릴 아머','빛의 갑옷','신화 갑옷'],
  accessory: ['반지','목걸이','마력 팔찌','수호의 반지','전설의 목걸이'],
};

// 소환 풀 — FULL_UNIT_LIBRARY에서 자동 구성
const UNIT_POOL = FULL_UNIT_LIBRARY;

// ── 탭 내부 상태 ────────────────────────────────────────────
let smnView       = 'main';
let smnResults    = null;
let smnResultType = '';

// ── 유틸 ───────────────────────────────────────────────────
function getIdleSprite(unit) {
  const sprites = resolveUnitSprite(unit, 'idle');
  return sprites[0] || '';
}

function pickByWeight(weightMap) {
  const total = Object.values(weightMap).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(weightMap)) {
    r -= w;
    if (r <= 0) return Number(k);
  }
  return Number(Object.keys(weightMap)[0]);
}

function pickUnit(state, weights) {
  const stars  = pickByWeight(weights);
  const pool   = UNIT_POOL.filter(u => u.stars === stars);
  const picked = pool[Math.floor(Math.random() * pool.length)] || UNIT_POOL[0];

  const owned = state.units.find(u => u.folderKey === picked.folderKey);
  const isDup = !!owned;

  if (owned) {
    owned.shards = (owned.shards || 0) + 1;
  } else {
    state.units.push({
      ...picked,
      tier:   picked.minTier,
      level:  1,
      shards: 0,
      hp:     picked.maxHp,
    });
  }
  return { ...picked, isDup };
}

function pickItem() {
  const rarityTotal = ITEM_RARITY.reduce((a, b) => a + b.weight, 0);
  let r      = Math.random() * rarityTotal;
  let rarity = ITEM_RARITY[0];
  for (const ir of ITEM_RARITY) { r -= ir.weight; if (r <= 0) { rarity = ir; break; } }
  const types = ['weapon', 'armor', 'accessory'];
  const type  = types[Math.floor(Math.random() * types.length)];
  const name  = ITEM_POOL[type][Math.floor(Math.random() * ITEM_POOL[type].length)];
  return { name, type, rarity: rarity.label, color: rarity.color };
}

// ── 소환 실행 ──────────────────────────────────────────────
function doUnitSummon(state, save, syncHud, type, count) {
  const costKey = `${type}_${count === 1 ? 'single' : 'multi'}`;
  if (type === 'special') {
    if ((state.resources.specialTickets || 0) < 1) return null;
    state.resources.specialTickets = (state.resources.specialTickets || 0) - 1;
  } else {
    if (state.resources.gems < SUMMON_COST[costKey]) return null;
    state.resources.gems -= SUMMON_COST[costKey];
  }
  const weights = type === 'normal' ? NORMAL_WEIGHTS : type === 'rare' ? RARE_WEIGHTS : SPECIAL_WEIGHTS;
  const results = [];
  for (let i = 0; i < count; i++) results.push(pickUnit(state, weights));
  save(); syncHud();
  return results;
}

function doItemSummon(state, save, syncHud) {
  if (state.resources.gems < 100) return null;
  state.resources.gems -= 100;
  const results = [pickItem(), pickItem(), pickItem()];
  save(); syncHud();
  return results;
}

// ── 렌더 ──────────────────────────────────────────────────
export function renderSummonScreen(ctx) {
  if (smnView === 'unit') return renderUnitSummonView(ctx.state);
  if (smnView === 'item') return renderItemSummonView(ctx.state);
  return renderSummonMain(ctx.state);
}

function renderSummonMain(state) {
  return `
    <section class="smn-screen smn-main">
      <div class="smn-main__title">소 환</div>
      <div class="smn-main__gem">💎 ${formatNumber(state.resources.gems)} 젬</div>
      <div class="smn-main__btns">
        <button class="smn-main-btn smn-main-btn--unit" data-smngo="unit">
          <span class="smn-main-btn__icon">⚔</span>
          <span class="smn-main-btn__label">유닛 소환</span>
          <span class="smn-main-btn__sub">일반 · 레어 · 특수</span>
        </button>
        <button class="smn-main-btn smn-main-btn--item" data-smngo="item">
          <span class="smn-main-btn__icon">🗡</span>
          <span class="smn-main-btn__label">장비 소환</span>
          <span class="smn-main-btn__sub">무기 · 방어구 · 악세 3종</span>
        </button>
      </div>
    </section>`;
}

function renderUnitSummonView(state) {
  const gems    = state.resources.gems;
  const tickets = state.resources.specialTickets || 0;

  const resultOverlay = smnResults && smnResultType === 'unit' ? `
    <div class="smn-overlay" id="smnOverlay">
      <div class="smn-crystal-stage" id="smnStage">
        <!-- 수정들이 JS로 주입됨 -->
      </div>
      <button class="smn-reveal-all-btn" id="smnToggleBtn">열기</button>
    </div>` : '';

  return `
    <section class="smn-screen">
      ${resultOverlay}
      <button class="smn-back-btn" data-smngo="main">← 소환 메인</button>
      <div class="smn-gem-bar">💎 <strong>${formatNumber(gems)}</strong> 젬 &nbsp;·&nbsp; 🎫 특수티켓 <strong>${tickets}</strong>장</div>

      <div class="smn-banner-card smn-banner-card--normal">
        <div class="smn-banner-card__title">일반 소환</div>
        <div class="smn-banner-card__rates">
          <span style="color:#94a3b8">★1 <em>67%</em></span>
          <span style="color:#60a5fa">★3 <em>32%</em></span>
          <span style="color:#ffd86a">★5 <em>1%</em></span>
        </div>
        <div class="smn-banner-card__btns">
          <button class="smn-btn ${gems>=SUMMON_COST.normal_single?'':'is-disabled'}" data-smn="normal_1" ${gems>=SUMMON_COST.normal_single?'':'disabled'}>
            ×1 &nbsp; 💎${SUMMON_COST.normal_single}
          </button>
          <button class="smn-btn ${gems>=SUMMON_COST.normal_multi?'':'is-disabled'}" data-smn="normal_10" ${gems>=SUMMON_COST.normal_multi?'':'disabled'}>
            ×10 &nbsp; 💎${SUMMON_COST.normal_multi}
          </button>
        </div>
      </div>

      <div class="smn-banner-card smn-banner-card--rare">
        <div class="smn-banner-card__title">레어 소환</div>
        <div class="smn-banner-card__rates">
          <span style="color:#60a5fa">★3 <em>80%</em></span>
          <span style="color:#ffd86a">★5 <em>20%</em></span>
        </div>
        <div class="smn-banner-card__btns">
          <button class="smn-btn ${gems>=SUMMON_COST.rare_single?'':'is-disabled'}" data-smn="rare_1" ${gems>=SUMMON_COST.rare_single?'':'disabled'}>
            ×1 &nbsp; 💎${SUMMON_COST.rare_single}
          </button>
          <button class="smn-btn ${gems>=SUMMON_COST.rare_multi?'':'is-disabled'}" data-smn="rare_10" ${gems>=SUMMON_COST.rare_multi?'':'disabled'}>
            ×10 &nbsp; 💎${SUMMON_COST.rare_multi}
          </button>
        </div>
      </div>

      <div class="smn-banner-card smn-banner-card--special">
        <div class="smn-banner-card__title">특수 소환</div>
        <div class="smn-banner-card__rates">
          <span style="color:#ffd86a">★5 <em>100%</em></span>
        </div>
        <div class="smn-banner-card__btns">
          <button class="smn-btn ${tickets>=1?'':'is-disabled'}" data-smn="special_1" ${tickets>=1?'':'disabled'}>
            ×1 &nbsp; 🎫티켓 1장
          </button>
        </div>
      </div>
    </section>`;
}

function renderItemSummonView(state) {
  const gems      = state.resources.gems;
  const canSummon = gems >= 100;

  const resultOverlay = smnResults && smnResultType === 'item' ? `
    <div class="smn-overlay">
      <div class="smn-overlay__title">장비 획득</div>
      <div class="smn-item-results">
        ${smnResults.map(r => `
          <div class="smn-item-card">
            <div class="smn-item-card__rarity" style="color:${r.color}">${r.rarity}</div>
            <div class="smn-item-card__icon">${r.type==='weapon'?'⚔':r.type==='armor'?'🛡':'💍'}</div>
            <div class="smn-item-card__name" style="color:${r.color}">${r.name}</div>
            <div class="smn-item-card__type">${r.type==='weapon'?'무기':r.type==='armor'?'방어구':'악세서리'}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  return `
    <section class="smn-screen">
      ${resultOverlay}
      <button class="smn-back-btn" data-smngo="main">← 소환 메인</button>
      <div class="smn-gem-bar">💎 <strong>${formatNumber(gems)}</strong> 젬</div>

      <div class="smn-banner-card smn-banner-card--item">
        <div class="smn-banner-card__title">장비 소환</div>
        <div class="smn-banner-card__sub">무기 · 방어구 · 악세서리 각 1개</div>
        <div class="smn-banner-card__rates">
          <span style="color:#94a3b8">일반 <em>55%</em></span>
          <span style="color:#60a5fa">레어 <em>30%</em></span>
          <span style="color:#c084fc">에픽 <em>12%</em></span>
          <span style="color:#ffd86a">레전 <em>3%</em></span>
        </div>
        <div class="smn-banner-card__btns">
          <button class="smn-btn smn-btn--wide ${canSummon?'':'is-disabled'}" data-smn="item_3" ${canSummon?'':'disabled'}>
            ×3 소환 &nbsp; 💎100
          </button>
        </div>
      </div>

      <div class="smn-item-dummy">
        <div class="smn-item-dummy__title">🗡 보유 장비 (더미)</div>
        <p class="smn-item-dummy__note">장비 시스템은 추후 구현 예정입니다.<br>소환으로 획득한 장비는 여기에 표시됩니다.</p>
      </div>
    </section>`;
}

// ── 이벤트 바인딩 ──────────────────────────────────────────
export function bindSummonEvents(ctx) {
  const { state, refs, save, syncHud } = ctx;
  const el = refs.contentEntry;
  if (el._smnHandler) el.removeEventListener('click', el._smnHandler);

  el._smnHandler = (e) => {
    const btn = e.target.closest('[data-smngo],[data-smn]');
    if (!btn || btn.disabled) return;

    if (btn.dataset.smngo) {
      smnView = btn.dataset.smngo;
      smnResults = null;
      refs.contentEntry.innerHTML = renderSummonScreen(ctx);
      bindSummonEvents(ctx);
      return;
    }

    const act = btn.dataset.smn;
    if (act === 'close') {
      smnResults = null;
    } else if (act === 'normal_1')  { smnResults = doUnitSummon(state, save, syncHud, 'normal',  1);  smnResultType = 'unit'; }
    else if (act === 'normal_10')   { smnResults = doUnitSummon(state, save, syncHud, 'normal',  10); smnResultType = 'unit'; }
    else if (act === 'rare_1')      { smnResults = doUnitSummon(state, save, syncHud, 'rare',    1);  smnResultType = 'unit'; }
    else if (act === 'rare_10')     { smnResults = doUnitSummon(state, save, syncHud, 'rare',    10); smnResultType = 'unit'; }
    else if (act === 'special_1')   { smnResults = doUnitSummon(state, save, syncHud, 'special', 1);  smnResultType = 'unit'; }
    else if (act === 'item_3')      { smnResults = doItemSummon(state, save, syncHud);                smnResultType = 'item'; }

    refs.contentEntry.innerHTML = renderSummonScreen(ctx);
    bindSummonEvents(ctx);
    if (smnResults && smnResultType === 'unit') initCrystalStage(smnResults, ctx);
  };
  el.addEventListener('click', el._smnHandler);
}

export function resetSummonTabState() {
  smnView       = 'main';
  smnResults    = null;
  smnResultType = '';
}

// ── 수정 깨기 연출 ─────────────────────────────────────────
function initCrystalStage(results, ctx) {
  const { refs } = ctx;
  const stage  = document.getElementById('smnStage');
  const reveal = document.getElementById('smnReveal');
  if (!stage) return;
  if (reveal) reveal.style.display = 'none';

  const CC = {
    1: { glow:'#3db8ff', bg:'#0a2a5e' },
    3: { glow:'#ff5555', bg:'#5e0a0a' },
    5: { glow:'#ffd86a', bg:'#5e4200' },
  };
  const isSingle = results.length === 1;

  stage.className = 'smn-crystal-stage' + (isSingle ? ' smn-crystal-stage--single' : '');
  stage.innerHTML = results.map((r, i) => {
    const cc = CC[r.stars] || CC[1];
    return '<div class="smn-crystal" data-idx="' + i + '" style="--glow:' + cc.glow + ';--bg:' + cc.bg + ';animation-delay:' + (i*0.06) + 's">'
      + '<div class="smn-crystal__inner">'
      + '<div class="smn-crystal__shine"></div>'
      + '<div class="smn-crystal__star">' + '★'.repeat(r.stars) + '</div>'
      + '</div></div>';
  }).join('');

  function spawnParticles(el, color) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;pointer-events:none;z-index:300;width:6px;height:6px;border-radius:50%;background:' + color
        + ';left:' + cx + 'px;top:' + cy + 'px;transform:translate(-50%,-50%)';
      document.body.appendChild(p);
      const angle = (Math.PI * 2 / 10) * i;
      const dist  = 30 + Math.random() * 40;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;
      p.animate([
        { transform:'translate(-50%,-50%) scale(1)', opacity:1 },
        { transform:'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px)) scale(0)', opacity:0 },
      ], { duration: 400, easing:'ease-out' }).onfinish = () => p.remove();
    }
  }

  function breakCrystal(crystal) {
    if (crystal.classList.contains('is-broken')) return;
    const idx = parseInt(crystal.dataset.idx);
    const r   = results[idx];
    const cc  = CC[r.stars] || CC[1];
    const img = getIdleSprite(r);

    crystal.classList.add('is-broken');
    crystal.innerHTML = '<div class="smn-crystal__break" style="--glow:' + cc.glow + '">'
      + '<div class="smn-crystal__shards"></div>'
      + (img
          ? '<img class="smn-crystal__unit-img" src="' + img + '" onerror="this.style.display=\'none\'">'
          : '<div class="smn-crystal__unit-text">' + r.name + '</div>')
      + '<div class="smn-crystal__info">'
      + '<div class="smn-crystal__stars" style="color:' + cc.glow + '">' + '★'.repeat(r.stars) + '</div>'
      + '<div class="smn-crystal__name">' + r.name + '</div>'
      + (r.isDup ? '' : '<div class="smn-crystal__new">NEW!</div>')
      + '</div></div>';
    spawnParticles(crystal, cc.glow);
  }

  stage.addEventListener('click', (e) => {
    const crystal = e.target.closest('.smn-crystal:not(.is-broken)');
    if (crystal) breakCrystal(crystal);
  });

  const btn = document.getElementById('smnToggleBtn');
  if (!btn) return;
  let allOpen = false;
  btn.onclick = () => {
    if (!allOpen) {
      stage.querySelectorAll('.smn-crystal:not(.is-broken)').forEach(cr => breakCrystal(cr));
      btn.textContent = '닫기';
      allOpen = true;
    } else {
      smnResults = null;
      refs.contentEntry.innerHTML = renderSummonScreen(ctx);
      bindSummonEvents(ctx);
    }
  };
}
