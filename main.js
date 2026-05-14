import { saveUserData } from './firebase.js';
import {
  SCREEN_META,
  formatNumber,
  getPartyPower,
  loadAppState,
  saveAppState,
} from './assets.js';
import { HomeBattleCore } from './battle-core.js';
import { createContext } from './app-context.js';
import { initAuth } from './auth.js';
import {
  renderUnitsScreen,
  bindUnitsEvents,
  resetUnitsTabState,
} from './tab-units.js';
import {
  renderGrowthScreen,
  bindGrowthEvents,
  renderGrowthPanel,
  resetGrowthTabState,
} from './tab-growth.js';
import {
  renderSummonScreen,
  bindSummonEvents,
  resetSummonTabState,
} from './tab-summon.js';

// ── 앱 상태 ────────────────────────────────────────────────
const state = loadAppState();
let battleCore = null;

const refs = {
  app:          document.querySelector('.app'),
  partyStage:   document.querySelector('#partyStage'),
  contentEntry: document.querySelector('#contentEntry'),
  rankValue:    document.querySelector('#rankValue'),
  goldValue:    document.querySelector('#goldValue'),
  gemValue:     document.querySelector('#gemValue'),
  ticketValue:  document.querySelector('#ticketValue'),
  partyPowerValue: document.querySelector('#partyPowerValue'),
  summonBadge: document.querySelector('.nav-item[data-screen="summon"] .nav-badge'),
  waveHint:     document.querySelector('#waveHint'),
  synergyHint:  document.querySelector('#synergyHint'),
  navItems:     [...document.querySelectorAll('.nav-item')],
};

// ── 저장 ───────────────────────────────────────────────────
function save() {
  saveAppState(state);
  if (state._currentUid) {
    saveUserData(state._currentUid, state).catch(() => {});
  }
}

// ── battleCore 접근자 (ctx에 넘기기 위해 함수로 감쌈) ──────
function getBattleCore() { return battleCore; }
function setBattleCore(bc) { battleCore = bc; }

// ── ctx 생성 ───────────────────────────────────────────────
const ctx = createContext({ state, refs, save, syncHud, getBattleCore, setBattleCore });

// ── HUD 동기화 ─────────────────────────────────────────────
function syncHud() {
  refs.rankValue.textContent  = String(state.resources.rank);
  refs.goldValue.textContent  = formatNumber(state.resources.gold);
  refs.gemValue.textContent   = formatNumber(state.resources.gems);
  const tickets = state.resources.specialTickets || 0;
  if (refs.ticketValue) refs.ticketValue.textContent = tickets;
  if (refs.partyPowerValue) refs.partyPowerValue.textContent = formatNumber(getPartyPower(state));
  if (refs.summonBadge) {
    refs.summonBadge.textContent = tickets;
    refs.summonBadge.hidden = tickets <= 0;
  }

  if (battleCore && state.currentScreen === 'home') {
    const summary = battleCore.getSummary();
    if (refs.waveHint)    refs.waveHint.textContent    = summary.waveHint;
    if (refs.synergyHint) refs.synergyHint.textContent = summary.synergyHint;
  } else {
    if (refs.waveHint)    refs.waveHint.textContent    = '';
    if (refs.synergyHint) refs.synergyHint.textContent = '';
  }
}

// ── 전투 마운트 ────────────────────────────────────────────
function mountBattle() {
  battleCore = new HomeBattleCore({
    state,
    onStateChange: () => { save(); syncHud(); },
  });
  battleCore.mount(refs.partyStage);
}

function unmountBattle() {
  if (battleCore) battleCore.unmount();
}

// ── 화면 렌더링 ────────────────────────────────────────────
export function renderScreen() {
  refs.app.dataset.screen = state.currentScreen;

  refs.navItems.forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === state.currentScreen);
  });

  if (state.currentScreen === 'home') {
    refs.partyStage.hidden = false;
    refs.contentEntry.hidden = true;
    refs.contentEntry.innerHTML = '';
    mountBattle();
  } else {
    unmountBattle();
    refs.partyStage.hidden = true;
    refs.contentEntry.hidden = false;

    // 탭 전환 시 탭별 상태 초기화
    if (state.currentScreen === 'units')  resetUnitsTabState();
    if (state.currentScreen === 'growth') resetGrowthTabState();
    if (state.currentScreen === 'summon') resetSummonTabState();

    refs.contentEntry.innerHTML = renderSubScreen(state.currentScreen);

    if (state.currentScreen === 'units')  bindUnitsEvents(ctx);
    if (state.currentScreen === 'growth') { bindGrowthEvents(ctx); }
    if (state.currentScreen === 'summon') bindSummonEvents(ctx);
  }

  syncHud();
  save();
}

function renderSubScreen(screen) {
  if (screen === 'units')  return renderUnitsScreen(ctx);
  if (screen === 'growth') return renderGrowthScreen(ctx);
  if (screen === 'summon') return renderSummonScreen(ctx);

  return `
    <section class="panel-stack">
      <article class="panel-card center-card">
        <div class="panel-title">PVP 코어 더미</div>
        <p>홈 전투 좌표계 안정화 후 그대로 재사용하는 방향이 맞다.</p>
      </article>
    </section>
  `;
}

// ── 네비게이션 ─────────────────────────────────────────────
refs.navItems.forEach((button) => {
  button.addEventListener('click', () => {
    state.currentScreen = button.dataset.screen;
    renderScreen();
  });
});

window.addEventListener('beforeunload', () => {
  battleCore?.destroy();
});

// ── Auth 초기화 (로그인 상태에 따라 renderScreen 호출) ──────
initAuth({ state, renderScreen });
