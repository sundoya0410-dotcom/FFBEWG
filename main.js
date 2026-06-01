import { saveUserData } from './firebase.js';
import {
  FULL_UNIT_LIBRARY,
  GROUND_DATA,
  formatNumber,
  getEffectivePartyUnits,
  getGroundRewardInfo,
  getGroundStageState,
  getGroundUnlockRequirement,
  isGroundUnlocked,
  getPartyPower,
  getRarityStyle,
  getRoleComboSummary,
  getUnitVisualProfile,
  getVisualKey,
  applyVisualProfileToPromotionLine,
  claimQuestReward,
  formatQuestReward,
  getQuestSummary,
  getUnitBattleRole,
  getUnitJobDisplayLabels,
  getUnitJobRoles,
  getUnitCommonPassive,
  renderJobTooltipAttrs,
  renderRoleTooltipAttrs,
  VISUAL_LIMITS,
  fromVisualControlValue,
  loadAppState,
  renderStars,
  renderVisualVars,
  resetUnitVisualProfile,
  saveAppState,
  setUnitVisualProfileValue,
  toVisualControlValue,
  resolveUnitPortrait,
  resolveUnitImageSprite,
  resolveUnitSprite,
} from './assets.js';
import { HomeBattleCore } from './battle-core.js';
import { describeLimitBurst } from './limit-data.js';
import { createContext } from './app-context.js';
import { initAuth } from './auth.js';
import {
  bindUnitsEvents,
  renderUnitsScreen,
  resetUnitsTabState,
} from './tab-units.js';
import {
  bindGrowthEvents,
  renderGrowthScreen,
  resetGrowthTabState,
} from './tab-growth.js';
import {
  bindSummonEvents,
  renderSummonScreen,
  resetSummonTabState,
} from './tab-summon.js';

const state = loadAppState();
let battleCore = null;
let lastPanelScreen = null;
let collectionFilter = 'all';
let collectionSortMode = 'starsDesc';
let collectionSelectedKey = null;
let visualCloudSaveTimer = null;
let saveStatusTimer = null;
let saveRunId = 0;
let questBoardScrollTop = 0;
let battleLogScrollTop = 0;

const ADMIN_EMAIL = 'sundoya0410@gmail.com';
const desktopQuery = window.matchMedia('(min-width: 900px)');

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

const NAV_LABELS = {
  mobile: {
    home: { icon: '⌂', label: '홈' },
    units: { icon: '⚔', label: '유닛' },
    collection: { icon: '◆', label: '도감' },
    growth: { icon: '⬆', label: '성장' },
    summon: { icon: '✦', label: '소환' },
    pvp: { icon: '🏆', label: 'PVP' },
  },
  desktop: {
    home: { icon: 'ⓘ', label: '메인' },
    units: { icon: '⇆', label: '배치' },
    collection: { icon: '◆', label: '도감' },
    growth: { icon: '⬆', label: '성장' },
    summon: { icon: '✦', label: '소환' },
    pvp: { icon: '🏆', label: 'PVP' },
  },
};

const refs = {
  app: document.querySelector('.app'),
  partyStage: document.querySelector('#partyStage'),
  contentEntry: document.querySelector('#contentEntry'),
  rankValue: document.querySelector('#rankValue'),
  goldValue: document.querySelector('#goldValue'),
  gemValue: document.querySelector('#gemValue'),
  ticketValue: document.querySelector('#ticketValue'),
  partyPowerValue: document.querySelector('#partyPowerValue'),
  saveStatus: document.querySelector('#saveStatus'),
  saveStatusText: document.querySelector('#saveStatusText'),
  adminMenuBtn: document.querySelector('#adminMenuBtn'),
  summonBadge: document.querySelector('.nav-item[data-screen="summon"] .nav-badge'),
  homeBadge: document.querySelector('.nav-item[data-screen="home"] .nav-badge'),
  waveHint: document.querySelector('#waveHint'),
  synergyHint: document.querySelector('#synergyHint'),
  navItems: [...document.querySelectorAll('.nav-item')],
};

function setSaveStatus(status, text, autoIdle = false) {
  if (!refs.saveStatus || !refs.saveStatusText) return;
  if (saveStatusTimer) {
    window.clearTimeout(saveStatusTimer);
    saveStatusTimer = null;
  }
  refs.saveStatus.className = `save-status save-status--${status}`;
  refs.saveStatusText.textContent = text;
  if (autoIdle) {
    saveStatusTimer = window.setTimeout(() => {
      refs.saveStatus.className = 'save-status save-status--idle';
      refs.saveStatusText.textContent = '저장 대기';
      saveStatusTimer = null;
    }, 2600);
  }
}

async function save(options = {}) {
  const { silent = true, showStatus = true } = options;
  const persisted = saveAppState(state);
  const runId = ++saveRunId;
  if (showStatus) setSaveStatus('saving', '저장중');

  if (!state._currentUid) {
    if (showStatus && runId === saveRunId) setSaveStatus('saved', '로컬 저장됨', true);
    return { local: true, cloud: false, offline: true, savedAt: persisted._savedAt };
  }

  try {
    await saveUserData(state._currentUid, persisted);
    if (showStatus && runId === saveRunId) setSaveStatus('saved', '서버 저장됨', true);
    return { local: true, cloud: true, savedAt: persisted._savedAt };
  } catch (error) {
    console.warn('[FFBEWG] cloud save failed:', error);
    if (showStatus && runId === saveRunId) setSaveStatus('error', '저장 실패');
    if (!silent) alert(`서버 저장 실패: ${error.message || error}`);
    return { local: true, cloud: false, error };
  }
}

function scheduleSave(delay = 500) {
  if (visualCloudSaveTimer) window.clearTimeout(visualCloudSaveTimer);
  visualCloudSaveTimer = window.setTimeout(() => {
    visualCloudSaveTimer = null;
    save({ silent: true, showStatus: true });
  }, delay);
}

function getBattleCore() {
  return battleCore;
}

function setBattleCore(bc) {
  battleCore = bc;
}

function isDesktopLayout() {
  return desktopQuery.matches;
}

function canUseAdminMode() {
  return normalizeEmail(state._currentEmail) === ADMIN_EMAIL;
}

function initJobTooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = 'job-floating-tip';
  document.body.appendChild(tooltip);
  let activeTarget = null;

  const positionTooltip = (event) => {
    if (!activeTarget) return;
    const pointerX = Number.isFinite(event?.clientX) ? event.clientX : activeTarget.getBoundingClientRect().left;
    const pointerY = Number.isFinite(event?.clientY) ? event.clientY : activeTarget.getBoundingClientRect().top;
    const margin = 12;
    tooltip.style.left = `${Math.min(window.innerWidth - margin, Math.max(margin, pointerX))}px`;
    tooltip.style.top = `${Math.min(window.innerHeight - margin, Math.max(margin, pointerY))}px`;
  };

  const showTooltip = (target, event) => {
    const text = target?.dataset?.jobTip;
    if (!text) return;
    activeTarget = target;
    tooltip.textContent = text;
    tooltip.classList.add('is-visible');
    positionTooltip(event);
  };

  const hideTooltip = () => {
    activeTarget = null;
    tooltip.classList.remove('is-visible');
  };

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest?.('[data-job-tip]');
    if (target) showTooltip(target, event);
  });
  document.addEventListener('pointermove', positionTooltip);
  document.addEventListener('pointerout', (event) => {
    if (!activeTarget) return;
    if (!event.relatedTarget || !activeTarget.contains(event.relatedTarget)) hideTooltip();
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target.closest?.('[data-job-tip]');
    if (target) showTooltip(target, null);
  });
  document.addEventListener('focusout', (event) => {
    if (activeTarget && activeTarget === event.target) hideTooltip();
  });
}


