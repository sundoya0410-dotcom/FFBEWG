// auth.js — 구글 로그인 / 닉네임 설정 / Firebase Auth 상태 감지
import { loginWithGoogle, logout, onUserChange, loadUserData, saveUserData } from './firebase.js';
import { FULL_UNIT_LIBRARY } from './unit-data.js';
import {
  createPersistedState,
  normalizeEquipmentState,
  normalizePartyFormation,
  normalizeVisualProfiles,
  saveAppState,
} from './utils.js';

const ADMIN_EMAIL = 'sundoya0410@gmail.com';
const REMEMBER_LOGIN_KEY = 'ffbewg-remember-login';
const REMEMBER_EMAIL_KEY = 'ffbewg-remember-email';

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function getRememberedLogin() {
  return {
    enabled: localStorage.getItem(REMEMBER_LOGIN_KEY) === '1',
    email: normalizeEmail(localStorage.getItem(REMEMBER_EMAIL_KEY) || ''),
  };
}

function saveRememberedLogin(enabled, email = '') {
  if (!enabled) {
    localStorage.removeItem(REMEMBER_LOGIN_KEY);
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
    return;
  }
  localStorage.setItem(REMEMBER_LOGIN_KEY, '1');
  if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, normalizeEmail(email));
}

function hydrateSavedUnits(units = []) {
  if (!Array.isArray(units)) return null;
  return units.map((u) => {
    const base = FULL_UNIT_LIBRARY.find((b) => b.folderKey === u.folderKey || b.id === u.id);
    if (base) return {
      ...base,
      ...u,
      // 마스터 데이터 항목은 항상 unit-data.js 기준으로 덮어씌움
      role:        base.role,
      element:     base.element,
      jobType:     base.jobType,
      job:         base.job,
      jobRoles:    base.jobRoles,
      battleRole:  base.battleRole || base.role,
      stars:       base.stars,
      minTier:     base.minTier,
      maxTier:     base.maxTier,
      tierFolders: base.tierFolders,
    };
    return u;
  }).filter((u) => u.tierFolders);
}

function countVisualProfiles(profiles) {
  const normalized = normalizeVisualProfiles(profiles || {});
  return Object.keys(normalized.portraits || {}).length + Object.keys(normalized.sprites || {}).length;
}

function pickVisualProfiles(localProfiles, remoteProfiles, localSavedAt, remoteSavedAt) {
  const local = normalizeVisualProfiles(localProfiles || {});
  const remote = normalizeVisualProfiles(remoteProfiles || {});
  const localCount = countVisualProfiles(local);
  const remoteCount = countVisualProfiles(remote);

  if (remoteCount <= 0 && localCount > 0) return local;
  if (localCount <= 0 && remoteCount > 0) return remote;
  if (remoteSavedAt > localSavedAt) return remote;
  if (localSavedAt > remoteSavedAt) return local;

  return {
    portraits: { ...local.portraits, ...remote.portraits },
    sprites: { ...local.sprites, ...remote.sprites },
  };
}

function hasProgress(snapshot = {}) {
  return Boolean(
    snapshot.nickname ||
    (Array.isArray(snapshot.units) && snapshot.units.length) ||
    countVisualProfiles(snapshot.visualProfiles) > 0 ||
    (Array.isArray(snapshot.equipment?.inventory) && snapshot.equipment.inventory.length)
  );
}

function applyRemoteState(state, remote) {
  if (remote.resources) Object.assign(state.resources, remote.resources);
  if (remote.home) Object.assign(state.home, remote.home);
  if (remote.party) {
    Object.assign(state.party, remote.party);
    state.party.formation = normalizePartyFormation(state.party.formation);
  }
  if (remote.nickname) state.nickname = remote.nickname;
  state.equipment = normalizeEquipmentState(remote.equipment || state.equipment);

  const remoteUnits = hydrateSavedUnits(remote.units);
  if (remoteUnits?.length) state.units = remoteUnits;
}

