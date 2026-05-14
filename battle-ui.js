import {
  GROUND_DATA,
  MONSTER_RENDER_PROFILE,
  formatNumber,
  renderStars,
  resolveGround,
  resolveMonsterSprite,
  resolveUnitSprite,
  resolveUnitFolder,
} from './assets.js';
import { clamp, pickAlive, createImg, measureGifDuration, getGifFrameDelays, setBattleSpeed } from './battle-shared.js';

export function attachBattleUI(HomeBattleCore) {
  Object.assign(HomeBattleCore.prototype, {
renderShell() {
  if (!this.root) return;
  this.root.innerHTML = `
    <section class="home-battle">
      <div class="home-battle__topline">
        <div class="home-chip home-chip--nick" id="nickChip"></div>
        <div class="home-chip" id="waveChip"></div>
        <button class="home-chip home-chip--button" id="fieldChip" type="button"></button>
      </div>

      <div class="battle-arena-wrap" id="battleArenaWrap">
        <div class="battle-arena" id="battleArena">
          <div class="battle-bg" id="battleBg"></div>
          <div class="battle-floor" id="battleFloor"></div>
          <div class="battle-mapinfo" id="battleMapInfo"></div>
          <div class="battle-layer battle-layer--enemies" id="enemyLayer"></div>
          <div class="battle-layer battle-layer--fx" id="fxLayer"></div>
        </div>
        <div class="battle-layer battle-layer--allies" id="allyLayer"></div>
      </div>

      <div class="battle-actions">
        <button class="action-btn" id="claimBtn" type="button">CHECK<br />방치 수익</button>
        <button class="action-btn" id="autoBtn" type="button">AUTO READY<br />전투 시작</button>
        <button class="action-btn action-btn--speed" id="speedBtn" type="button">1.0x</button>
        <button class="action-btn action-btn--cutscene" id="cutsceneBtn" type="button">연출 OFF</button>
      </div>
    </section>

    <div class="modal-backdrop" id="groundModal" hidden>
      <div class="modal-card">
        <div class="modal-title">사냥터 선택</div>
        <div class="ground-grid" id="groundGrid"></div>
        <button class="modal-close" id="closeGroundModal" type="button">닫기</button>
      </div>
    </div>
  `;

  this.dom.waveChip = this.root.querySelector('#waveChip');
  this.dom.fieldChip = this.root.querySelector('#fieldChip');
  this.dom.nickChip = this.root.querySelector('#nickChip');
  this.dom.battleMapInfo = this.root.querySelector('#battleMapInfo');
  this.dom.battleBg = this.root.querySelector('#battleBg');
  this.dom.battleArena = this.root.querySelector('#battleArena');
  this.dom.enemyLayer = this.root.querySelector('#enemyLayer');
  this.dom.allyLayer = this.root.querySelector('#allyLayer');
  this.dom.fxLayer = this.root.querySelector('#fxLayer');
  this.dom.claimBtn = this.root.querySelector('#claimBtn');
  this.dom.autoBtn = this.root.querySelector('#autoBtn');
  this.dom.speedBtn = this.root.querySelector('#speedBtn');
  this.dom.cutsceneBtn = this.root.querySelector('#cutsceneBtn');
  this.dom.groundModal = this.root.querySelector('#groundModal');
  this.dom.groundGrid = this.root.querySelector('#groundGrid');
  this.dom.closeGroundModal = this.root.querySelector('#closeGroundModal');

  this.dom.claimBtn.addEventListener('click', () => this.claimRewards());
  this.dom.autoBtn.addEventListener('click', () => {
    this.state.home.autoRunning = !this.state.home.autoRunning;
    this.onStateChange();
    this.syncStaticUI();
  });
  this.dom.fieldChip.addEventListener('click', () => this.openGroundModal());
  this._speed = 1.0;
  this.dom.speedBtn.addEventListener('click', () => {
    const steps = [1.0, 2.0, 3.0, 4.0];
    const idx = steps.indexOf(this._speed);
    this._speed = steps[(idx + 1) % steps.length];
    setBattleSpeed(this._speed);
    this.dom.speedBtn.textContent = this._speed.toFixed(1) + 'x';
    this.dom.speedBtn.classList.toggle('is-fast', this._speed > 1.0);
    this.dom.speedBtn.dataset.speed = this._speed;
  });
  this._cutsceneOn = false; // 기본 OFF
  this.dom.cutsceneBtn.addEventListener('click', () => {
    this._cutsceneOn = !this._cutsceneOn;
    this.dom.cutsceneBtn.textContent = this._cutsceneOn ? '연출 ON' : '연출 OFF';
    this.dom.cutsceneBtn.classList.toggle('is-on', this._cutsceneOn);
  });
  this.dom.closeGroundModal.addEventListener('click', () => this.closeGroundModal());
  this.dom.groundModal.addEventListener('click', (event) => {
    if (event.target === this.dom.groundModal) this.closeGroundModal();
  });

  this.renderGroundOptions();
  this.buildCombatantNodes();
},

renderGroundOptions() {
  this.dom.groundGrid.innerHTML = Object.entries(GROUND_DATA)
    .map(([groundId, ground]) => `
      <button class="ground-option${this.state.home.groundId === groundId ? ' is-active' : ''}" data-ground="${groundId}" type="button">
        <span>${ground.label}</span>
      </button>
    `)
    .join('');

  this.dom.groundGrid.querySelectorAll('[data-ground]').forEach((button) => {
    button.addEventListener('click', () => {
      this.state.home.groundId = button.dataset.ground;
      this.spawnEncounter();
      this.buildCombatantNodes();
      this.syncStaticUI();
      this.syncAll();
      this.onStateChange();
      this.closeGroundModal();
    });
  });
},

openGroundModal() {
  this.dom.groundModal.hidden = false;
},

closeGroundModal() {
  this.dom.groundModal.hidden = true;
},

buildCombatantNodes() {
  this.dom.enemyLayer.innerHTML = '';
  this.dom.allyLayer.innerHTML = '';
  this.dom.fxLayer.innerHTML = '';

  this.enemies.forEach((enemy) => {
    const node = document.createElement('div');
    node.className = 'combatant combatant--enemy';
    node.dataset.id = enemy.id;
    node.appendChild(createImg(resolveMonsterSprite(enemy.monsterId, 'idle', enemy.isBoss), enemy.monsterId));
    const hp = document.createElement('div');
    hp.className = 'enemy-hp';
    hp.innerHTML = '<span></span>';
    node.appendChild(hp);
    enemy.node = node;
    enemy.sprite = node.querySelector('img');
    enemy.hpFill = hp.querySelector('span');
    this.dom.enemyLayer.appendChild(node);
  });

  this.allies.forEach((ally) => {
    const node = document.createElement('div');
    node.className = 'combatant combatant--ally';
    node.dataset.id = ally.id;
    node.appendChild(createImg(resolveUnitSprite(ally.unit, 'idle'), ally.unit.name));
    const hpBar = document.createElement('div');
    hpBar.className = 'ally-hp';
    hpBar.innerHTML = '<span></span>';
    node.appendChild(hpBar);
    ally.node = node;
    ally.sprite = node.querySelector('img');
    ally.hpFill = hpBar.querySelector('span');
    this.dom.allyLayer.appendChild(node);
  });
},

syncStaticUI() {
  const ground = resolveGround(this.state.home.groundId);
  const wave = this.state.home.wave;
  const isBossWave = wave % 5 === 0;
  const toNextBoss = 5 - (wave % 5 || 5);
  const bossProgress = 5 - toNextBoss; // 0~4
  const enemyAlive = pickAlive(this.enemies).length;

  this.dom.waveChip.innerHTML = isBossWave
    ? `<span class="chip-label">BOSS WAVE</span>
       <span class="chip-boss-hint">CLEAR 💎 +150</span>`
    : `<span class="chip-label">WAVE ${wave} · ${enemyAlive}마리</span>
       <span class="chip-boss-hint">BOSS -${toNextBoss} <span class="chip-pips">${'◆'.repeat(bossProgress)}${'◇'.repeat(5 - bossProgress)}</span></span>`;

  this.dom.fieldChip.innerHTML =
    `<span class="chip-label">FIELD</span>
     <span class="chip-change">변경 ▾</span>`;

  // 닉네임 칩
  if (this.dom.nickChip) {
    const nick = (this.state && this.state.nickname) || '';
    this.dom.nickChip.innerHTML = nick
      ? `<span class="chip-label">PLAYER</span><span class="chip-nick">${nick}</span>`
      : '';
  }

  // 맵 좌상단 정보
  if (this.dom.battleMapInfo) {
    this.dom.battleMapInfo.innerHTML = isBossWave
      ? `<span class="mapinfo-wave mapinfo-wave--boss">W ${wave}</span><span class="mapinfo-field">${ground.label}</span>`
      : `<span class="mapinfo-wave">W ${wave}</span><span class="mapinfo-field">${ground.label}</span>`;
  }
  this.dom.battleBg.style.backgroundImage = `url('${ground.background}')`;
  this.dom.autoBtn.classList.toggle('is-off', !this.state.home.autoRunning);
  this.dom.autoBtn.innerHTML = this.state.home.autoRunning
    ? 'AUTO READY<br />전투 시작'
    : 'AUTO STOP<br />전투 정지';
  this.renderGroundOptions();
},

showLimitCutscene(actor) {
  document.querySelector('#limitOverlay')?.remove();

  const folder = resolveUnitFolder(actor.unit);
  const limitSrc = folder ? `${folder}/limit.gif` : '';

  const overlay = document.createElement('div');
  overlay.id = 'limitOverlay';

  const img = document.createElement('img');
  img.id = 'limitSprite';
  img.alt = actor.unit.name;

  const nameEl = document.createElement('div');
  nameEl.id = 'limitName';
  nameEl.textContent = actor.unit.name;

  const labelEl = document.createElement('div');
  labelEl.id = 'limitLabel';
  labelEl.textContent = 'LIMIT BREAK';

  overlay.appendChild(img);
  overlay.appendChild(nameEl);
  overlay.appendChild(labelEl);

  const stage = document.getElementById('partyStage') || document.body;
  stage.appendChild(overlay);

  // 탭/클릭으로 스킵
  overlay.addEventListener('click', () => {
    this.hideLimitCutscene();
    // limitDurationPromise resolve 강제 처리
    if (actor._limitSkipResolve) {
      actor.gifDuration = 0;            // waitForGif 즉시 통과
      actor.gifDurationPromise = Promise.resolve(0); // 혹시 pending 중인 것도
      actor._limitSkipResolve();
      actor._limitSkipResolve = null;
    }
  }, { once: true });

  actor.limitDurationPromise = getGifFrameDelays(limitSrc).then(delays => {
    const totalMs = (delays && delays.length > 0)
      ? delays.reduce((a, b) => a + b, 0)
      : 5000;
    actor.gifDuration = totalMs;

    img.onload = () => {
      const gw = img.naturalWidth  || 200;
      const gh = img.naturalHeight || 200;

      // 오프스크린에 첫 프레임 그려서 캐릭터 중심점 1회 계산
      const off = document.createElement('canvas');
      off.width = gw; off.height = gh;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(img, 0, 0);

      let cx = gw / 2; // 기본값: GIF 가로 중심
      let cy = gh / 2; // 기본값: GIF 세로 중심

      try {
        const d = offCtx.getImageData(0, 0, gw, gh).data;
        let minX = gw, minY = gh, maxX = 0, maxY = 0, found = false;
        for (let y = 0; y < gh; y++) {
          for (let x = 0; x < gw; x++) {
            if (d[(y * gw + x) * 4 + 3] > 15) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }
        if (found) {
          cx = (minX + maxX) / 2;
          cy = (minY + maxY) / 2;
        }
      } catch(e) {}

      // 오버레이 중앙 기준으로 img 위치 고정
      // img는 원본 크기 그대로, 캐릭터 중심이 overlay 정중앙에 오도록 translate
      const ow = overlay.offsetWidth  || 300;
      const oh = overlay.offsetHeight || 500;
      const tx = (ow / 2) - cx;
      const ty = (oh / 2) - cy;
      img.style.position  = 'absolute';
      img.style.top       = '0';
      img.style.left      = '0';
      img.style.width     = gw + 'px';
      img.style.height    = gh + 'px';
      img.style.maxWidth  = 'none';
      img.style.maxHeight = 'none';
      img.style.transform = `translate(${tx}px, ${ty}px)`;

      // totalMs 후 img src 비워서 GIF 루프 중단 (마지막 프레임 고정)
      setTimeout(() => { img.src = ''; }, totalMs);
    };

    img.src = limitSrc;
    return totalMs;
  });
},


hideLimitCutscene() {
  const overlay = document.querySelector('#limitOverlay');
  if (!overlay) return;
  overlay.classList.add('is-out');
  setTimeout(() => overlay.remove(), 400);
},

syncAll() {
  this.enemies.forEach((enemy) => this.syncCombatant(enemy));
  this.allies.forEach((ally) => this.syncCombatant(ally));
},

setActiveActor(actor) {
  this.activeActorId = actor?.id || null;
  this.syncAll();
},

clearActiveActor() {
  this.activeActorId = null;
  this.syncAll();
},

syncCombatant(actor) {
  if (!actor.node) return;
  actor.node.style.left = `${actor.x}%`;
  actor.node.style.bottom = `${actor.y}%`;
  actor.node.style.zIndex = String(actor.team === 'ally' ? 2000 - Math.round(actor.y * 10) : 1000 - Math.round(actor.y * 10));
  // y=2(앞쪽) → scale 1.0, y=30(뒤쪽) → scale 0.52 — 원근 그림자
  const shadowScale = Math.max(0.52, 1.0 - actor.y * 0.016);
  actor.node.style.setProperty('--shadow-scale', shadowScale.toFixed(2));
  const profile = actor.team === 'ally'
    ? actor.renderProfile
    : { scale: 1, shiftX: 0, shiftY: 0, size: actor.isBoss ? MONSTER_RENDER_PROFILE.bossSize : MONSTER_RENDER_PROFILE.size };
  actor.node.style.setProperty('--scale', actor.team === 'ally' ? 1 : (profile.scale || 1));
  actor.node.style.setProperty('--shift-x', `${profile.shiftX || 0}px`);
  actor.node.style.setProperty('--shift-y', `${profile.shiftY || 0}px`);
  // 스프라이트 크기 100% 원본 고정 — --size 강제 주입 없음
  actor.node.style.removeProperty('--size');
  actor.node.classList.toggle('is-limit', actor.state === 'limit');
  actor.node.classList.toggle('is-hidden', actor.hp <= 0 && actor.state !== 'defeat');
  actor.node.classList.toggle('is-acting', actor.id === this.activeActorId);
  actor.node.classList.toggle('is-casting', actor.state === 'casting');
  actor.node.classList.toggle('is-hit', Boolean(actor.hitFlashUntil && actor.hitFlashUntil > performance.now()));
  actor.node.classList.toggle('is-guarded', Boolean(actor.effects?.guard));
  actor.node.classList.toggle('is-buffed', Boolean(actor.effects?.attackUp || actor.effects?.critUp));
  actor.node.classList.toggle('is-debuffed', Boolean(actor.effects?.break));

  const spriteState = actor.team === 'ally' ? actor.state : actor.state === 'attack' ? 'attack' : 'idle';
  const nextCandidates = actor.team === 'ally'
    ? resolveUnitSprite(actor.unit, spriteState)
    : resolveMonsterSprite(actor.monsterId, spriteState, actor.isBoss);

  if (actor.sprite && nextCandidates.length) {
    const stateChanged = actor.prevSpriteState !== spriteState;
    if (stateChanged) {
      actor.prevSpriteState = spriteState;
      actor.gifDuration = 0;
      let pointer = 1;
      const tryLoad = (src) => {
        actor.sprite.src = '';
        actor.sprite.src = src;
      };
      // gifDurationPromise: 로드+측정 완료를 알리는 Promise
      actor.gifDurationPromise = new Promise((resolve) => {
        actor.sprite.onload = () => {
          measureGifDuration(actor.sprite.src).then(ms => {
            actor.gifDuration = ms || 0;
            resolve(ms || 0);
          });
        };
        actor.sprite.onerror = () => {
          if (pointer >= nextCandidates.length) { resolve(0); return; }
          tryLoad(nextCandidates[pointer]);
          pointer += 1;
        };
      });
      tryLoad(nextCandidates[0]);
    }
  }

  if (actor.hpFill) {
    const rate = clamp((actor.hp / actor.maxHp) * 100, 0, 100);
    actor.hpFill.style.width = `${rate}%`;
  }
}
  });
}