function refreshInfoPanel() {
  if (refs.contentEntry.hidden || lastPanelScreen !== 'quest') return;
  const questBoard = refs.contentEntry.querySelector('.quest-board');
  const battleLogList = refs.contentEntry.querySelector('.battle-log-list');
  if (questBoard) questBoardScrollTop = questBoard.scrollTop;
  if (battleLogList) battleLogScrollTop = battleLogList.scrollTop;

  refs.contentEntry.innerHTML = renderInfoScreen();
  bindInfoEvents();

  const nextQuestBoard = refs.contentEntry.querySelector('.quest-board');
  const nextBattleLogList = refs.contentEntry.querySelector('.battle-log-list');
  if (nextQuestBoard) nextQuestBoard.scrollTop = questBoardScrollTop;
  if (nextBattleLogList && battleLogScrollTop > 0) nextBattleLogList.scrollTop = battleLogScrollTop;
}
function mountBattle() {
  if (!battleCore || battleCore.destroyed) {
    battleCore = new HomeBattleCore({
      state,
      onStateChange: () => {
        save({ silent: true, showStatus: false });
        syncHud();
        refreshInfoPanel();
      },
    });
  }

  if (battleCore.root === refs.partyStage) return;
  try {
    battleCore.mount(refs.partyStage);
  } catch (error) {
    console.error(error);
    refs.partyStage.innerHTML = `<div class="battle-mount-error"><strong>Battle mount error</strong><span>${error?.message || error}</span></div>`;
  }
}

function unmountBattle() {
  if (battleCore) battleCore.unmount();
}

function refreshBattle() {
  if (refs.partyStage.hidden) return;
  mountBattle();
  syncHud();
}

const ctx = createContext({
  state,
  refs,
  save,
  syncHud,
  getBattleCore,
  setBattleCore,
  refreshBattle,
});

initJobTooltip();

refs.adminMenuBtn?.addEventListener('click', () => {
  if (!canUseAdminMode()) return;
  state.adminMode = true;
  state.currentScreen = 'collection';
  renderScreen();
});

function isTextEditingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA') return true;
  if (target.tagName !== 'INPUT') return false;
  return ['text', 'search', 'email', 'password', 'url', 'tel'].includes(target.type);
}

async function saveAdminVisualNow() {
  if (!canUseAdminMode() || !state.adminMode || state.currentScreen !== 'collection') return false;
  if (visualCloudSaveTimer) {
    window.clearTimeout(visualCloudSaveTimer);
    visualCloudSaveTimer = null;
  }
  const button = refs.contentEntry?.querySelector('[data-visual-save]');
  if (button) button.textContent = '저장중';
  const result = await save({ silent: false });
  if (button) {
    button.textContent = result.cloud ? '서버 저장됨' : '저장 실패';
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = '저장';
    }, 1200);
  }
  return result;
}

function centerSelectedCollectionCard() {
  const grid = refs.contentEntry?.querySelector('.collection-grid');
  if (!grid || !collectionSelectedKey) return;
  const card = [...grid.querySelectorAll('[data-collection-key]')]
    .find((node) => node.dataset.collectionKey === collectionSelectedKey);
  if (!card) return;
  grid.scrollTop = Math.max(0, card.offsetTop - ((grid.clientHeight - card.offsetHeight) / 2));
}

function stepAdminVisualUnit(delta) {
  if (!canUseAdminMode() || !state.adminMode || state.currentScreen !== 'collection') return false;
  const visibleUnits = getVisibleCollectionUnits();
  if (!visibleUnits.length) return false;
  const currentIndex = Math.max(0, visibleUnits.findIndex((unit) => unit.collectionKey === collectionSelectedKey));
  const nextIndex = (currentIndex + delta + visibleUnits.length) % visibleUnits.length;
  collectionSelectedKey = visibleUnits[nextIndex].collectionKey;
  renderScreen();
  window.requestAnimationFrame(centerSelectedCollectionCard);
  return true;
}

async function applySelectedPromotionLine(button = null) {
  if (!canUseAdminMode() || !state.adminMode || state.currentScreen !== 'collection') return false;
  const activeUnit = getCollectionVariants().find((unit) => unit.collectionKey === collectionSelectedKey);
  if (!activeUnit) return false;

  const lineUnit = getPromotionLineVisualUnit(activeUnit);
  const applied = applyVisualProfileToPromotionLine(state, lineUnit, 'all');
  saveAppState(state);
  if (visualCloudSaveTimer) {
    window.clearTimeout(visualCloudSaveTimer);
    visualCloudSaveTimer = null;
  }

  const applyButton = button || refs.contentEntry?.querySelector('[data-visual-apply-line]');
  if (applyButton) applyButton.textContent = applied ? '라인 적용됨' : '적용 대상 없음';
  await save({ silent: true });
  if (applyButton) {
    window.setTimeout(() => {
      if (applyButton.isConnected) applyButton.textContent = '승급 라인 적용';
    }, 1200);
  }
  return Boolean(applied);
}

document.addEventListener('keydown', (event) => {
  const key = event.key?.toLowerCase();
  const isSaveKey = key === 's' && !event.altKey;
  const isApplyLineKey = key === 'd' && !event.altKey;
  if (!canUseAdminMode() || !state.adminMode || state.currentScreen !== 'collection') return;
  if (isSaveKey && !event.repeat && !isTextEditingTarget(event.target)) {
    event.preventDefault();
    saveAdminVisualNow();
    return;
  }
  if (isApplyLineKey && !event.repeat && !event.ctrlKey && !event.metaKey && !isTextEditingTarget(event.target)) {
    event.preventDefault();
    applySelectedPromotionLine();
    return;
  }
  const stepMap = { a: -1 };
  const delta = stepMap[key];
  if (!delta || event.repeat || event.altKey || event.ctrlKey || event.metaKey || isTextEditingTarget(event.target)) return;
  event.preventDefault();
  stepAdminVisualUnit(delta);
});

function syncNavLabels(desktop) {
  const labels = desktop ? NAV_LABELS.desktop : NAV_LABELS.mobile;
  refs.navItems.forEach((button) => {
    const meta = labels[button.dataset.screen];
    if (!meta) return;
    const icon = button.querySelector('.nav-icon');
    const label = button.querySelector('.nav-label');
    if (icon) icon.textContent = meta.icon;
    if (label) label.textContent = meta.label;
  });
}

