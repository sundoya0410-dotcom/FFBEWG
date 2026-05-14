// auth.js — 구글 로그인 / 닉네임 설정 / Firebase Auth 상태 감지
import { loginWithGoogle, logout, onUserChange, loadUserData, saveUserData } from './firebase.js';
import { FULL_UNIT_LIBRARY } from './unit-data.js';

export function initAuth({ state, renderScreen }) {
  // Auth 상태 감지 — 로그인 여부에 따라 화면 진입
  onUserChange(async (user) => {
    if (user) {
      state._currentUid = user.uid;
      try {
        const remote = await loadUserData(user.uid);
        if (remote && remote.resources) {
          // resources, home, party, nickname만 복원
          if (remote.resources) Object.assign(state.resources, remote.resources);
          if (remote.home)      Object.assign(state.home, remote.home);
          if (remote.party)     Object.assign(state.party, remote.party);
          if (remote.nickname)  state.nickname = remote.nickname;

          // units: FULL_UNIT_LIBRARY 기반으로 tierFolders 복원
          if (Array.isArray(remote.units) && remote.units.length) {
            state.units = remote.units.map(u => {
              const base = FULL_UNIT_LIBRARY.find(b => b.folderKey === u.folderKey || b.id === u.id);
              if (base) return {
                ...base, ...u,
                // 마스터 데이터 항목은 항상 unit-data.js 기준으로 덮어씌움
                role:        base.role,
                element:     base.element,
                stars:       base.stars,
                minTier:     base.minTier,
                maxTier:     base.maxTier,
                tierFolders: base.tierFolders,
              };
              return u;
            }).filter(u => u.tierFolders); // tierFolders 없는 구버전 유닛 제거
          } else {
            state.units = [];
          }
        }
        // 닉네임 없으면 설정 화면
        if (!remote || !remote.nickname) {
          hideLoginScreen();
          showNicknameScreen({ state, renderScreen });
          return;
        }
      } catch (e) {}
      hideLoginScreen();
      renderScreen();
    } else {
      state._currentUid = null;
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
    el = document.createElement('div');
    el.id = 'loginScreen';
    el.className = 'login-screen';
    el.innerHTML = `
      <div class="login-card">
        <div class="login-logo">✦ FFBEWG</div>
        <div class="login-sub">FINAL FANTASY BE · WEB GAME</div>
        <button class="login-btn" id="loginBtn">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
          Google로 로그인
        </button>
        <p class="login-note">로그인하면 소환 데이터가 클라우드에 저장됩니다</p>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('loginBtn').addEventListener('click', async () => {
      try { await loginWithGoogle(); }
      catch (e) { alert('로그인 실패: ' + e.message); }
    });
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
        <div class="login-logo">✦ FFBEWG</div>
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
        await saveUserData(state._currentUid, { nickname: nick });
        state.nickname = nick;
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