export function initAuth({ state, renderScreen }) {
  // Auth 상태 감지 — 로그인 여부에 따라 화면 진입
  onUserChange(async (user) => {
    if (user) {
      state._currentUid = user.uid;
      const providerEmail = user.providerData?.find((provider) => provider?.email)?.email || '';
      state._currentEmail = normalizeEmail(user.email || providerEmail);
      if (state._currentEmail !== ADMIN_EMAIL) state.adminMode = false;
      try {
        const remote = await loadUserData(user.uid);
        const localSnapshot = createPersistedState(state, Number(state._savedAt) || 0);
        const localSavedAt = Number(localSnapshot._savedAt) || 0;
        const remoteSavedAt = Number(remote?._savedAt) || 0;
        const localHasProgress = hasProgress(localSnapshot);
        const remoteHasProgress = hasProgress(remote || {});

        if (remote) {
          if (localHasProgress && !remoteHasProgress) {
            if (remote.nickname && !state.nickname) state.nickname = remote.nickname;
            await saveUserData(user.uid, createPersistedState(state));
          } else if (remoteSavedAt > localSavedAt || !localHasProgress) {
            applyRemoteState(state, remote);
          } else if (localSavedAt > remoteSavedAt && localHasProgress) {
            if (remote.nickname && !state.nickname) state.nickname = remote.nickname;
            await saveUserData(user.uid, createPersistedState(state));
          } else {
            applyRemoteState(state, remote);
          }

          state.visualProfiles = pickVisualProfiles(state.visualProfiles, remote.visualProfiles, localSavedAt, remoteSavedAt);
          state._savedAt = Math.max(localSavedAt, remoteSavedAt);
          saveAppState(state);
        } else if (localHasProgress) {
          await saveUserData(user.uid, createPersistedState(state));
        }
        // 닉네임 없으면 설정 화면
        if (!state.nickname) {
          hideLoginScreen();
          showNicknameScreen({ state, renderScreen });
          return;
        }
      } catch (e) {
        console.warn('[FFBEWG] cloud load failed:', e);
      }
      hideLoginScreen();
      if (state._currentEmail !== ADMIN_EMAIL) state.adminMode = false;
      renderScreen();
    } else {
      state._currentUid = null;
      state._currentEmail = '';
      state.adminMode = false;
      showLoginScreen();
    }
  });

  // 메뉴 버튼 → 로그아웃
  document.querySelector('.menu-btn').addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await logout();
    }
  });
}