function syncHud() {
  if (refs.rankValue) refs.rankValue.textContent = String(state.resources.rank);
  refs.goldValue.textContent = formatNumber(state.resources.gold);
  refs.gemValue.textContent = formatNumber(state.resources.gems);

  const tickets = state.resources.specialTickets || 0;
  if (refs.ticketValue) refs.ticketValue.textContent = tickets;
  if (refs.partyPowerValue) refs.partyPowerValue.textContent = formatNumber(getPartyPower(state));
  if (refs.summonBadge) {
    refs.summonBadge.textContent = tickets;
    refs.summonBadge.hidden = tickets <= 0;
  }
  const questClaimable = getQuestSummary(state).claimable.length;
  if (!refs.homeBadge) {
    refs.homeBadge = document.createElement('span');
    refs.homeBadge.className = 'nav-badge';
    document.querySelector('.nav-item[data-screen="home"]')?.appendChild(refs.homeBadge);
  }
  if (refs.homeBadge) {
    refs.homeBadge.textContent = questClaimable;
    refs.homeBadge.hidden = questClaimable <= 0;
  }  if (refs.adminMenuBtn) {
    const adminAllowed = canUseAdminMode();
    refs.adminMenuBtn.hidden = !adminAllowed;
    refs.adminMenuBtn.classList.toggle('is-on', adminAllowed && state.adminMode);
    refs.adminMenuBtn.title = adminAllowed ? `관리자: ${normalizeEmail(state._currentEmail)}` : '';
  }

  if (battleCore?.root) {
    const summary = battleCore.getSummary();
    if (refs.waveHint) refs.waveHint.textContent = summary.waveHint;
    if (refs.synergyHint) refs.synergyHint.textContent = summary.synergyHint;
  } else {
    if (refs.waveHint) refs.waveHint.textContent = '';
    if (refs.synergyHint) refs.synergyHint.textContent = '';
  }
}

function resetPanelState(screen) {
  if (screen === 'units') resetUnitsTabState();
  if (screen === 'growth') resetGrowthTabState();
  if (screen === 'summon') resetSummonTabState();
}

function bindSubScreen(screen) {
  if (screen === 'quest') bindInfoEvents();
  if (screen === 'collection') bindCollectionEvents();
  if (screen === 'units') bindUnitsEvents(ctx);
  if (screen === 'growth') bindGrowthEvents(ctx);
  if (screen === 'summon') bindSummonEvents(ctx);
}

export function renderScreen() {
  const desktop = isDesktopLayout();
  const panelScreen = desktop && state.currentScreen === 'home' ? 'quest' : state.currentScreen;
  if (!canUseAdminMode()) state.adminMode = false;

  refs.app.dataset.layout = desktop ? 'desktop' : 'mobile';
  refs.app.dataset.screen = state.currentScreen;
  syncNavLabels(desktop);

  refs.navItems.forEach((button) => {
    button.classList.toggle('active', button.dataset.screen === state.currentScreen);
  });

  if (desktop) {
    const fullPanelMode = state.currentScreen === 'units' || state.currentScreen === 'collection';
    refs.partyStage.hidden = fullPanelMode;
    refs.contentEntry.hidden = false;
    if (fullPanelMode) {
      unmountBattle();
    } else {
      mountBattle();
    }

    if (panelScreen !== lastPanelScreen) {
      resetPanelState(panelScreen);
      lastPanelScreen = panelScreen;
    }

    refs.contentEntry.innerHTML = renderSubScreen(panelScreen);
    bindSubScreen(panelScreen);
  } else if (state.currentScreen === 'home') {
    lastPanelScreen = null;
    refs.partyStage.hidden = false;
    refs.contentEntry.hidden = true;
    refs.contentEntry.innerHTML = '';
    mountBattle();
  } else {
    lastPanelScreen = null;
    unmountBattle();
    refs.partyStage.hidden = true;
    refs.contentEntry.hidden = false;

    resetPanelState(state.currentScreen);
    refs.contentEntry.innerHTML = renderSubScreen(state.currentScreen);
    bindSubScreen(state.currentScreen);
  }

  syncHud();
}

function renderSubScreen(screen) {
  if (screen === 'quest') return renderInfoScreen();
  if (screen === 'collection') return renderCollectionScreen();
  if (screen === 'units') return renderUnitsScreen(ctx);
  if (screen === 'growth') return renderGrowthScreen(ctx);
  if (screen === 'summon') return renderSummonScreen(ctx);
  return renderPvpScreen();
}

function getRoleShort(role) {
  return {
    '물리 딜러': '⚔',
    '마법 딜러': '🔮',
    '점프딜러': '↟',
    '탱커': '🛡',
    '버퍼': '✨',
    '디버퍼': '🩸',
    '힐러': '💚',
  }[role] || '•';
}

function getRoleColor(roleShort) {
  return {
    '⚔': '#ff4444',
    '🔮': '#aa66ff',
    '↟': '#66d9ff',
    '🛡': '#28d970',
    '✨': '#ffcc33',
    '🩸': '#3399ff',
    '💚': '#ff66aa',
  }[roleShort] || '#66a7ff';
}

const COLLECTION_SORT_LABELS = {
  starsDesc: '6성→1성',
  starsAsc: '1성→6성',
  series: '시리즈별',
  role: '역할군',
};

const COLLECTION_ROLE_ORDER = {
  '물리 딜러': 0,
  '마법 딜러': 1,
  '탱커': 2,
  '버퍼': 3,
  '디버퍼': 4,
  '힐러': 5,
};

const COLLECTION_SERIES_ORDER = {
  FF1: 1,
  FF2: 2,
  FF3: 3,
  FF4: 4,
  FF5: 5,
  FF6: 6,
  FF7: 7,
  FF8: 8,
  FF9: 9,
  FF10: 10,
  'C-AD': 20,
  'C-KH': 21,
  'C-NA': 22,
  'C-ToM': 23,
  'C-VF': 24,
};

function sortCollectionUnits(units) {
  const arr = [...units];
  const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko');
  const byStarsDesc = (a, b) => (b.stars || 0) - (a.stars || 0) || byName(a, b);

  if (collectionSortMode === 'starsAsc') {
    arr.sort((a, b) => (a.stars || 0) - (b.stars || 0) || byName(a, b));
  } else if (collectionSortMode === 'series') {
    arr.sort((a, b) => (COLLECTION_SERIES_ORDER[a.series] ?? 99) - (COLLECTION_SERIES_ORDER[b.series] ?? 99) || byStarsDesc(a, b));
  } else if (collectionSortMode === 'role') {
    arr.sort((a, b) => (COLLECTION_ROLE_ORDER[getUnitBattleRole(a)] ?? 99) - (COLLECTION_ROLE_ORDER[getUnitBattleRole(b)] ?? 99) || byStarsDesc(a, b));
  } else {
    arr.sort(byStarsDesc);
  }
  return arr;
}

