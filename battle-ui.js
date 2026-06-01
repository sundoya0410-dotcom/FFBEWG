import {
  GROUND_DATA,
  MONSTER_RENDER_PROFILE,
  FORMATION_ROW_ICONS,
  FORMATION_ROW_LABELS,
  formatNumber,
  getFormationRoleFit,
  getGroundRewardInfo,
  getGroundStageState,
  getGroundUnlockRequirement,
  isGroundUnlocked,
  getRoleComboSummary,
  getRarityStyle,
  getSeriesSynergySummary,
  renderVisualVars,
  renderStars,
  getUnitBattleRole,
  getUnitJobRoles,
  resolveGround,
  resolveMonsterSprite,
  resolveUnitPortrait,
  resolveUnitSprite,
} from './assets.js';
import { clamp, pickAlive, createImg, createMedia, createMediaElement, isVideoSource, measureGifDuration, getGifFrameDelays } from './battle-shared.js';
import { getLimitBurstName } from './limit-data.js';

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
          <div class="battle-synergy-strip" id="battleSynergyStrip"></div>
          <div class="battle-layer battle-layer--enemies" id="enemyLayer"></div>
          <div class="battle-layer battle-layer--fx" id="fxLayer"></div>
        </div>
        <div class="battle-layer battle-layer--allies" id="allyLayer"></div>
      </div>

      <div class="battle-party-hud" id="battlePartyHud"></div>

      <div class="battle-actions">
        <button class="action-btn action-btn--info" id="resourceBtn" type="button">획득 자원<br />내역 보기</button>
        <button class="action-btn action-btn--info" id="battleStatsBtn" type="button">전투 통계<br />기록 보기</button>
        <button class="action-btn" id="autoBtn" type="button">AUTO READY<br />전투 시작</button>
      </div>
    </section>

    <div class="modal-backdrop" id="groundModal" hidden>
      <div class="modal-card">
        <div class="modal-title">사냥터 선택</div>
        <div class="ground-grid" id="groundGrid"></div>
        <button class="modal-close" id="closeGroundModal" type="button">닫기</button>
      </div>
    </div>

    <div class="modal-backdrop battle-info-modal" id="resourceModal" hidden>
      <div class="modal-card battle-info-card">
        <div class="modal-title">획득 자원</div>
        <div class="battle-info-body" id="resourceSummary"></div>
        <button class="modal-close" id="closeResourceModal" type="button">닫기</button>
      </div>
    </div>


    <div class="modal-backdrop stage-reward-modal" id="stageRewardModal" hidden>
      <div class="modal-card stage-reward-card">
        <div class="stage-reward-kicker" id="stageRewardKicker"></div>
        <div class="modal-title" id="stageRewardTitle"></div>
        <div class="stage-reward-body" id="stageRewardBody"></div>
        <div class="stage-reward-actions">
          <button class="modal-close stage-reward-next" id="stageRewardNext" type="button" hidden>다음 스테이지</button>
          <button class="modal-close" id="closeStageRewardModal" type="button">확인</button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop battle-info-modal" id="battleStatsModal" hidden>
      <div class="modal-card battle-info-card battle-info-card--wide">
        <div class="modal-title">전투 통계</div>
        <div class="battle-info-body" id="battleStatsSummary"></div>
        <button class="modal-close" id="closeBattleStatsModal" type="button">닫기</button>
      </div>
    </div>
  `;

  this.dom.waveChip = this.root.querySelector('#waveChip');
  this.dom.fieldChip = this.root.querySelector('#fieldChip');
  this.dom.nickChip = this.root.querySelector('#nickChip');
  this.dom.battleMapInfo = this.root.querySelector('#battleMapInfo');
  this.dom.battleSynergyStrip = this.root.querySelector('#battleSynergyStrip');
  this.dom.battleBg = this.root.querySelector('#battleBg');
  this.dom.battleArena = this.root.querySelector('#battleArena');
  this.dom.enemyLayer = this.root.querySelector('#enemyLayer');
  this.dom.allyLayer = this.root.querySelector('#allyLayer');
  this.dom.fxLayer = this.root.querySelector('#fxLayer');
  this.dom.battlePartyHud = this.root.querySelector('#battlePartyHud');
  this.dom.resourceBtn = this.root.querySelector('#resourceBtn');
  this.dom.battleStatsBtn = this.root.querySelector('#battleStatsBtn');
  this.dom.autoBtn = this.root.querySelector('#autoBtn');
  this.dom.groundModal = this.root.querySelector('#groundModal');
  this.dom.groundGrid = this.root.querySelector('#groundGrid');
  this.dom.closeGroundModal = this.root.querySelector('#closeGroundModal');
  this.dom.resourceModal = this.root.querySelector('#resourceModal');
  this.dom.resourceSummary = this.root.querySelector('#resourceSummary');
  this.dom.closeResourceModal = this.root.querySelector('#closeResourceModal');
  this.dom.battleStatsModal = this.root.querySelector('#battleStatsModal');
  this.dom.battleStatsSummary = this.root.querySelector('#battleStatsSummary');
  this.dom.closeBattleStatsModal = this.root.querySelector('#closeBattleStatsModal');
  this.dom.stageRewardModal = this.root.querySelector('#stageRewardModal');
  this.dom.stageRewardKicker = this.root.querySelector('#stageRewardKicker');
  this.dom.stageRewardTitle = this.root.querySelector('#stageRewardTitle');
  this.dom.stageRewardBody = this.root.querySelector('#stageRewardBody');
  this.dom.stageRewardNext = this.root.querySelector('#stageRewardNext');
  this.dom.closeStageRewardModal = this.root.querySelector('#closeStageRewardModal');

  this.dom.resourceBtn.addEventListener('click', () => this.openResourceModal());
  this.dom.battleStatsBtn.addEventListener('click', () => this.openBattleStatsModal());
  this.dom.autoBtn.addEventListener('click', () => {
    this.state.home.autoRunning = !this.state.home.autoRunning;
    this.onStateChange();
    this.syncStaticUI();
  });
  this.dom.fieldChip.addEventListener('click', () => this.openGroundModal());
  this.dom.closeGroundModal.addEventListener('click', () => this.closeGroundModal());
  this.dom.groundModal.addEventListener('click', (event) => {
    if (event.target === this.dom.groundModal) this.closeGroundModal();
  });
  this.dom.closeResourceModal.addEventListener('click', () => this.closeResourceModal());
  this.dom.resourceModal.addEventListener('click', (event) => {
    if (event.target === this.dom.resourceModal) this.closeResourceModal();
  });
  this.dom.closeBattleStatsModal.addEventListener('click', () => this.closeBattleStatsModal());
  this.dom.closeStageRewardModal.addEventListener('click', () => this.closeStageRewardModal());
  this.dom.stageRewardNext.addEventListener('click', () => this.goStageRewardNext());
  this.dom.battleStatsModal.addEventListener('click', (event) => {
    if (event.target === this.dom.battleStatsModal) this.closeBattleStatsModal();
  });

  this.renderGroundOptions();
  this.buildCombatantNodes();
},

getBattleRoleShort(role = '') {
  return {
    '물리 딜러': '⚔',
    '마법 딜러': '🔮',
    '탱커': '🛡',
    '버퍼': '✨',
    '디버퍼': '🩸',
    '힐러': '💚',
  }[role] || '•';
},

renderGroundOptions() {
  this.dom.groundGrid.innerHTML = Object.entries(GROUND_DATA)
    .map(([groundId, ground]) => {
      const stage = getGroundStageState(this.state, groundId);
      const rewards = getGroundRewardInfo(ground);
      const progress = Math.round(stage.progress * 100);
      const unlocked = isGroundUnlocked(this.state, groundId);
      const req = getGroundUnlockRequirement(this.state, groundId);
      const requirementText = req ? `${req.label} 클리어 필요` : '선행 스테이지 필요';
      return `
        <button class="ground-option${this.state.home.groundId === groundId ? ' is-active' : ''}${stage.cleared ? ' is-cleared' : ''}${unlocked ? '' : ' is-locked'}" data-ground="${groundId}" ${unlocked ? '' : 'disabled'} type="button">
          <span class="ground-option__chapter">${ground.chapter || 'STAGE'}</span>
          <strong>${ground.label}</strong>
          <em>${unlocked ? (stage.cleared ? 'CLEAR' : `목표 W${stage.targetWave}`) : 'LOCKED'}</em>
          <small>${unlocked ? `권장 ${formatNumber(ground.recommendedPower || 0)} · ${progress}%` : requirementText}</small>
          <i>첫 보상 💎${formatNumber(rewards.firstClear.gems || 0)} / 반복 💎${formatNumber(rewards.repeatBoss.gems || 0)}</i>
        </button>
      `;
    })
    .join('');

  this.dom.groundGrid.querySelectorAll('[data-ground]').forEach((button) => {
    button.addEventListener('click', () => {
      const groundId = button.dataset.ground;
      if (!isGroundUnlocked(this.state, groundId)) return;
      this.state.home.groundId = groundId;
      if (!this.state.home.stageBestWaves || typeof this.state.home.stageBestWaves !== 'object') this.state.home.stageBestWaves = {};
      this.state.home.wave = Math.max(1, Number(this.state.home.stageBestWaves[groundId]) || 1);
      this.state.home.winsToBoss = Math.max(1, 5 - (this.state.home.wave % 5 || 5));
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

openStageRewardModal(payload = {}) {
  if (!this.dom.stageRewardModal) return;
  this._stageRewardPayload = payload;
  const isFirstClear = payload.type === 'first-clear';
  const rewards = Array.isArray(payload.rewards) ? payload.rewards.filter((item) => Number(item.amount) > 0) : [];
  this.dom.stageRewardKicker.textContent = isFirstClear ? 'FIRST CLEAR' : 'BOSS CLEAR';
  this.dom.stageRewardTitle.textContent = payload.title || (isFirstClear ? '스테이지 클리어' : '보스 보상 획득');
  this.dom.stageRewardBody.innerHTML = `
    <p class="stage-reward-subtitle">${payload.subtitle || ''}</p>
    <div class="stage-reward-grid">
      ${rewards.map((reward) => `
        <div class="stage-reward-item">
          <span>${reward.label}</span>
          <strong>${reward.icon || ''}${formatNumber(reward.amount)}</strong>
        </div>
      `).join('')}
    </div>
    ${payload.nextGroundLabel ? `<div class="stage-reward-unlock"><span>해금</span><strong>${payload.nextGroundLabel}</strong></div>` : ''}
  `;
  if (payload.nextGroundId && isGroundUnlocked(this.state, payload.nextGroundId)) {
    this.dom.stageRewardNext.hidden = false;
    this.dom.stageRewardNext.textContent = `${payload.nextGroundLabel || '다음 스테이지'} 이동`;
  } else {
    this.dom.stageRewardNext.hidden = true;
  }
  this.dom.stageRewardModal.hidden = false;
},

closeStageRewardModal() {
  if (this.dom.stageRewardModal) this.dom.stageRewardModal.hidden = true;
},

goStageRewardNext() {
  const groundId = this._stageRewardPayload?.nextGroundId;
  if (!groundId || !GROUND_DATA[groundId] || !isGroundUnlocked(this.state, groundId)) return;
  this.state.home.groundId = groundId;
  if (!this.state.home.stageBestWaves || typeof this.state.home.stageBestWaves !== 'object') this.state.home.stageBestWaves = {};
  this.state.home.wave = Math.max(1, Number(this.state.home.stageBestWaves[groundId]) || 1);
  this.state.home.winsToBoss = Math.max(1, 5 - (this.state.home.wave % 5 || 5));
  this.spawnEncounter();
  this.buildCombatantNodes();
  this.syncStaticUI();
  this.syncAll();
  this.onStateChange();
  this.closeStageRewardModal();
},
openResourceModal() {
  this.renderResourceSummary();
  this.dom.resourceModal.hidden = false;
},

closeResourceModal() {
  this.dom.resourceModal.hidden = true;
},

openBattleStatsModal() {
  this.renderBattleStatsSummary();
  this.dom.battleStatsModal.hidden = false;
},

closeBattleStatsModal() {
  this.dom.battleStatsModal.hidden = true;
},

renderResourceSummary() {
  const earned = this.state.home.earnedResources || {};
  const rows = [
    ['골드', earned.gold || 0],
    ['다이아', earned.gems || 0],
    ['성장석', earned.growthStone || 0],
    ['클리어 웨이브', earned.waves || 0],
    ['보스 처치', earned.bosses || 0],
    ['첫 클리어', earned.firstClears || 0],
  ];
  this.dom.resourceSummary.innerHTML = `
    <div class="battle-info-grid">
      ${rows.map(([label, value]) => `
        <div class="battle-info-stat">
          <span>${label}</span>
          <strong>${formatNumber(value)}</strong>
        </div>
      `).join('')}
    </div>
    <p class="battle-info-note">전투 보상은 웨이브 클리어 시 자동으로 지급됩니다.</p>
  `;
},

renderBattleStatsSummary() {
  const stats = Object.values(this.state.home.battleStats || {})
    .sort((a, b) => (b.damage || 0) - (a.damage || 0) || (b.healing || 0) - (a.healing || 0));
  this.dom.battleStatsSummary.innerHTML = stats.length
    ? `<div class="battle-stats-table">
        <div class="battle-stats-row battle-stats-row--head">
          <span>유닛</span><span>딜</span><span>회복</span><span>버프</span><span>약화</span><span>처치</span>
        </div>
        ${stats.slice(0, 12).map((item) => `
          <div class="battle-stats-row">
            <strong>${item.name || '-'}</strong>
            <span>${formatNumber(item.damage || 0)}</span>
            <span>${formatNumber(item.healing || 0)}</span>
            <span>${formatNumber(item.buffs || 0)}</span>
            <span>${formatNumber(item.debuffs || 0)}</span>
            <span>${formatNumber(item.kills || 0)}</span>
          </div>
        `).join('')}
      </div>`
    : '<p class="battle-info-note">아직 기록된 전투 통계가 없습니다.</p>';
},

escapeTooltipText(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
},

describeSynergyEffect(item) {
  const statBonus = Number(item.statBonus || 0);
  const statMultiplier = Number(item.statMultiplier || 1);
  const statText = statBonus > 0
    ? `스탯 +${statBonus}%`
    : statMultiplier > 1
      ? `스탯 +${Math.round((statMultiplier - 1) * 100)}%`
      : '';
  return [`전투력 +${Number(item.bonus || 0)}%`, statText].filter(Boolean).join(', ');
},

describeSynergyCondition(item) {
  if (item.type === 'series') {
    return `${item.series} 유닛 ${item.count}명 편성`;
  }
  if (item.group === 'sameJob') {
    return item.job ? `${item.job} 4명 편성` : '같은 직업 4명 편성';
  }
  if (item.group === 'bond') {
    const members = Array.isArray(item.members) ? item.members.join(' / ') : '';
    return `${item.series ? `${item.series} ` : ''}${members} 중 ${item.min || 2}명 이상`;
  }
  if (item.requires && typeof item.requires === 'object') {
    return Object.entries(item.requires)
      .map(([job, amount]) => `${job} ${amount}명`)
      .join(' + ');
  }
  return '조건 충족 시 발동';
},

renderBattleSynergyStrip() {
  if (!this.dom.battleSynergyStrip) return;
  const series = getSeriesSynergySummary(this.state);
  const combo = getRoleComboSummary(this.state);
  const tags = [];

  if (series.bonus > 0) {
    tags.push({
      type: 'series',
      label: `${series.series} ${series.label}`,
      series: series.series,
      count: series.count,
      bonus: series.bonus,
      statMultiplier: series.statMultiplier,
      tone: series.tone || 'ok',
    });
  }

  (combo.active || []).slice(0, 5).forEach((item) => {
    tags.push({
      ...item,
      label: item.label,
      bonus: item.bonus,
      job: item.id?.startsWith('same-job-') ? item.label?.replace(/\s*결사대$/, '') : '',
      tone: item.group === 'bond' ? 'bond' : item.group === 'sameJob' ? 'same' : 'job',
    });
  });

  this.dom.battleSynergyStrip.hidden = !tags.length;
  this.dom.battleSynergyStrip.innerHTML = tags.length
    ? `<span class="battle-synergy-strip__label">SYNERGY</span>${tags.map((tag) => `
        <span class="battle-synergy-tag battle-synergy-tag--${tag.tone}" data-tip="${this.escapeTooltipText(`${tag.label}\n조건: ${this.describeSynergyCondition(tag)}\n효과: ${this.describeSynergyEffect(tag)}`)}" title="${this.escapeTooltipText(`${tag.label} / 조건: ${this.describeSynergyCondition(tag)} / 효과: ${this.describeSynergyEffect(tag)}`)}">
          <span class="battle-synergy-tag__name">${tag.label}</span><strong>+${tag.bonus}%</strong>
        </span>
      `).join('')}`
    : '';
},

buildCombatantNodes() {
  this.dom.enemyLayer.innerHTML = '';
  this.dom.allyLayer.innerHTML = '';
  this.dom.fxLayer.innerHTML = '';
  this.dom.battlePartyHud.innerHTML = '';

  this.enemies.forEach((enemy) => {
    const node = document.createElement('div');
    node.className = 'combatant combatant--enemy';
    node.dataset.id = enemy.id;
    node.appendChild(createMedia(resolveMonsterSprite(enemy.monsterId, 'idle', enemy.isBoss), enemy.monsterId));
    const hp = document.createElement('div');
    hp.className = 'enemy-hp';
    hp.innerHTML = '<span></span>';
    node.appendChild(hp);
    enemy.node = node;
    enemy.sprite = node.querySelector('img, video');
    enemy.hpFill = hp.querySelector('span');
    this.dom.enemyLayer.appendChild(node);
  });

  this.allies.forEach((ally) => {
    const node = document.createElement('div');
    node.className = 'combatant combatant--ally';
    node.dataset.id = ally.id;
    node.appendChild(createMedia(resolveUnitSprite(ally.unit, 'idle'), ally.unit.name));
    const hpBar = document.createElement('div');
    hpBar.className = 'ally-hp';
    hpBar.innerHTML = '<span></span>';
    node.appendChild(hpBar);
    ally.node = node;
    ally.sprite = node.querySelector('img, video');
    ally.hpFill = hpBar.querySelector('span');
    this.dom.allyLayer.appendChild(node);
  });

  this.allies.forEach((ally) => {
    const card = document.createElement('div');
    const level = Number(ally.unit.level || 1);
    const row = ally.unit.formationRow || 'back';
    const fit = getFormationRoleFit(ally.unit, row);
    const job = ally.unit.job || getUnitBattleRole(ally.unit) || ally.unit.role || '-';
    const roles = getUnitJobRoles(ally.unit).join(' / ');
    const partyTip = [
      ally.unit.name,
      `직업: ${job}`,
      roles ? `역할: ${roles}` : '',
      `배치: ${FORMATION_ROW_ICONS[row] || ''} ${FORMATION_ROW_LABELS[row] || row} / ${fit.label}`,
      `전투력: ${formatNumber(ally.unit.power || 0)}`,
    ].filter(Boolean).join('\n');
    card.className = 'battle-party-card';
    card.dataset.id = ally.id;
    card.dataset.partyTip = partyTip;
    card.title = partyTip;
    card.style.cssText = `${getRarityStyle(ally.unit)};${renderVisualVars(this.state, ally.unit)}`;
    card.innerHTML = `
      <div class="battle-party-card__portrait">
        <div class="battle-party-card__portrait-frame"></div>
      </div>
      <div class="battle-party-card__main">
        <div class="battle-party-card__top">
          <span class="battle-party-card__level">LV ${level}</span>
          <span class="battle-party-card__limit">LIMIT</span>
        </div>
        <div class="battle-party-card__name">${ally.unit.name}</div>
        <div class="battle-party-card__bar battle-party-card__bar--hp"><span></span></div>
        <div class="battle-party-card__row">
          <span>HP <strong data-hp-text></strong></span>
          <span>MP <strong data-mp-text></strong></span>
        </div>
        <div class="battle-party-card__bar battle-party-card__bar--limit"><span></span></div>
      </div>
      <span class="battle-party-card__tooltip">${this.escapeTooltipText(partyTip)}</span>
    `;
    ally.hudCard = card;
    ally.hudHpFill = card.querySelector('.battle-party-card__bar--hp span');
    ally.hudLimitFill = card.querySelector('.battle-party-card__bar--limit span');
    ally.hudHpText = card.querySelector('[data-hp-text]');
    ally.hudMpText = card.querySelector('[data-mp-text]');
    card.querySelector('.battle-party-card__portrait-frame').appendChild(createImg(resolveUnitPortrait(ally.unit), ally.unit.name));
    this.dom.battlePartyHud.appendChild(card);
    this.syncPartyHud(ally);
  });
},

syncPartyHud(actor) {
  if (!actor?.hudCard) return;
  const hpRate = actor.maxHp > 0 ? clamp(actor.hp / actor.maxHp, 0, 1) : 0;
  const limitRate = clamp((actor.actionCount || 0) / this.getLimitThreshold(actor), 0, 1);
  const mp = Number(actor.unit?.mp) || 0;

  actor.hudCard.style.cssText = `${getRarityStyle(actor.unit)};${renderVisualVars(this.state, actor.unit)}`;
  actor.hudCard.classList.toggle('is-active', actor.id === this.activeActorId);
  actor.hudCard.classList.toggle('is-dead', actor.hp <= 0);
  actor.hudCard.classList.toggle('is-danger', actor.hp > 0 && hpRate <= 0.3);
  actor.hudCard.classList.toggle('is-limit-ready', limitRate >= 1);

  if (actor.hudHpFill) actor.hudHpFill.style.width = `${Math.round(hpRate * 100)}%`;
  if (actor.hudLimitFill) actor.hudLimitFill.style.width = `${Math.round(limitRate * 100)}%`;
  if (actor.hudHpText) actor.hudHpText.textContent = `${formatNumber(actor.hp)}/${formatNumber(actor.maxHp)}`;
  if (actor.hudMpText) actor.hudMpText.textContent = formatNumber(mp);
},

syncPartyHudAll() {
  this.allies.forEach((ally) => this.syncPartyHud(ally));
},

syncStaticUI() {
  const ground = resolveGround(this.state.home.groundId);
  const stage = getGroundStageState(this.state);
  const rewards = getGroundRewardInfo(ground);
  const wave = this.state.home.wave;
  const isBossWave = wave % 5 === 0;
  const toNextBoss = 5 - (wave % 5 || 5);
  const bossProgress = 5 - toNextBoss; // 0~4
  const enemyAlive = pickAlive(this.enemies).length;

  this.dom.waveChip.innerHTML = isBossWave
    ? `<span class="chip-label">BOSS WAVE</span>
       <span class="chip-boss-hint">CLEAR 💎 +${formatNumber(rewards.repeatBoss.gems || 0)}</span>`
    : `<span class="chip-label">WAVE ${wave} · ${enemyAlive}마리</span>
       <span class="chip-boss-hint">목표 W${stage.targetWave} · BOSS -${toNextBoss} <span class="chip-pips">${'◆'.repeat(bossProgress)}${'◇'.repeat(5 - bossProgress)}</span></span>`;

  this.dom.fieldChip.innerHTML =    `<span class="chip-label">FIELD</span>
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
      ? `<span class="mapinfo-wave mapinfo-wave--boss">W ${wave}</span><span class="mapinfo-field">${ground.label} · ${stage.cleared ? 'CLEAR' : `목표 W${stage.targetWave}`}</span>`
      : `<span class="mapinfo-wave">W ${wave}</span><span class="mapinfo-field">${ground.label} · ${Math.round(stage.progress * 100)}%</span>`;
  }
  this.renderBattleSynergyStrip();
  this.dom.battleBg.style.backgroundImage = `url('${ground.background}')`;
  this.dom.autoBtn.classList.toggle('is-off', !this.state.home.autoRunning);
  this.dom.autoBtn.innerHTML = this.state.home.autoRunning
    ? 'AUTO STOP<br />전투 정지'
    : 'AUTO READY<br />전투 시작';
  this.renderGroundOptions();
},