export function showLoginScreen() {
  let el = document.getElementById('loginScreen');
  if (!el) {
    const remembered = getRememberedLogin();
    el = document.createElement('div');
    el.id = 'loginScreen';
    el.className = 'login-screen';
    el.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <img src="./images/logos/logos-transparent.png" alt="FFBEWG" draggable="false">
        </div>
        <div class="login-sub">FINAL FANTASY BE · WEB GAME</div>
        <div class="login-remembered" id="rememberedLoginBox" style="${remembered.enabled && remembered.email ? '' : 'display:none'}">
          <span>기억한 계정</span>
          <strong id="rememberedEmail">${remembered.email}</strong>
        </div>
        <button class="login-btn" id="loginBtn">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
          <span id="loginBtnText">${remembered.enabled && remembered.email ? '기억한 계정으로 로그인' : 'Google로 로그인'}</span>
        </button>
        <button class="login-alt-btn" id="loginOtherBtn" type="button" style="${remembered.enabled && remembered.email ? '' : 'display:none'}">
          다른 Google 계정 사용
        </button>
        <label class="login-remember">
          <input id="rememberLoginCheck" type="checkbox" ${remembered.enabled ? 'checked' : ''}>
          <span>이 계정 기억하기</span>
        </label>
        <p class="login-note">로그인하면 소환 데이터가 클라우드에 저장됩니다</p>
      </div>`;
    document.body.appendChild(el);
    const rememberCheck = document.getElementById('rememberLoginCheck');
    const login = async (useRemembered = true) => {
      const saved = getRememberedLogin();
      const hint = useRemembered && saved.enabled ? saved.email : '';
      try {
        const user = await loginWithGoogle(hint, !useRemembered);
        const providerEmail = user.providerData?.find((provider) => provider?.email)?.email || '';
        saveRememberedLogin(rememberCheck.checked, user.email || providerEmail || hint);
      }
      catch (e) { alert('로그인 실패: ' + e.message); }
    };
    document.getElementById('loginBtn').addEventListener('click', () => login(true));
    document.getElementById('loginOtherBtn').addEventListener('click', () => login(false));
    rememberCheck.addEventListener('change', () => {
      if (!rememberCheck.checked) saveRememberedLogin(false);
    });
  } else {
    const remembered = getRememberedLogin();
    const box = document.getElementById('rememberedLoginBox');
    const email = document.getElementById('rememberedEmail');
    const text = document.getElementById('loginBtnText');
    const otherBtn = document.getElementById('loginOtherBtn');
    const check = document.getElementById('rememberLoginCheck');
    if (box) box.style.display = remembered.enabled && remembered.email ? '' : 'none';
    if (email) email.textContent = remembered.email;
    if (text) text.textContent = remembered.enabled && remembered.email ? '기억한 계정으로 로그인' : 'Google로 로그인';
    if (otherBtn) otherBtn.style.display = remembered.enabled && remembered.email ? '' : 'none';
    if (check) check.checked = remembered.enabled;
  }
  el.style.display = 'flex';
  document.querySelector('.app').style.display = 'none';
}

export function hideLoginScreen() {
  const el = document.getElementById('loginScreen');
  if (el) el.style.display = 'none';
  document.querySelector('.app').style.display = '';
}

function validateNickname(nick) {
  const korean  = /^[가-힣]+$/;
  const english = /^[a-zA-Z0-9_]+$/;
  if (korean.test(nick)) {
    if (nick.length < 2 || nick.length > 8) return '한글 닉네임은 2~8자여야 해요.';
    return null;
  }
  if (english.test(nick)) {
    if (nick.length < 3 || nick.length > 16) return '영문 닉네임은 3~16자여야 해요.';
    return null;
  }
  return '한글 또는 영문(숫자/언더스코어 포함)만 사용 가능해요.';
}

function showNicknameScreen({ state, renderScreen }) {
  let el = document.getElementById('nicknameScreen');
  if (!el) {
    el = document.createElement('div');
    el.id = 'nicknameScreen';
    el.className = 'login-screen';
    el.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <img src="./images/logos/logos-transparent.png" alt="FFBEWG" draggable="false">
        </div>
        <div class="login-sub">닉네임을 정해주세요</div>
        <div class="nick-rules">
          <span>한글 2~8자</span>
          <span class="nick-rules__sep">·</span>
          <span>영문 3~16자</span>
        </div>
        <input id="nickInput" class="nick-input" type="text" maxlength="16" placeholder="닉네임 입력" autocomplete="off">
        <p id="nickError" class="nick-error"></p>
        <button class="login-btn" id="nickConfirmBtn" style="background:linear-gradient(135deg,#1a3a6e,#2a5298);color:#fff;">
          확인
        </button>
      </div>`;
    document.body.appendChild(el);

    const input = document.getElementById('nickInput');
    const errEl = document.getElementById('nickError');
    const btn   = document.getElementById('nickConfirmBtn');

    input.addEventListener('input', () => {
      const err = validateNickname(input.value.trim());
      errEl.textContent = err || '';
      errEl.style.color = err ? '#ff6b6b' : '#56ea9e';
    });

    btn.addEventListener('click', async () => {
      const nick = input.value.trim();
      const err  = validateNickname(nick);
      if (err) { errEl.textContent = err; errEl.style.color = '#ff6b6b'; return; }
      try {
        state.nickname = nick;
        const persisted = saveAppState(state);
        await saveUserData(state._currentUid, persisted);
        el.style.display = 'none';
        document.querySelector('.app').style.display = '';
        renderScreen();
      } catch (e) {
        errEl.textContent = '저장 실패. 다시 시도해주세요.';
        errEl.style.color = '#ff6b6b';
      }
    });

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  }
  el.style.display = 'flex';
  document.querySelector('.app').style.display = 'none';
}