function getCollectionVariants() {
  return FULL_UNIT_LIBRARY.flatMap((unit) => {
    const tierFolders = unit.tierFolders && typeof unit.tierFolders === 'object' ? unit.tierFolders : {};
    const tiers = Object.keys(tierFolders)
      .map((tier) => Number(tier))
      .filter((tier) => Number.isFinite(tier) && tier >= 1 && tier <= 6)
      .sort((a, b) => a - b);

    if (!tiers.length) {
      const stars = Number(unit.stars) || 1;
      return [{
        ...unit,
        id: `${unit.id}_collection_t${stars}`,
        collectionBaseId: unit.id,
        collectionKey: `${unit.folderKey}:${stars}`,
        collectionTier: stars,
      }];
    }

    return tiers.map((tier) => ({
      ...unit,
      id: `${unit.id}_collection_t${tier}`,
      collectionBaseId: unit.id,
      collectionKey: `${unit.folderKey}:${tier}`,
      collectionTier: tier,
      stars: tier,
      tier,
      minTier: tier,
      maxTier: tier,
      tierFolders: { [tier]: tierFolders[tier] },
    }));
  });
}

function formatVisualValue(field, value) {
  return field === 'scale' ? `${Math.round(Number(value) * 100)}%` : `${Math.round(Number(value))}px`;
}

function renderVisualRange(kind, field, label, value) {
  const limits = VISUAL_LIMITS[kind][field];
  const controlValue = toVisualControlValue(field, value);
  const min = field === 'scale' ? Math.round(limits.min * 100) : limits.min;
  const max = field === 'scale' ? Math.round(limits.max * 100) : limits.max;
  const step = field === 'scale' ? 1 : limits.step;
  const unit = field === 'scale' ? '%' : 'px';
  const preset = kind === 'sprite' && field === 'scale'
    ? '<button class="collection-admin-range__preset" type="button" data-visual-preset-kind="sprite" data-visual-preset-field="scale" data-visual-preset-value="1.6">160%</button>'
    : '';
  return `
    <label class="collection-admin-range${preset ? ' collection-admin-range--preset' : ''}">
      <span>${label}</span>
      <input class="collection-admin-range__slider" type="range" min="${min}" max="${max}" step="${step}" value="${controlValue}" data-visual-kind="${kind}" data-visual-field="${field}">
      <input class="collection-admin-range__number" type="number" min="${min}" max="${max}" step="${step}" value="${controlValue}" data-visual-kind="${kind}" data-visual-field="${field}" aria-label="${label} ${unit}">
      <em>${unit}</em>
      ${preset}
    </label>
  `;
}

function renderVisualEditor(libraryUnit, visibleUnits = []) {
  const portrait = getUnitVisualProfile(state, libraryUnit, 'portrait');
  const sprite = getUnitVisualProfile(state, libraryUnit, 'sprite');
  const battleRole = getUnitBattleRole(libraryUnit);
  const stars = Number(libraryUnit.collectionTier || libraryUnit.stars || 1);
  const job = libraryUnit.job || battleRole || libraryUnit.role || '-';
  const currentIndex = Math.max(0, visibleUnits.findIndex((unit) => unit.collectionKey === libraryUnit.collectionKey));
  const total = visibleUnits.length || 1;
  return `
    <div class="collection-admin-panel" data-admin-panel>
      <div class="collection-admin-head">
        <div class="collection-admin-title">
          <span>이미지 배치</span>
          <strong>${libraryUnit.name}</strong>
          <em>${libraryUnit.series || '-'} · ${stars}성 · ${job}</em>
        </div>
        <div class="collection-admin-actions">
          <button type="button" data-visual-save>저장</button>
          <button type="button" data-visual-apply-line>승급 라인 적용</button>
          <button type="button" data-visual-reset="all">전체 초기화</button>
        </div>
      </div>
      <div class="collection-admin-nav">
        <button type="button" data-admin-step="-1">이전</button>
        <span>${currentIndex + 1} / ${total}</span>
        <button type="button" data-admin-step="1">다음</button>
      </div>
      <div class="collection-admin-grid">
        <div class="collection-admin-card">
          <div class="collection-admin-card__title">
            <strong>1.png</strong>
            <button type="button" data-visual-reset="portrait">초기화</button>
          </div>
          ${renderVisualRange('portrait', 'scale', '확대', portrait.scale)}
          ${renderVisualRange('portrait', 'x', '좌우', portrait.x)}
          ${renderVisualRange('portrait', 'y', '상하', portrait.y)}
        </div>
        <div class="collection-admin-card">
          <div class="collection-admin-card__title">
            <strong>idle.gif</strong>
            <button type="button" data-visual-reset="sprite">초기화</button>
          </div>
          ${renderVisualRange('sprite', 'scale', '확대', sprite.scale)}
          ${renderVisualRange('sprite', 'x', '좌우', sprite.x)}
          ${renderVisualRange('sprite', 'y', '상하', sprite.y)}
        </div>
      </div>
    </div>
  `;
}

function getOwnedCollectionUnit(variant, ownedByFolder) {
  const ownedUnit = ownedByFolder.get(variant.folderKey);
  if (!ownedUnit) return null;
  const variantTier = Number(variant.collectionTier || variant.tier || variant.stars || 1);
  const ownedTier = Number(ownedUnit.tier || ownedUnit.stars || ownedUnit.minTier || 1);
  return ownedTier >= variantTier ? ownedUnit : null;
}

function hasVisualAdjustments(unit) {
  const key = getVisualKey(unit);
  return Boolean(state.visualProfiles?.portraits?.[key] || state.visualProfiles?.sprites?.[key]);
}

function getCollectionBaseUnit(unit) {
  return FULL_UNIT_LIBRARY.find((base) => base.id === unit?.collectionBaseId || base.id === unit?.id || base.folderKey === unit?.folderKey) || unit;
}

function getPromotionLineVisualUnit(unit) {
  const base = getCollectionBaseUnit(unit);
  return {
    ...base,
    collectionTier: unit?.collectionTier || unit?.tier || unit?.stars,
    tier: unit?.collectionTier || unit?.tier || unit?.stars,
  };
}

function getVisibleCollectionUnits(ownedByFolder = new Map(state.units.map((unit) => [unit.folderKey, unit]))) {
  return sortCollectionUnits(getCollectionVariants().filter((unit) => {
    const owned = Boolean(getOwnedCollectionUnit(unit, ownedByFolder));
    if (collectionFilter === 'owned') return owned;
    if (collectionFilter === 'missing') return !owned;
    if (collectionFilter === 'visualTodo') return !hasVisualAdjustments(unit);
    if (collectionFilter === 'visualDone') return hasVisualAdjustments(unit);
    return true;
  }));
}

function getCollectionPortraitSources(unit) {
  return resolveUnitPortrait(unit).filter(Boolean);
}