showLimitCutscene(actor, target) {
  document.querySelector('#limitOverlay')?.remove();
  if (this.state?.currentScreen === 'summon') {
    actor.limitOverlayActive = false;
    actor.gifDuration = 0;
    actor.limitDurationPromise = Promise.resolve(0);
    return;
  }

  const limitCandidates = resolveUnitSprite(actor.unit, 'limit')
    .filter((src) => src && !/\/idle\.(?:webm|mp4|gif)(?:$|[?#])/i.test(src));
  const targetCandidates = target
    ? resolveMonsterSprite(target.monsterId, 'idle', target.isBoss).filter(Boolean)
    : [];

  const overlay = document.createElement('div');
  overlay.id = 'limitOverlay';

  const scene = document.createElement('div');
  scene.className = 'limit-scene';

  const targetSlot = document.createElement('div');
  targetSlot.className = `limit-scene__target${target?.isBoss ? ' is-boss' : ''}`;
  let targetImg = createMediaElement('', target?.monsterId || 'target');
  targetImg.id = 'limitTargetSprite';
  targetImg.alt = target?.monsterId || 'target';
  targetSlot.appendChild(targetImg);

  const actorSlot = document.createElement('div');
  actorSlot.className = 'limit-scene__actor';
  let img = createMediaElement('', actor.unit.name);
  img.id = 'limitSprite';
  img.alt = actor.unit.name;
  actorSlot.appendChild(img);

  const title = document.createElement('div');
  title.className = 'limit-title';
  const titleName = document.createElement('span');
  titleName.textContent = actor.unit.name;
  const titleLabel = document.createElement('strong');
  titleLabel.textContent = getLimitBurstName(actor.unit);
  title.appendChild(titleName);
  title.appendChild(titleLabel);

  scene.appendChild(targetSlot);
  scene.appendChild(actorSlot);
  overlay.appendChild(scene);
  overlay.appendChild(title);

  const stage = document.getElementById('partyStage') || document.body;
  stage.appendChild(overlay);

  overlay.addEventListener('click', () => {
    this.hideLimitCutscene();
    if (actor._limitSkipResolve) {
      actor.gifDuration = 0;
      actor.gifDurationPromise = Promise.resolve(0);
      actor._limitSkipResolve();
      actor._limitSkipResolve = null;
    }
  }, { once: true });

  const loadFromCandidates = (slot, element, candidates, alt, id) => new Promise((resolve) => {
    let pointer = 0;
    let active = element;
    const tryNext = () => {
      if (pointer >= candidates.length) {
        resolve({ src: '', element: active });
        return;
      }
      const src = candidates[pointer];
      pointer += 1;
      const shouldUseVideo = isVideoSource(src);
      const isCurrentVideo = active?.tagName === 'VIDEO';
      if (!active || shouldUseVideo !== isCurrentVideo) {
        const next = createMediaElement('', alt, shouldUseVideo);
        if (active?.parentNode) active.replaceWith(next);
        else slot.appendChild(next);
        active = next;
      }
      active.id = id;
      if (active.tagName === 'IMG') active.alt = alt;
      else active.dataset.alt = alt;
      active.onload = null;
      active.onerror = null;
      active.onloadedmetadata = null;
      active.oncanplay = null;
      if (shouldUseVideo) {
        const playbackRate = 1.5;
        const applyPlaybackRate = () => {
          active.defaultPlaybackRate = playbackRate;
          active.playbackRate = playbackRate;
        };
        active.loop = false;
        applyPlaybackRate();
        active.onplay = applyPlaybackRate;
        active.onratechange = () => { if (active.playbackRate !== playbackRate) active.playbackRate = playbackRate; };
        active.onloadedmetadata = () => {
          applyPlaybackRate();
          try { active.currentTime = 0; } catch(e) {}
          active.play?.().then(applyPlaybackRate).catch(() => {});
          resolve({ src, element: active });
        };
        active.onerror = tryNext;
        active.src = src;
        active.load?.();
      } else {
        active.onload = () => resolve({ src, element: active });
        active.onerror = tryNext;
        active.src = '';
        active.src = src;
      }
    };
    tryNext();
  });

  const fitSpriteToSlot = (element, slot, maxScale = 1.4, fixedScale = null) => {
    const gw = element.naturalWidth || element.videoWidth || 200;
    const gh = element.naturalHeight || element.videoHeight || 200;
    const sw = slot.offsetWidth || 280;
    const sh = slot.offsetHeight || 320;
    let cx = gw / 2;
    let cy = gh / 2;

    try {
      const off = document.createElement('canvas');
      off.width = gw;
      off.height = gh;
      const offCtx = off.getContext('2d');
      offCtx.drawImage(element, 0, 0);
      const data = offCtx.getImageData(0, 0, gw, gh).data;
      let minX = gw, minY = gh, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < gh; y += 1) {
        for (let x = 0; x < gw; x += 1) {
          if (data[(y * gw + x) * 4 + 3] > 15) {
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

    const scale = Number.isFinite(fixedScale) ? fixedScale : Math.min(maxScale, sw / gw, sh / gh);
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = `${gw * scale}px`;
    element.style.height = `${gh * scale}px`;
    element.style.maxWidth = 'none';
    element.style.maxHeight = 'none';
    element.style.transform = `translate(${(sw / 2) - (cx * scale)}px, ${(sh / 2) - (cy * scale)}px)`;
  };

  actor.limitDurationPromise = (async () => {
    const [actorLoad, targetLoad] = await Promise.all([
      loadFromCandidates(actorSlot, img, limitCandidates, actor.unit.name, 'limitSprite'),
      loadFromCandidates(targetSlot, targetImg, targetCandidates, target?.monsterId || 'target', 'limitTargetSprite'),
    ]);
    const loadedSrc = actorLoad.src;
    const loadedTargetSrc = targetLoad.src;
    img = actorLoad.element;
    targetImg = targetLoad.element;
    if (!loadedTargetSrc) targetSlot.hidden = true;
    if (!loadedSrc) {
      actor.gifDuration = 0;
      this.hideLimitCutscene();
      return 0;
    }

    if (loadedTargetSrc) fitSpriteToSlot(targetImg, targetSlot, target?.isBoss ? 1.2 : 1.45);
    fitSpriteToSlot(img, actorSlot, 1.45, 1);

    const isVideoLimit = img.tagName === 'VIDEO';
    const delays = isVideoLimit ? [] : await getGifFrameDelays(loadedSrc);
    const rawTotalMs = isVideoLimit && Number.isFinite(img.duration)
      ? img.duration * 1000
      : (delays && delays.length > 0)
        ? delays.reduce((a, b) => a + b, 0)
        : 5000;
    const limitPlaybackRate = 1.5;
    if (isVideoLimit) img.playbackRate = limitPlaybackRate;
    const totalMs = Math.max(300, Math.round(rawTotalMs / limitPlaybackRate));
    actor.gifDuration = totalMs;
    return totalMs;
  })();
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
  this.syncPartyHudAll();
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
  const combatantHidden = Boolean(actor.limitOverlayActive) || (actor.hp <= 0 && actor.state !== 'defeat');
  actor.node.classList.toggle('is-hidden', combatantHidden);
  actor.node.style.visibility = combatantHidden ? 'hidden' : '';
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

  if (actor.node && nextCandidates.length) {
    const stateChanged = actor.prevSpriteState !== spriteState;
    if (stateChanged) {
      actor.prevSpriteState = spriteState;
      actor.gifDuration = 0;
      actor.mediaDuration = 0;
      let pointer = 0;
      const alt = actor.team === 'ally' ? actor.unit?.name : actor.monsterId;

      actor.mediaDurationPromise = actor.gifDurationPromise = new Promise((resolve) => {
        let settled = false;
        let loadTimer = 0;
        const finish = (ms = 0) => {
          if (settled) return;
          settled = true;
          clearTimeout(loadTimer);
          actor.gifDuration = ms || 0;
          actor.mediaDuration = ms || 0;
          resolve(ms || 0);
        };
        const tryLoad = () => {
          if (pointer >= nextCandidates.length) {
            finish(0);
            return;
          }
          const src = nextCandidates[pointer];
          pointer += 1;
          const shouldUseVideo = isVideoSource(src);
          const isCurrentVideo = actor.sprite?.tagName === 'VIDEO';
          if (!actor.sprite || shouldUseVideo !== isCurrentVideo) {
            const next = createMediaElement('', alt, shouldUseVideo);
            if (actor.sprite?.parentNode) actor.sprite.replaceWith(next);
            else actor.node.insertBefore(next, actor.node.firstChild);
            actor.sprite = next;
          }

          const element = actor.sprite;
          element.onload = null;
          element.onerror = null;
          element.onloadedmetadata = null;
          element.oncanplay = null;
          element.dataset.mediaSrc = src;
          actor.mediaSrc = src;
          actor.mediaType = shouldUseVideo ? 'video' : 'image';
          clearTimeout(loadTimer);
          loadTimer = setTimeout(() => finish(0), 3000);

          if (shouldUseVideo) {
            element.muted = true;
            element.playsInline = true;
            element.autoplay = true;
            element.preload = 'auto';
            element.loop = spriteState === 'idle' || spriteState === 'move' || spriteState === 'casting';
            const playbackRate = spriteState === 'attack' || spriteState === 'limit' ? 1.5 : 1;
            const applyPlaybackRate = () => {
              element.defaultPlaybackRate = playbackRate;
              element.playbackRate = playbackRate;
            };
            applyPlaybackRate();
            element.onplay = applyPlaybackRate;
            element.onratechange = () => { if (element.playbackRate !== playbackRate) element.playbackRate = playbackRate; };
            element.onloadedmetadata = () => {
              applyPlaybackRate();
              const durationMs = Number.isFinite(element.duration) ? Math.round((element.duration * 1000) / playbackRate) : 0;
              try { element.currentTime = 0; } catch(e) {}
              actor.mediaStartedAt = performance.now();
              element.play?.().then(applyPlaybackRate).catch(() => {});
              finish(durationMs);
            };
            element.onerror = tryLoad;
            element.src = src;
            element.load?.();
          } else {
            element.onload = () => {
              actor.mediaStartedAt = performance.now();
              measureGifDuration(element.src).then((ms) => finish(ms || 0));
            };
            element.onerror = tryLoad;
            element.src = '';
            element.src = src;
          }
        };
        tryLoad();
      });
    }
  }
  if (actor.hpFill) {
    const rate = clamp((actor.hp / actor.maxHp) * 100, 0, 100);
    actor.hpFill.style.width = `${rate}%`;
  }
  this.syncPartyHud(actor);
}
  });
}