function renderCollectionPortrait(unit) {
  const sources = getCollectionPortraitSources(unit);
  const src = sources[0] || '';
  const fallback = sources[1] || '';
  if (!src) return '';
  const fallbackAttr = fallback
    ? ` data-fallback="${fallback}" onerror="this.onerror=null;this.closest('[data-portrait-host]')?.classList.add('is-portrait-fallback');this.src=this.dataset.fallback"`
    : ' onerror="this.closest(\'[data-portrait-host]\')?.classList.add(\'is-portrait-fallback\')"';
  return `<img src="${src}" alt="${unit.name}"${fallbackAttr} draggable="false">`;
}

function renderCollectionIdlePreview(unit) {
  const sources = resolveUnitImageSprite(unit, 'idle').filter(Boolean);
  const src = sources[0] || '';
  const fallback = sources[1] || '';
  if (!src) return '<div class="collection-detail__sprite-empty">NO IDLE</div>';
  const fallbackAttr = fallback
    ? ` data-fallback="${fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback"`
    : ' onerror="this.style.display=\'none\';this.closest(\'.collection-detail__stage\')?.classList.add(\'is-empty\')"';
  return `<img class="collection-detail__sprite" src="${src}" alt="${unit.name} idle" ${fallbackAttr} draggable="false">`;
}

function renderJobRoleChips(unit) {
  return getUnitJobDisplayLabels(unit).map((label, index) => {
    if (index === 0) return `<span class="collection-detail__chip--job job-tip-host" ${renderJobTooltipAttrs(unit)}>${label}</span>`;
    return `<span class="job-tip-host" ${renderRoleTooltipAttrs(label)}>${label}</span>`;
  }).join('');
}

function renderCollectionCard(libraryUnit, ownedUnit, isSelected = false) {
  const battleRole = getUnitBattleRole(libraryUnit);
  const roleShort = getRoleShort(battleRole);
  const roleColor = getRoleColor(roleShort);
  const isOwned = Boolean(ownedUnit);
  const stars = Number(libraryUnit.collectionTier || libraryUnit.stars || 1);
  const job = libraryUnit.job || battleRole || libraryUnit.role;
  const roles = getUnitJobRoles(libraryUnit);
  const showAdminState = canUseAdminMode() && state.adminMode;
  const adjusted = hasVisualAdjustments(libraryUnit);
  return `
    <button class="collection-card${isOwned ? ' is-owned' : ' is-missing'}${isSelected ? ' is-selected' : ''}${adjusted ? ' is-visual-adjusted' : ''}" data-collection-key="${libraryUnit.collectionKey}" type="button" style="--role-color:${roleColor};${getRarityStyle(libraryUnit)};${renderVisualVars(state, libraryUnit)}">
      <div class="collection-card__art" data-portrait-host>
        ${renderCollectionPortrait(libraryUnit)}
        <span class="collection-card__state">${isOwned ? '보유' : '미보유'}</span>
        <span class="collection-card__portrait-state">GIF 대체</span>
        ${showAdminState ? `<span class="collection-card__visual-state">${adjusted ? '보정됨' : '미보정'}</span>` : ''}
      </div>
      <div class="collection-card__stars">${renderStars(stars)}</div>
      <div class="collection-card__name">${libraryUnit.name}</div>
      <div class="collection-card__meta">${libraryUnit.series || '-'} · ${job}</div>
    </button>
  `;
}

function renderCollectionAbilityPanel(unit) {
  const passive = getUnitCommonPassive(unit);
  const limit = describeLimitBurst(unit);
  return `
      <div class="collection-detail__ability-grid">
        <div class="collection-detail__ability collection-detail__ability--passive">
          <span>고유 패시브</span>
          <strong>${passive ? passive.label : '없음'}</strong>
          <p>${passive ? passive.text : '이 유닛은 아직 고유 패시브가 없습니다.'}</p>
        </div>
        <div class="collection-detail__ability collection-detail__ability--limit">
          <span>리미트기</span>
          <strong>${limit.name}</strong>
          <p>${limit.text}</p>
        </div>
      </div>`;
}
function renderCollectionDetail(libraryUnit, ownedUnit) {
  if (!libraryUnit) {
    return `
      <aside class="collection-detail collection-detail--empty">
        <strong>유닛을 선택하세요</strong>
        <span>도감 카드의 초상화를 누르면 상세 정보가 표시됩니다.</span>
      </aside>
    `;
  }

  const battleRole = getUnitBattleRole(libraryUnit);
  const roleShort = getRoleShort(battleRole);
  const roleColor = getRoleColor(roleShort);
  const isOwned = Boolean(ownedUnit);
  const stars = Number(libraryUnit.collectionTier || libraryUnit.stars || 1);
  const displayUnit = ownedUnit || libraryUnit;
  const tierText = isOwned
    ? `${Number(ownedUnit.tier || ownedUnit.stars || stars)}성 보유`
    : `${stars}성 미보유`;
  const stats = [
    ['HP', displayUnit.maxHp || displayUnit.hp || 0],
    ['MP', displayUnit.mp || 0],
    ['공격', displayUnit.atk || 0],
    ['마력', displayUnit.mag || 0],
    ['방어', displayUnit.def || 0],
    ['정신', displayUnit.spr || 0],
  ];

  return `
    <aside class="collection-detail" data-visual-key="${getVisualKey(libraryUnit)}" style="--role-color:${roleColor};${getRarityStyle(libraryUnit)};${renderVisualVars(state, libraryUnit)}">
      <div class="collection-detail__hero">
        <div class="collection-detail__portrait" data-portrait-host>
          ${renderCollectionPortrait(libraryUnit)}
        </div>
        <div class="collection-detail__title">
          <span class="collection-detail__eyebrow">${libraryUnit.series || '-'} · ${tierText}</span>
          <h3>${libraryUnit.name}</h3>
          <div class="collection-detail__stars">${renderStars(stars)}</div>
      <div class="collection-detail__chips">
            ${renderJobRoleChips(libraryUnit)}
          </div>
        </div>
      </div>

      <div class="collection-detail__preview">
        <div class="collection-detail__preview-head">
          <span>IDLE PREVIEW</span>
          <strong>idle.gif</strong>
        </div>
        <div class="collection-detail__stage">
          ${renderCollectionIdlePreview(libraryUnit)}
          <div class="collection-detail__stage-shadow"></div>
        </div>
      </div>

      ${renderCollectionAbilityPanel(displayUnit)}

      <div class="collection-detail__owned collection-detail__owned--${isOwned ? 'yes' : 'no'}">
        <span>${isOwned ? '보유 중' : '미보유'}</span>
        <strong>${isOwned ? `LV ${ownedUnit.level || 1}` : '소환 필요'}</strong>
      </div>

      <div class="collection-detail__stats">
        ${stats.map(([label, value]) => `
          <div class="collection-detail__stat">
            <span>${label}</span>
            <strong>${formatNumber(value)}</strong>
          </div>
        `).join('')}
      </div>

      <div class="collection-detail__note">
        <span>전투력</span>
        <strong>${formatNumber(displayUnit.power || 0)}</strong>
      </div>
    </aside>
  `;
}

function renderCollectionSection() {
  const ownedByFolder = new Map(state.units.map((unit) => [unit.folderKey, unit]));
  const variants = getCollectionVariants();
  const adminAllowed = canUseAdminMode();
  const adminActive = adminAllowed && state.adminMode;
  if (!adminActive && (collectionFilter === 'visualTodo' || collectionFilter === 'visualDone')) {
    collectionFilter = 'all';
  }
  const total = variants.length;
  const ownedCount = variants.filter((unit) => getOwnedCollectionUnit(unit, ownedByFolder)).length;
  const missingCount = Math.max(0, total - ownedCount);
  const visualDoneCount = variants.filter((unit) => hasVisualAdjustments(unit)).length;
  const visualTodoCount = Math.max(0, total - visualDoneCount);
  const filterButtons = [
    ['all', `전체 ${total}`],
    ['owned', `보유 ${ownedCount}`],
    ['missing', `미보유 ${missingCount}`],
    ...(adminActive ? [
      ['visualTodo', `미보정 ${visualTodoCount}`],
      ['visualDone', `보정됨 ${visualDoneCount}`],
    ] : []),
  ];
  const visibleUnits = getVisibleCollectionUnits(ownedByFolder);
  const activeKey = visibleUnits.some((unit) => unit.collectionKey === collectionSelectedKey)
    ? collectionSelectedKey
    : (visibleUnits[0]?.collectionKey || null);
  collectionSelectedKey = activeKey;
  const selectedUnit = visibleUnits.find((unit) => unit.collectionKey === activeKey) || null;
  const selectedOwned = selectedUnit ? getOwnedCollectionUnit(selectedUnit, ownedByFolder) : null;
  const adminEditor = adminActive && selectedUnit ? renderVisualEditor(selectedUnit, visibleUnits) : '';
  const cards = visibleUnits
    .map((unit) => renderCollectionCard(unit, getOwnedCollectionUnit(unit, ownedByFolder), unit.collectionKey === activeKey))
    .join('');

  return `
    <div class="collection-panel">
      <div class="collection-head">
        <div>
          <div class="info-section-title">도감</div>
          <div class="collection-count">보유 ${ownedCount} / ${total}</div>
        </div>
        <div class="collection-head__right">
          ${adminAllowed ? `
            <button class="collection-admin-toggle${state.adminMode ? ' is-on' : ''}" data-admin-toggle="collection" type="button">
              ${state.adminMode ? '관리자 ON' : '관리자 OFF'}
            </button>
          ` : ''}
          <div class="collection-progress">
            <span style="width:${total ? Math.round((ownedCount / total) * 100) : 0}%"></span>
          </div>
        </div>
      </div>
      <div class="collection-filters">
        ${filterButtons.map(([key, label]) => `
          <button class="collection-filter${collectionFilter === key ? ' is-on' : ''}" data-collection-filter="${key}" type="button">${label}</button>
        `).join('')}
      </div>
      <div class="collection-sort">
        <span>정렬</span>
        <div class="collection-sort__options">
          ${Object.entries(COLLECTION_SORT_LABELS).map(([key, label]) => `
            <button class="collection-sort-btn${collectionSortMode === key ? ' is-on' : ''}" data-collection-sort="${key}" type="button">${label}</button>
          `).join('')}
        </div>
      </div>
      <div class="collection-body${adminEditor ? ' collection-body--admin' : ''}">
        ${adminEditor}
        <div class="collection-grid">
          ${cards || '<div class="info-empty">표시할 유닛이 없습니다</div>'}
        </div>
        ${renderCollectionDetail(selectedUnit, selectedOwned)}
      </div>
    </div>
  `;
}

function renderCollectionScreen() {
  return `
    <section class="collection-screen">
      ${renderCollectionSection()}
    </section>
  `;
}

function escapeInfoAttr(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function getInfoComboUnits(rule, party) {
  if (!rule) return [];
  if (rule.group === 'sameJob') {
    const job = String(rule.id || '').replace('same-job-', '') || '';
    return party.filter((unit) => unit.job === job).map((unit) => unit.name);
  }
  if (rule.group === 'bond' && Array.isArray(rule.members)) {
    return party
      .filter((unit) => !rule.series || unit.series === rule.series)
      .filter((unit) => {
        const name = String(unit.name || '').toLowerCase();
        return rule.members.some((member) => name.includes(String(member).toLowerCase()));
      })
      .map((unit) => unit.name);
  }
  if (rule.requires && typeof rule.requires === 'object') {
    const picked = [];
    Object.entries(rule.requires).forEach(([job, amount]) => {
      party
        .filter((unit) => unit.job === job)
        .slice(0, Number(amount) || 1)
        .forEach((unit) => picked.push(unit.name));
    });
    return picked;
  }
  if (rule.id === 'many-jobs') {
    return party.map((unit) => `${unit.name}(${unit.job || '-'})`);
  }
  return party.map((unit) => unit.name);
}

function getInfoComboCondition(rule) {
  if (!rule) return '조건 정보 없음';
  if (rule.group === 'sameJob') {
    const job = String(rule.id || '').replace('same-job-', '') || rule.job || '같은 직업';
    return `${job} 4명 편성`;
  }
  if (rule.group === 'bond') {
    const members = Array.isArray(rule.members) ? rule.members.join(' / ') : '';
    return `${rule.series ? `${rule.series} ` : ''}${members} 중 ${rule.min || 2}명 이상`;
  }
  if (rule.requires && typeof rule.requires === 'object') {
    return Object.entries(rule.requires)
      .map(([job, amount]) => `${job} ${amount}명`)
      .join(' + ');
  }
  if (rule.id === 'many-jobs') return '서로 다른 직업 4명 편성';
  return '조건 정보 없음';
}

function renderInfoComboChip(rule, party) {
  const units = getInfoComboUnits(rule, party);
  const condition = getInfoComboCondition(rule);
  const effect = `전투력 +${Number(rule.bonus || 0)}%, 스탯 +${Number(rule.statBonus || 0)}%`;
  const tip = `${rule.label}\n조건: ${condition}\n조합 유닛: ${units.length ? units.join(' / ') : '-'}\n효과: ${effect}`;
  return `
    <span class="info-combo-chip info-combo-chip--${rule.group || 'job'}" data-tip="${escapeInfoAttr(tip)}" title="${escapeInfoAttr(tip)}">
      <span>${rule.label}</span>
      <strong>+${Number(rule.bonus || 0)}%</strong>
    </span>
  `;
}

function renderAdventureStageCards() {
  return Object.entries(GROUND_DATA).map(([groundId, ground]) => {
    const stage = getGroundStageState(state, groundId);
    const active = state.home.groundId === groundId;
    const progress = Math.round(stage.progress * 100);
    const unlocked = isGroundUnlocked(state, groundId);
    const req = getGroundUnlockRequirement(state, groundId);
    const requirementText = req ? `${req.label} 클리어 필요` : '선행 스테이지 필요';
    return `
      <button class="info-stage-card${active ? ' is-active' : ''}${stage.cleared ? ' is-cleared' : ''}${unlocked ? '' : ' is-locked'}" data-info-ground="${groundId}" ${unlocked ? '' : 'disabled'} type="button">
        <span>${ground.chapter || 'STAGE'}</span>
        <strong>${ground.label}</strong>
        <em>${unlocked ? (stage.cleared ? 'CLEAR' : `W${stage.bestWave}/${stage.targetWave}`) : 'LOCKED'}</em>
        ${unlocked ? `<i style="width:${progress}%"></i>` : `<small>${requirementText}</small>`}
      </button>
    `;
  }).join('');
}
function bindInfoEvents() {
  const questBoard = refs.contentEntry.querySelector('.quest-board');
  const battleLogList = refs.contentEntry.querySelector('.battle-log-list');
  if (questBoard && !questBoard.dataset.scrollKeeper) {
    questBoard.dataset.scrollKeeper = '1';
    questBoard.addEventListener('scroll', () => { questBoardScrollTop = questBoard.scrollTop; }, { passive: true });
    questBoard.scrollTop = questBoardScrollTop;
  }
  if (battleLogList && !battleLogList.dataset.scrollKeeper) {
    battleLogList.dataset.scrollKeeper = '1';
    battleLogList.addEventListener('scroll', () => { battleLogScrollTop = battleLogList.scrollTop; }, { passive: true });
    if (battleLogScrollTop > 0) battleLogList.scrollTop = battleLogScrollTop;
  }

  refs.contentEntry.querySelectorAll('[data-quest-claim]').forEach((button) => {
    button.addEventListener('click', async () => {
      const questId = button.dataset.questClaim;
      const result = claimQuestReward(state, questId);
      if (!result.ok) return;
      await save({ silent: true, showStatus: true });
      syncHud();
      refs.contentEntry.innerHTML = renderInfoScreen();
      bindInfoEvents();
    });
  });
  refs.contentEntry.querySelectorAll('[data-info-ground]').forEach((button) => {
    button.addEventListener('click', () => {
      const groundId = button.dataset.infoGround;
      if (!GROUND_DATA[groundId] || !isGroundUnlocked(state, groundId)) return;
      if (!state.home.stageBestWaves || typeof state.home.stageBestWaves !== 'object') state.home.stageBestWaves = {};
      state.home.groundId = groundId;
      state.home.wave = Math.max(1, Number(state.home.stageBestWaves[groundId]) || 1);
      state.home.winsToBoss = Math.max(1, 5 - (state.home.wave % 5 || 5));
      refreshBattle();
      save({ silent: true, showStatus: true });
      renderScreen();
    });
  });
}
const QUEST_GROUP_LABELS = {
  story: '스토리',
  daily: '일일',
  achievement: '업적',
};

function renderQuestCard(quest) {
  const percent = Math.round(quest.progress * 100);
  const rewardText = formatQuestReward(quest.reward);
  const statusLabel = quest.claimed ? '수령 완료' : quest.claimable ? '보상 받기' : `${formatNumber(Math.min(quest.current, quest.target))}/${formatNumber(quest.target)}`;
  return `
    <div class="quest-card quest-card--${quest.group}${quest.claimable ? ' is-claimable' : ''}${quest.claimed ? ' is-claimed' : ''}">
      <div class="quest-card__main">
        <span>${QUEST_GROUP_LABELS[quest.group] || quest.group}</span>
        <strong>${quest.title}</strong>
        <p>${quest.description}</p>
        <div class="quest-progress"><i style="width:${percent}%"></i></div>
      </div>
      <div class="quest-card__side">
        <em>${rewardText}</em>
        <button class="quest-claim-btn" data-quest-claim="${quest.id}" ${quest.claimable ? '' : 'disabled'} type="button">${statusLabel}</button>
      </div>
    </div>
  `;
}

function renderQuestBoard() {
  const summary = getQuestSummary(state);
  return `
    <div class="quest-board">
      <div class="quest-board__head">
        <div>
          <span class="info-eyebrow">QUEST</span>
          <strong>퀘스트</strong>
        </div>
        <em>${summary.claimable.length ? `수령 가능 ${summary.claimable.length}` : '진행중'}</em>
      </div>
      ${['story', 'daily', 'achievement'].map((group) => `
        <div class="quest-group">
          <div class="quest-group__title">${QUEST_GROUP_LABELS[group]}</div>
          ${summary.byGroup[group].map(renderQuestCard).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function renderBattleLogPanel() {
  const logs = Array.isArray(state.home?.battleLogs) ? state.home.battleLogs : [];
  return `
    <div class="battle-log-panel">
      <div class="battle-log-panel__head">
        <div>
          <span class="info-eyebrow">BATTLE LOG</span>
          <strong>전투 로그</strong>
        </div>
        <em>${logs.length ? `최근 ${Math.min(logs.length, 80)}개` : '대기중'}</em>
      </div>
      <div class="battle-log-list">
        ${logs.length ? logs.map((log) => `
          <div class="battle-log-entry battle-log-entry--${log.type || 'info'}">
            <div class="battle-log-entry__main">
              <strong>${log.title || '전투 기록'}</strong>
              <p>${log.message || ''}</p>
            </div>
            <div class="battle-log-rewards">
              ${(log.rewards || []).map((reward) => `
                <span>${reward.label} <strong>${reward.icon || ''}${formatNumber(reward.amount)}</strong></span>
              `).join('')}
            </div>
          </div>
        `).join('') : `
          <div class="battle-log-empty">
            <strong>아직 기록 없음</strong>
            <p>보스 처치와 첫 클리어 보상이 여기에 표시됩니다.</p>
          </div>
        `}
      </div>
    </div>
  `;
}
function renderInfoScreen() {
  return `
    <section class="info-screen info-screen--quest">
      ${renderBattleLogPanel()}
      ${renderQuestBoard()}
    </section>
  `;
}

function bindCollectionEvents() {
  const adminAllowed = canUseAdminMode();
  if (!adminAllowed) state.adminMode = false;
  const activeUnit = getCollectionVariants().find((unit) => unit.collectionKey === collectionSelectedKey) || null;
  const findCollectionCard = (grid, key) => {
    if (!grid || !key) return null;
    return [...grid.querySelectorAll('[data-collection-key]')]
      .find((card) => card.dataset.collectionKey === key) || null;
  };
  const rerenderCollection = ({ anchorKey = null, anchorTop = null, scrollTop = null, focusKey = null } = {}) => {
    refs.contentEntry.innerHTML = renderCollectionScreen();
    bindCollectionEvents();

    const grid = refs.contentEntry.querySelector('.collection-grid');
    if (!grid) return;
    const focusCard = findCollectionCard(grid, focusKey);
    const anchorCard = findCollectionCard(grid, anchorKey);
    if (focusCard) {
      grid.scrollTop = Math.max(0, focusCard.offsetTop - ((grid.clientHeight - focusCard.offsetHeight) / 2));
    } else if (anchorCard && Number.isFinite(anchorTop)) {
      grid.scrollTop = Math.max(0, anchorCard.offsetTop - anchorTop);
    } else if (Number.isFinite(scrollTop)) {
      grid.scrollTop = Math.max(0, scrollTop);
    }
  };
  const applyVisualVars = () => {
    if (!activeUnit) return;
    const detail = refs.contentEntry.querySelector('.collection-detail');
    const selectedCard = refs.contentEntry.querySelector(`[data-collection-key="${activeUnit.collectionKey}"]`);
    const portrait = getUnitVisualProfile(state, activeUnit, 'portrait');
    const sprite = getUnitVisualProfile(state, activeUnit, 'sprite');
    [detail, selectedCard].filter(Boolean).forEach((node) => {
      node.style.setProperty('--portrait-scale', portrait.scale);
      node.style.setProperty('--portrait-x', `${portrait.x}px`);
      node.style.setProperty('--portrait-y', `${portrait.y}px`);
      node.style.setProperty('--sprite-scale', sprite.scale);
      node.style.setProperty('--sprite-x', `${sprite.x}px`);
      node.style.setProperty('--sprite-y', `${sprite.y}px`);
    });
    battleCore?.syncPartyHudAll?.();
  };

  refs.contentEntry.querySelector('[data-admin-toggle]')?.addEventListener('click', () => {
    if (!adminAllowed) return;
    state.adminMode = !state.adminMode;
    saveAppState(state);
    rerenderCollection();
  });

  refs.contentEntry.querySelectorAll('[data-admin-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!activeUnit || !adminAllowed) return;
      const delta = Number(button.dataset.adminStep || 0);
      stepAdminVisualUnit(delta);
    });
  });

  refs.contentEntry.querySelectorAll('[data-visual-kind][data-visual-field]').forEach((input) => {
    input.addEventListener('input', () => {
      if (!activeUnit || !adminAllowed) return;
      const kind = input.dataset.visualKind;
      const field = input.dataset.visualField;
      const profile = setUnitVisualProfileValue(state, activeUnit, kind, field, fromVisualControlValue(field, input.value));
      const controlValue = toVisualControlValue(field, profile[field]);
      refs.contentEntry.querySelectorAll(`[data-visual-kind="${kind}"][data-visual-field="${field}"]`).forEach((control) => {
        control.value = controlValue;
      });
      applyVisualVars();
      saveAppState(state);
      scheduleSave();
    });
    input.addEventListener('change', () => {
      if (visualCloudSaveTimer) {
        window.clearTimeout(visualCloudSaveTimer);
        visualCloudSaveTimer = null;
      }
      save({ silent: true });
    });
  });

  refs.contentEntry.querySelectorAll('[data-visual-preset-value]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!activeUnit || !adminAllowed) return;
      const kind = button.dataset.visualPresetKind;
      const field = button.dataset.visualPresetField;
      const value = Number(button.dataset.visualPresetValue);
      const profile = setUnitVisualProfileValue(state, activeUnit, kind, field, value);
      const controlValue = toVisualControlValue(field, profile[field]);
      refs.contentEntry.querySelectorAll(`[data-visual-kind="${kind}"][data-visual-field="${field}"]`).forEach((control) => {
        control.value = controlValue;
      });
      applyVisualVars();
      saveAppState(state);
      scheduleSave();
    });
  });

  refs.contentEntry.querySelectorAll('[data-visual-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!activeUnit || !adminAllowed) return;
      resetUnitVisualProfile(state, activeUnit, button.dataset.visualReset || 'all');
      save({ silent: true });
      const grid = refs.contentEntry.querySelector('.collection-grid');
      rerenderCollection({ anchorKey: collectionSelectedKey, scrollTop: grid?.scrollTop ?? null });
    });
  });

  refs.contentEntry.querySelector('[data-visual-apply-line]')?.addEventListener('click', async (event) => {
    if (!activeUnit || !adminAllowed) return;
    applyVisualVars();
    await applySelectedPromotionLine(event.currentTarget);
  });

  refs.contentEntry.querySelector('[data-visual-save]')?.addEventListener('click', async (event) => {
    if (!activeUnit || !adminAllowed) return;
    const button = event.currentTarget;
    button.textContent = '저장중';
    await saveAdminVisualNow();
  });

  refs.contentEntry.querySelectorAll('[data-collection-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      collectionFilter = button.dataset.collectionFilter || 'all';
      rerenderCollection({ scrollTop: 0 });
    });
  });

  refs.contentEntry.querySelectorAll('[data-collection-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      collectionSortMode = button.dataset.collectionSort || 'starsDesc';
      rerenderCollection({ anchorKey: collectionSelectedKey, scrollTop: 0 });
    });
  });

  refs.contentEntry.querySelectorAll('[data-collection-key]').forEach((button) => {
    button.addEventListener('click', () => {
      const grid = button.closest('.collection-grid');
      const anchorTop = grid ? button.offsetTop - grid.scrollTop : null;
      const scrollTop = grid?.scrollTop ?? null;
      collectionSelectedKey = button.dataset.collectionKey || null;
      rerenderCollection({ anchorKey: collectionSelectedKey, anchorTop, scrollTop });
    });
  });
}

function renderPvpScreen() {
  return `
    <section class="info-screen">
      <div class="info-head">
        <div>
          <span class="info-eyebrow">PVP BATTLE</span>
          <h2>PVP</h2>
        </div>
        <div class="info-power">
          <span>방어 전투력</span>
          <strong>${formatNumber(getPartyPower(state))}</strong>
        </div>
      </div>
      <div class="info-mode-grid">
        <button class="info-mode" type="button">
          <span>일반</span>
          <strong>운영중</strong>
        </button>
        <button class="info-mode is-active" type="button">
          <span>PVP</span>
          <strong>준비중</strong>
        </button>
      </div>
      <div class="info-party-list">
        <div class="info-section-title">예정 보상</div>
        <div class="info-party-row">
          <span class="info-party-row__name">특수 티켓</span>
          <span class="info-party-row__role">PVP</span>
          <span class="info-party-row__row">시즌</span>
          <span class="info-party-row__fit info-party-row__fit--good">예정</span>
          <strong>0</strong>
        </div>
      </div>
    </section>
  `;
}

refs.navItems.forEach((button) => {
  button.addEventListener('click', () => {
    state.currentScreen = button.dataset.screen;
    if (state.currentScreen === 'home') lastPanelScreen = null;
    saveAppState(state);
    renderScreen();
  });
});

desktopQuery.addEventListener?.('change', renderScreen);

window.addEventListener('beforeunload', () => {
  if (visualCloudSaveTimer) {
    window.clearTimeout(visualCloudSaveTimer);
    visualCloudSaveTimer = null;
  }
  saveAppState(state);
  battleCore?.destroy();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save({ silent: true, showStatus: false });
});

renderScreen();
initAuth({ state, renderScreen });
