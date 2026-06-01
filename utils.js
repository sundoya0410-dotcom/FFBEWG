import { GROUND_DATA, QUEST_DATA, UNIT_ASSET_FOLDERS, DEFAULT_PARTY } from './game-data.js';
import { FULL_UNIT_LIBRARY } from './unit-data.js';
import { EQUIPMENT_TYPES, getEquipmentPower } from './equipment-data.js';

export const STORAGE_KEY = 'ffbewg-compact-core-ffdiag-v4';

export const FORMATION_ROWS = ['front', 'back'];
export const FORMATION_ROW_LABELS = {
  front: '전열',
  back: '후열',
};
export const FORMATION_ROW_ICONS = {
  front: '🛡️',
  back: '✨',
};

export function defaultPartyFormation() {
  return ['back', 'back', 'front', 'front'];
}

export function normalizePartyFormation(formation = []) {
  const fallback = defaultPartyFormation();
  return Array.from({ length: 4 }, (_, index) => (
    FORMATION_ROWS.includes(formation[index]) ? formation[index] : fallback[index]
  ));
}

function getRoleKey(role = '') {
  if (role.includes('탱커')) return 'tank';
  if (role.includes('물리')) return 'physical';
  if (role.includes('마법')) return 'magical';
  if (role.includes('힐러')) return 'healer';
  if (role.includes('디버퍼')) return 'debuffer';
  if (role.includes('버퍼')) return 'buffer';
  return 'neutral';
}

export function getUnitBattleRole(unit) {
  return unit?.battleRole || unit?.role || '';
}

export function getUnitJobRoles(unit) {
  const roles = Array.isArray(unit?.jobRoles) ? unit.jobRoles : [];
  const fallback = getUnitBattleRole(unit);
  return [...new Set((roles.length ? roles : [fallback]).filter(Boolean))];
}

export function getUnitJobDisplayLabels(unit) {
  const job = unit?.job || getUnitBattleRole(unit) || unit?.role || '-';
  return [job, ...getUnitJobRoles(unit).filter((role) => role !== job)];
}

export const JOB_DESCRIPTIONS = {
  '전사': '전열에서 버티며 안정적으로 피해를 넣는 물리 딜러 + 탱커 멀티직업.',
  '모험가': '상황 적응력이 뛰어나 공격과 지원을 오가며 파티 흐름을 만든다.',
  '성기사': '높은 방어와 보호 능력으로 아군을 지키는 수호형 직업.',
  '암흑기사': '방어보다 화력을 우선해 강한 일격으로 적을 압박한다.',
  '용기사': '점프 공격으로 전열을 돌파하는 순간 화력형 직업.',
  '몽크': '단단한 체력과 기합으로 버티며 파티를 끌어올리는 탱커 + 버퍼.',
  '무사': '검술에 집중한 순수 물리 딜러. 치명적인 한 방에 강하다.',
  '닌자': '빠른 공격과 교란으로 피해를 넣고 약화를 거는 물리 딜러 + 디버퍼.',
  '도적': '적의 허점을 찌르고 전투 흐름을 흔드는 약화 중심 직업.',
  '기공사': '도구와 기계 장비로 아군을 지원하고 적을 방해한다.',
  '도박사': '확률과 변칙 전술로 버프와 디버프를 동시에 노리는 직업.',
  '백마도사': '회복과 보호 마법으로 전투 지속력을 책임지는 힐러 + 버퍼.',
  '흑마도사': '강력한 마법 피해와 약화 효과로 적 진형을 무너뜨린다.',
  '청마도사': '특수한 적 기술로 마법 피해와 약화를 함께 다루는 변칙 직업.',
  '소환사': '소환의 힘으로 공격, 지원, 회복, 약화를 폭넓게 수행한다.',
  '마도전사': '검과 마법을 함께 쓰며 공격과 지원을 겸하는 하이브리드 직업.',
  '룬나이트': '마법을 받아내고 반격하는 방어형 마법 전사.',
  '학자': '지식과 분석으로 전장을 읽고 아군 강화와 적 약화를 돕는다.',
  '양파검사': '성장 잠재력이 높은 만능형 직업. 여러 역할을 유연하게 수행한다.',
};

export function getUnitJob(unitOrJob) {
  if (typeof unitOrJob === 'string') return unitOrJob;
  return unitOrJob?.job || unitOrJob?.jobType || getUnitBattleRole(unitOrJob) || unitOrJob?.role || '';
}

export function getUnitJobDescription(unitOrJob) {
  const job = typeof unitOrJob === 'string'
    ? unitOrJob
    : unitOrJob?.job || getUnitBattleRole(unitOrJob) || unitOrJob?.role || '';
  return JOB_DESCRIPTIONS[job] || '직업 역할과 전투 성향을 나타냅니다.';
}

export const ROLE_DESCRIPTIONS = {
  '물리 딜러': '공격력을 기반으로 안정적인 직접 피해를 넣는 역할. 전열 배치와 공격 장비 효율이 좋다.',
  '마법 딜러': '마력을 기반으로 강한 마법 피해를 넣는 역할. 후열 배치와 지팡이 계열 장비 효율이 좋다.',
  '점프딜러': '도약 공격으로 큰 피해를 노리는 특수 물리 딜러. 순간 화력과 전열 돌파에 강하다.',
  '탱커': '높은 HP와 방어 능력으로 적의 공격을 받아내고 파티를 보호하는 역할.',
  '버퍼': '아군의 공격, 치명타, 방어 효율을 끌어올려 파티 전체 전투력을 높이는 역할.',
  '디버퍼': '적의 방어, 공격, 약점을 흔들어 아군의 피해량과 생존력을 간접적으로 높이는 역할.',
  '힐러': '회복과 안정화로 전투 지속력을 책임지는 역할. 체력이 낮은 아군을 우선적으로 살린다.',
};

export function getRoleDescription(role = '') {
  return ROLE_DESCRIPTIONS[role] || '전투에서 담당하는 기본 역할입니다.';
}

export function escapeAttr(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function renderJobTooltipAttrs(unitOrJob) {
  return `tabindex="0" data-job-tip="${escapeAttr(getUnitJobDescription(unitOrJob))}"`;
}

export function renderRoleTooltipAttrs(role) {
  return `tabindex="0" data-job-tip="${escapeAttr(getRoleDescription(role))}"`;
}

export function getFormationRoleFit(unit, row) {
  if (!unit || !row) {
    return { label: '-', score: 1, powerMultiplier: 1, tone: 'neutral' };
  }

  const roleKey = getRoleKey(getUnitBattleRole(unit));
  const fits = {
    front: {
      tank:     { label: '최적', score: 1.10, powerMultiplier: 1.10, tone: 'best' },
      physical: { label: '우수', score: 1.07, powerMultiplier: 1.07, tone: 'good' },
      debuffer: { label: '안정', score: 1.02, powerMultiplier: 1.02, tone: 'ok' },
      buffer:   { label: '보통', score: 0.98, powerMultiplier: 0.98, tone: 'neutral' },
      magical:  { label: '불리', score: 0.94, powerMultiplier: 0.94, tone: 'bad' },
      healer:   { label: '불리', score: 0.94, powerMultiplier: 0.94, tone: 'bad' },
      neutral:  { label: '보통', score: 1.00, powerMultiplier: 1.00, tone: 'neutral' },
    },
    back: {
      magical:  { label: '최적', score: 1.09, powerMultiplier: 1.09, tone: 'best' },
      healer:   { label: '최적', score: 1.09, powerMultiplier: 1.09, tone: 'best' },
      buffer:   { label: '우수', score: 1.06, powerMultiplier: 1.06, tone: 'good' },
      debuffer: { label: '우수', score: 1.04, powerMultiplier: 1.04, tone: 'good' },
      physical: { label: '보통', score: 0.98, powerMultiplier: 0.98, tone: 'neutral' },
      tank:     { label: '불리', score: 0.94, powerMultiplier: 0.94, tone: 'bad' },
      neutral:  { label: '보통', score: 1.00, powerMultiplier: 1.00, tone: 'neutral' },
    },
  };

  return fits[row]?.[roleKey] || fits[row]?.neutral || { label: '보통', score: 1, powerMultiplier: 1, tone: 'neutral' };
}

export function getFormationStatMultipliers(unit, row) {
  const roleKey = getRoleKey(getUnitBattleRole(unit));
  const base = { maxHp: 1, mp: 1, atk: 1, mag: 1, def: 1, spr: 1 };
  if (!unit || !row) return base;

  const rowMods = {
    front: {
      tank:     { maxHp: 1.08, def: 1.12, spr: 1.10, atk: 0.98 },
      physical: { atk: 1.08, def: 1.03, maxHp: 1.02 },
      debuffer: { atk: 1.02, mag: 1.02, def: 1.02 },
      buffer:   { def: 0.98, spr: 0.98 },
      magical:  { mag: 0.96, def: 0.96 },
      healer:   { spr: 0.96, def: 0.96 },
    },
    back: {
      magical:  { mag: 1.10, spr: 1.04 },
      healer:   { spr: 1.10, maxHp: 1.03 },
      buffer:   { mag: 1.04, spr: 1.06 },
      debuffer: { atk: 1.03, mag: 1.04 },
      physical: { atk: 0.96 },
      tank:     { maxHp: 0.98, def: 0.96, spr: 0.96 },
    },
  };

  return { ...base, ...(rowMods[row]?.[roleKey] || {}) };
}

const SERIES_SYNERGY_STEPS = {
  4: { label: '결속', bonus: 40, statMultiplier: 1.20, powerMultiplier: 1.40, tone: 'best' },
  3: { label: '전우애', bonus: 22, statMultiplier: 1.11, powerMultiplier: 1.22, tone: 'good' },
  2: { label: '동료애', bonus: 10, statMultiplier: 1.05, powerMultiplier: 1.10, tone: 'ok' },
  1: { label: '혼성', bonus: 0, statMultiplier: 1, powerMultiplier: 1, tone: 'neutral' },
};

export const COMMON_PASSIVES = {
  loot_sense: { label: '보물 감각', text: '전투력 +2%, 골드 보상 +10%', powerMultiplier: 1.02, statMultiplier: 1.02, rewardGoldBonus: 0.10 },
  training_sense: { label: '성장 감각', text: '전투력 +2%, 성장석 보상 +10%', powerMultiplier: 1.02, statMultiplier: 1.02, rewardGrowthStoneBonus: 0.10 },
  battle_focus: { label: '전투 집중', text: '전투력 +4%', powerMultiplier: 1.04, statMultiplier: 1.02 },
  healing_touch: { label: '치유의 손길', text: '정신 +8%, 회복 성능 +12%', stats: { spr: 1.08 }, healingMultiplier: 1.12 },
  emergency_care: { label: '응급 처치', text: 'HP +5%, 회복 성능 +10%', stats: { maxHp: 1.05, spr: 1.04 }, healingMultiplier: 1.10 },
  front_guard: { label: '전열 수호', text: 'HP +6%, 방어/정신 +5%', stats: { maxHp: 1.06, def: 1.05, spr: 1.05 } },
  tenacious_vitality: { label: '끈질긴 생명력', text: 'HP +10%, 전투력 +2%', stats: { maxHp: 1.10 }, powerMultiplier: 1.02 },
  iron_stance: { label: '철벽 자세', text: '방어 +10%', stats: { def: 1.10 } },
  protective_prayer: { label: '보호의 기도', text: 'HP +4%, 정신 +8%', stats: { maxHp: 1.04, spr: 1.08 } },
  morale_boost: { label: '사기 고양', text: '전투력 +5%', powerMultiplier: 1.05, statMultiplier: 1.02 },
  backline_support: { label: '후열 지원', text: 'MP/정신 +6%', stats: { mp: 1.06, spr: 1.06 } },
  mind_break: { label: '정신 붕괴', text: '마력 +6%, 전투력 +3%', stats: { mag: 1.06 }, powerMultiplier: 1.03 },
  armor_disruption: { label: '장갑 교란', text: '공격 +5%, 마력 +5%', stats: { atk: 1.05, mag: 1.05 } },
  weakness_spotter: { label: '약점 포착', text: '전투력 +4%, 치명 흐름 강화', powerMultiplier: 1.04, critBonus: 0.04 },
  elemental_resonance: { label: '원소 공명', text: '마력 +10%', stats: { mag: 1.10 } },
  mana_cycle: { label: '마력 순환', text: 'MP +8%, 마력 +6%', stats: { mp: 1.08, mag: 1.06 } },
  arcane_training: { label: '비전 수련', text: '마력 +8%, 전투력 +2%', stats: { mag: 1.08 }, powerMultiplier: 1.02 },
  opening_strike: { label: '선제 타격', text: '공격 +6%, 전투력 +3%', stats: { atk: 1.06 }, powerMultiplier: 1.03 },
  assault_instinct: { label: '돌격 본능', text: '공격 +8%', stats: { atk: 1.08 } },
  vanguard_breakthrough: { label: '선봉 돌파', text: 'HP +4%, 공격 +5%', stats: { maxHp: 1.04, atk: 1.05 } },
};


const UNIQUE_PASSIVE_RULES = [
  { pattern: /tifa/i, label: '피버 타임 러시', text: '공격 +14%, 전투력 +8%. 연속 타격형 물리 딜러로 강화됩니다.', stats: { atk: 1.14 }, powerMultiplier: 1.08 },
  { pattern: /sephiroth/i, label: '별을 가르는 영웅담', text: '공격/마력 +10%, 전투력 +12%. 보스전에 강한 피니셔 성향입니다.', stats: { atk: 1.10, mag: 1.10 }, powerMultiplier: 1.12 },
  { pattern: /cloud|zack|squall|tidus|dai|duran|lucian/i, label: '계승된 검의 의지', text: '공격 +12%, 전투력 +8%. 정면 돌파형 물리 딜러입니다.', stats: { atk: 1.12 }, powerMultiplier: 1.08 },
  { pattern: /aerith|yuna|lenna|rosa|eiko|garnet|dagger|kairi|charlotte|jelanda/i, label: '기도의 계승자', text: '정신 +14%, HP +6%, 전투력 +5%. 회복과 보호에 특화됩니다.', stats: { spr: 1.14, maxHp: 1.06 }, powerMultiplier: 1.05, healingMultiplier: 1.16 },
  { pattern: /kefka|kuja|emperor|xande|exdeath|golbez|cloud_of_darkness|garland|xehanort/i, label: '재앙을 부르는 마력', text: '마력 +14%, 전투력 +9%. 약화와 광역 마법 성향이 강화됩니다.', stats: { mag: 1.14 }, powerMultiplier: 1.09 },
  { pattern: /terra|rinoa|vivi|rydia|braska|yunalesca|angela|freya|lezard|mystina/i, label: '비전의 공명', text: '마력 +12%, MP +10%, 전투력 +7%. 소환/마법형 화력이 강화됩니다.', stats: { mag: 1.12, mp: 1.10 }, powerMultiplier: 1.07 },
  { pattern: /auron|kain|baran|riesz|freya|fratley|gilgamesh|steiner|beatrix|cecil|dorgann|crocodine|hyunckel|arngrim|lenneth/i, label: '불굴의 전열', text: 'HP +10%, 공격/방어 +8%, 전투력 +6%. 전열 유지력이 강화됩니다.', stats: { maxHp: 1.10, atk: 1.08, def: 1.08 }, powerMultiplier: 1.06 },
  { pattern: /locke|zidane|faris|yuffie|hawkeye|riku|shadow|vincent|reno/i, label: '바람처럼 사라지는 손', text: '공격 +9%, 전투력 +6%, 골드 보상 +8%. 빠른 약점 공략형입니다.', stats: { atk: 1.09 }, powerMultiplier: 1.06, rewardGoldBonus: 0.08 },
  { pattern: /edgar|barret|rufus|laguna|irvine|9s|21o/i, label: '전술 장비 운용', text: 'HP +6%, 공격/정신 +7%, 전투력 +6%. 기계 장비와 지원 사격이 강화됩니다.', stats: { maxHp: 1.06, atk: 1.07, spr: 1.07 }, powerMultiplier: 1.06 },
  { pattern: /sabin|zell|kevin|maam|adam/i, label: '한계 돌파 격투술', text: '공격 +13%, HP +7%, 전투력 +7%. 근접 연타 성능이 강화됩니다.', stats: { atk: 1.13, maxHp: 1.07 }, powerMultiplier: 1.07 },
  { pattern: /rikku|setzer|selphie/i, label: '행운을 뒤집는 손패', text: '전투력 +6%, 골드/성장석 보상 +8%. 파밍 가치가 높은 지원형입니다.', powerMultiplier: 1.06, rewardGoldBonus: 0.08, rewardGrowthStoneBonus: 0.08 },
  { pattern: /2b|a2|yorha/i, label: 'YoRHa 전투 프로토콜', text: '공격 +12%, 방어 +6%, 전투력 +8%. 고속 물리전 성능이 강화됩니다.', stats: { atk: 1.12, def: 1.06 }, powerMultiplier: 1.08 },
  { pattern: /sora|keyblade/i, label: '마음을 잇는 빛', text: '공격/정신 +9%, 전투력 +7%. 파티 지원과 물리 화력을 겸합니다.', stats: { atk: 1.09, spr: 1.09 }, powerMultiplier: 1.07 },
  { pattern: /genesis/i, label: 'LOVELESS의 잔향', text: '마력 +12%, 공격 +6%, 전투력 +8%. 마검사형 화력이 강화됩니다.', stats: { mag: 1.12, atk: 1.06 }, powerMultiplier: 1.08 },
  { pattern: /hadlar|eve/i, label: '마왕의 투지', text: '공격/마력 +10%, HP +8%, 전투력 +8%. 균형형 보스 딜러입니다.', stats: { atk: 1.10, mag: 1.10, maxHp: 1.08 }, powerMultiplier: 1.08 },
  { pattern: /popp/i, label: '대마도사의 각성', text: '마력 +15%, MP +8%, 전투력 +8%. 순수 마법 화력이 크게 오릅니다.', stats: { mag: 1.15, mp: 1.08 }, powerMultiplier: 1.08 },
  { pattern: /firion|onion|bartz/i, label: '무기 숙련의 달인', text: '공격 +8%, 마력 +8%, 전투력 +9%. 다역할 성장 효율이 높습니다.', stats: { atk: 1.08, mag: 1.08 }, powerMultiplier: 1.09 },
  { pattern: /dorgann|galuf/i, label: '새벽의 방패', text: 'HP +12%, 방어 +10%, 전투력 +5%. 파티 전열을 지키는 성향입니다.', stats: { maxHp: 1.12, def: 1.10 }, powerMultiplier: 1.05 },
  { pattern: /beast_king|crocodine/i, label: '수왕의 방패', text: 'HP +15%, 방어 +9%, 전투력 +5%. 탱커 성능이 크게 강화됩니다.', stats: { maxHp: 1.15, def: 1.09 }, powerMultiplier: 1.05 },
];

function normalizePassiveKey(unit = {}) {
  return `${unit.folderKey || ''} ${unit.id || ''} ${unit.name || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function getHighRarityUniquePassive(unit = {}) {
  const minTier = Number(unit.minTier || unit.stars || unit.tier || 1);
  const currentTier = Number(unit.tier || unit.stars || unit.minTier || 1);
  const maxTier = Number(unit.maxTier || currentTier || minTier);
  if (Math.max(minTier, currentTier, maxTier) < 5) return null;
  const key = normalizePassiveKey(unit);
  const rule = UNIQUE_PASSIVE_RULES.find((item) => item.pattern.test(key));
  if (rule) {
    return {
      id: `unique_${key}`,
      label: rule.label,
      text: rule.text,
      unique: true,
      stats: rule.stats || {},
      powerMultiplier: rule.powerMultiplier || 1.06,
      statMultiplier: rule.statMultiplier || 1,
      rewardGoldBonus: rule.rewardGoldBonus || 0,
      rewardGrowthStoneBonus: rule.rewardGrowthStoneBonus || 0,
      healingMultiplier: rule.healingMultiplier || 0,
    };
  }
  const role = getUnitBattleRole(unit);
  const fallbackByRole = role === '힐러'
    ? { stats: { spr: 1.10, maxHp: 1.05 }, text: '정신 +10%, HP +5%, 전투력 +5%. 회복 지원 성향이 강화됩니다.' }
    : role === '마법 딜러'
      ? { stats: { mag: 1.11, mp: 1.06 }, text: '마력 +11%, MP +6%, 전투력 +6%. 마법 화력이 강화됩니다.' }
      : role === '탱커'
        ? { stats: { maxHp: 1.12, def: 1.08 }, text: 'HP +12%, 방어 +8%, 전투력 +5%. 전열 생존력이 강화됩니다.' }
        : { stats: { atk: 1.10, maxHp: 1.04 }, text: '공격 +10%, HP +4%, 전투력 +6%. 주력 전투 성능이 강화됩니다.' };
  return {
    id: `unique_${key}`,
    label: `${unit.name || '유닛'}의 증명`,
    text: fallbackByRole.text,
    unique: true,
    stats: fallbackByRole.stats,
    powerMultiplier: role === '탱커' || role === '힐러' ? 1.05 : 1.06,
    statMultiplier: 1,
  };
}
export function getCommonPassiveDefinition(passiveId) {
  return COMMON_PASSIVES[passiveId] || null;
}

export function getUnitCommonPassive(unit) {
  const passive = getCommonPassiveDefinition(unit?.commonPassiveId);
  if (passive) return { id: unit.commonPassiveId, ...passive };
  return getHighRarityUniquePassive(unit);
}

export function getPartyCommonPassiveSummary(state) {
  const passives = getPartyUnits(state).map((unit) => getUnitCommonPassive(unit)).filter(Boolean);
  const rewardGoldBonus = Math.min(0.5, passives.reduce((total, passive) => total + (Number(passive.rewardGoldBonus) || 0), 0));
  const rewardGrowthStoneBonus = Math.min(0.5, passives.reduce((total, passive) => total + (Number(passive.rewardGrowthStoneBonus) || 0), 0));
  return { passives, rewardGoldBonus, rewardGrowthStoneBonus };
}
const STANDALONE_TRAITS = {
  FF1: { label: '빛의 전사', bonus: 30, statBonus: 14, statMultiplier: 1.14, powerMultiplier: 1.30 },
};

function getPartySeriesCounts(state) {
  return getPartyUnits(state).reduce((counts, unit) => {
    if (!unit?.series) return counts;
    counts[unit.series] = (counts[unit.series] || 0) + 1;
    return counts;
  }, {});
}

export function getUnitSeriesSynergy(state, unit) {
  if (!unit?.series) return { series: '-', count: 0, ...SERIES_SYNERGY_STEPS[1] };
  const count = getPartySeriesCounts(state)[unit.series] || 0;
  const step = SERIES_SYNERGY_STEPS[Math.min(4, Math.max(1, count))] || SERIES_SYNERGY_STEPS[1];
  return { series: unit.series, count, ...step };
}

export function getSeriesSynergySummary(state) {
  const counts = getPartySeriesCounts(state);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!entries.length) return { series: '-', count: 0, label: '대기', bonus: 0, statMultiplier: 1, powerMultiplier: 1, tone: 'neutral' };
  const [series, count] = entries[0];
  const step = SERIES_SYNERGY_STEPS[Math.min(4, Math.max(1, count))] || SERIES_SYNERGY_STEPS[1];
  return { series, count, ...step };
}

function getUnitStandaloneTrait(unit) {
  return STANDALONE_TRAITS[unit?.series] || {
    label: '',
    bonus: 0,
    statBonus: 0,
    statMultiplier: 1,
    powerMultiplier: 1,
  };
}

const JOB_COMBO_RULES = [
  {
    id: 'frontline-oath',
    label: '전열의 맹세',
    requires: { '전사': 1, '성기사': 1 },
    bonus: 18,
    statBonus: 10,
  },
  {
    id: 'battlefield-prayer',
    label: '전장의 기도',
    requires: { '전사': 1, '백마도사': 1 },
    bonus: 14,
    statBonus: 8,
  },
  {
    id: 'holy-vanguard',
    label: '성역 수호',
    requires: { '성기사': 1, '백마도사': 1 },
    bonus: 20,
    statBonus: 12,
  },
  {
    id: 'dark-ritual',
    label: '암흑 의식',
    requires: { '암흑기사': 1, '흑마도사': 1 },
    bonus: 22,
    statBonus: 8,
  },
  {
    id: 'air-support',
    label: '창공 포화',
    requires: { '용기사': 1, '기공사': 1 },
    bonus: 18,
    statBonus: 7,
  },
  {
    id: 'shadow-work',
    label: '그림자 공작',
    requires: { '닌자': 1, '도적': 1 },
    bonus: 20,
    statBonus: 8,
  },
  {
    id: 'grand-magic',
    label: '대마도 의식',
    requires: { '흑마도사': 1, '소환사': 1 },
    bonus: 22,
    statBonus: 10,
  },
  {
    id: 'blue-research',
    label: '청마 연구',
    requires: { '청마도사': 1, '학자': 1 },
    bonus: 16,
    statBonus: 10,
  },
  {
    id: 'martial-discipline',
    label: '무예 연계',
    requires: { '무사': 1, '몽크': 1 },
    bonus: 18,
    statBonus: 8,
  },
  {
    id: 'lucky-machine',
    label: '기계 행운',
    requires: { '기공사': 1, '도박사': 1 },
    bonus: 18,
    statBonus: 8,
  },
  {
    id: 'free-change',
    label: '자유 전직',
    requires: { '양파검사': 1, '모험가': 1 },
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'magitek-ward',
    label: '마도 방진',
    requires: { '마도전사': 1, '룬나이트': 1 },
    bonus: 20,
    statBonus: 10,
  },
  {
    id: 'summon-guard',
    label: '소환 수호',
    requires: { '소환사': 1, '성기사': 1 },
    bonus: 18,
    statBonus: 11,
  },
  {
    id: 'limit-finishers',
    label: '피니셔 결속',
    requires: { '무사': 1, '마도전사': 1, '소환사': 1 },
    bonus: 24,
    statBonus: 8,
  },
  {
    id: 'fast-strike',
    label: '속공 전술',
    requires: { '닌자': 1, '용기사': 1, '도박사': 1 },
    bonus: 20,
    statBonus: 7,
  },
  {
    id: 'balanced-party',
    label: '균형 파티',
    requires: { '전사': 1, '백마도사': 1, '흑마도사': 1, '도적': 1 },
    bonus: 24,
    statBonus: 12,
  },
];

const BOND_RULES = [
  {
    id: 'ff2-wild-rose',
    label: '들장미의 맹세',
    series: 'FF2',
    members: ['Firion', 'Maria', 'Leon'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff3-onion-party',
    label: '빛의 계승자',
    series: 'FF3',
    members: ['Luneth', 'Arc', 'Refia', 'Ingus', 'Onion Knight'],
    min: 3,
    bonus: 16,
    statBonus: 8,
  },
  {
    id: 'ff4-baron',
    label: '바론의 인연',
    series: 'FF4',
    members: ['Cecil', 'Kain', 'Rosa', 'Rydia'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff5-warriors',
    label: '크리스탈의 전사',
    series: 'FF5',
    members: ['Bartz', 'Lenna', 'Faris', 'Galuf', 'Krile'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff5-rivals',
    label: '차원의 라이벌',
    series: 'FF5',
    members: ['Bartz', 'Gilgamesh'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff6-returners',
    label: '리터너즈',
    series: 'FF6',
    members: ['Terra', 'Locke', 'Celes', 'Edgar', 'Sabin'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff6-figaro',
    label: '피가로 형제',
    series: 'FF6',
    members: ['Edgar', 'Sabin'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff7-party',
    label: '별의 동료들',
    series: 'FF7',
    members: ['Cloud', 'Tifa', 'Aerith', 'Barret', 'Yuffie', 'Vincent'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff7-nibelheim',
    label: '니블헤임의 숙명',
    series: 'FF7',
    members: ['Cloud', 'Tifa', 'Sephiroth'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff8-seed',
    label: 'SeeD 작전',
    series: 'FF8',
    members: ['Squall', 'Rinoa', 'Zell', 'Selphie', 'Quistis', 'Irvine'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff8-laguna',
    label: '라그나 분대',
    series: 'FF8',
    members: ['Laguna', 'Kiros and Ward'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff9-tantalus',
    label: '극장의 영웅들',
    series: 'FF9',
    members: ['Zidane', 'Garnet', 'Dagger', 'Vivi', 'Steiner', 'Freya', 'Eiko', 'Quina'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff10-guardians',
    label: '소환사의 수호자',
    series: 'FF10',
    members: ['Tidus', 'Yuna', 'Auron', 'Rikku', 'Wakka', 'Lulu', 'Kimahri'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff10-summoners',
    label: '대소환사의 길',
    series: 'FF10',
    members: ['Yuna', 'Braska', 'Seymour'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'dai-party',
    label: '아방의 사도',
    series: 'C-AD',
    members: ['Dai', 'Popp', 'Maam', 'Hyunckel'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'kh-trio',
    label: '키블레이드의 빛',
    series: 'C-KH',
    members: ['Sora', 'Riku', 'Kairi'],
    min: 3,
    bonus: 24,
    statBonus: 12,
  },
  {
    id: 'nier-androids',
    label: '요르하 부대',
    series: 'C-NA',
    members: ['2B', '9S', 'A2', '21O'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'tom-party',
    label: '마나의 여정',
    series: 'C-ToM',
    members: ['Duran', 'Angela', 'Kevin', 'Charlotte', 'Hawkeye', 'Riesz'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'vp-valkyrie',
    label: '발키리의 선택',
    series: 'C-VF',
    members: ['Lenneth', 'Arngrim', 'Lucian', 'Freya', 'Mystina', 'Jelanda'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff2-rebel-hearts',
    label: '반란군의 불꽃',
    series: 'FF2',
    members: ['Firion', 'Maria'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff2-separated-siblings',
    label: '엇갈린 남매',
    series: 'FF2',
    members: ['Maria', 'Leon'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff2-palamecia-shadow',
    label: '팔라메키아의 그림자',
    series: 'FF2',
    members: ['Emperor', 'Leon'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff3-crystal-vanguard',
    label: '크리스탈 선봉대',
    series: 'FF3',
    members: ['Luneth', 'Arc'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff3-onion-pride',
    label: '양파검사의 긍지',
    series: 'FF3',
    members: ['Onion Knight', 'Refia'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff3-void-pact',
    label: '어둠의 계약',
    series: 'FF3',
    members: ['Cloud of Darkness', 'Xande'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff4-red-wings',
    label: '붉은 날개의 맹우',
    series: 'FF4',
    members: ['Cecil', 'Kain'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff4-moonlit-vow',
    label: '달빛의 서약',
    series: 'FF4',
    members: ['Cecil', 'Rosa'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff4-prayer-and-summon',
    label: '기도와 소환',
    series: 'FF4',
    members: ['Rosa', 'Rydia'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff4-lunar-brothers',
    label: '달의 형제',
    series: 'FF4',
    members: ['Cecil', 'Golbez'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff5-tycoon-sisters',
    label: '타이쿤 자매',
    series: 'FF5',
    members: ['Lenna', 'Faris'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff5-dawn-legacy',
    label: '새벽의 계승',
    series: 'FF5',
    members: ['Galuf', 'Krile'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff5-wayfarer-princess',
    label: '바람과 왕녀',
    series: 'FF5',
    members: ['Bartz', 'Lenna'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff5-dawn-father',
    label: '새벽의 부자',
    series: 'FF5',
    members: ['Bartz', 'Dorgann'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff5-rift-loyalty',
    label: '차원의 충복',
    series: 'FF5',
    members: ['Exdeath', 'Gilgamesh'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff6-magitek-hearts',
    label: '마도의 공명',
    series: 'FF6',
    members: ['Terra', 'Celes'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff6-opera-vow',
    label: '오페라의 맹세',
    series: 'FF6',
    members: ['Locke', 'Celes'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff6-wandering-blades',
    label: '방랑검의 침묵',
    series: 'FF6',
    members: ['Cyan', 'Shadow'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff6-airship-gambit',
    label: '비공정의 승부사',
    series: 'FF6',
    members: ['Setzer', 'Celes'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff6-final-laugh',
    label: '파멸의 웃음',
    series: 'FF6',
    members: ['Kefka', 'Terra'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff7-avalanche-cell',
    label: '아발란치 작전반',
    series: 'FF7',
    members: ['Cloud', 'Barret', 'Tifa'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff7-childhood-promise',
    label: '약속의 급수탑',
    series: 'FF7',
    members: ['Cloud', 'Tifa'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff7-ancient-flower',
    label: '고대종의 꽃',
    series: 'FF7',
    members: ['Cloud', 'Aerith'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff7-last-soldiers',
    label: '마지막 솔저들',
    series: 'FF7',
    members: ['Cloud', 'Zack', 'Sephiroth'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff7-wutai-tricks',
    label: '우타이의 장난',
    series: 'FF7',
    members: ['Yuffie', 'Vincent'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff7-turks-order',
    label: '터크스의 질서',
    series: 'FF7',
    members: ['Reno', 'Rufus'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff7-remnants',
    label: '재림의 잔영',
    series: 'FF7',
    members: ['Kadaj', 'Yazoo and Loz', 'Sephiroth'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff8-oath-of-seed',
    label: 'SeeD의 서약',
    series: 'FF8',
    members: ['Squall', 'Rinoa'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff8-balamb-fists',
    label: '발람의 주먹',
    series: 'FF8',
    members: ['Squall', 'Zell'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff8-disciplinary-committee',
    label: '풍기위원회의 검',
    series: 'FF8',
    members: ['Seifer', 'Raijin and Fujin'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff8-sorceress-knights',
    label: '마녀의 기사',
    series: 'FF8',
    members: ['Squall', 'Edea', 'Rinoa'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff8-laguna-dream',
    label: '라그나의 꿈',
    series: 'FF8',
    members: ['Laguna', 'Squall'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff9-alexandria-guard',
    label: '알렉산드리아 친위대',
    series: 'FF9',
    members: ['Steiner', 'Beatrix', 'Garnet'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff9-princess-and-thief',
    label: '공주와 도적',
    series: 'FF9',
    members: ['Zidane', 'Garnet', 'Dagger'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff9-black-mage-heart',
    label: '검은 마도사의 마음',
    series: 'FF9',
    members: ['Vivi', 'Zidane'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff9-burmecian-lancers',
    label: '부르메시아의 창',
    series: 'FF9',
    members: ['Freya', 'Fratley'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff9-genome-fate',
    label: '제놈의 숙명',
    series: 'FF9',
    members: ['Zidane', 'Kuja', 'Garland'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff9-little-summoners',
    label: '작은 소환사들',
    series: 'FF9',
    members: ['Garnet', 'Dagger', 'Eiko'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff10-sun-and-moon',
    label: '태양과 달의 순례',
    series: 'FF10',
    members: ['Tidus', 'Yuna'],
    min: 2,
    bonus: 14,
    statBonus: 7,
  },
  {
    id: 'ff10-legendary-guardians',
    label: '전설의 가디언',
    series: 'FF10',
    members: ['Auron', 'Braska', 'Jecht'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff10-besaid-oath',
    label: '비사이드의 맹세',
    series: 'FF10',
    members: ['Yuna', 'Wakka', 'Lulu', 'Kimahri'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff10-blitzball-bond',
    label: '오라카의 파도',
    series: 'FF10',
    members: ['Tidus', 'Wakka'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff10-al-bhed-family',
    label: '알베드의 피',
    series: 'FF10',
    members: ['Yuna', 'Rikku'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff10-father-and-son',
    label: '신을 넘는 부자',
    series: 'FF10',
    members: ['Tidus', 'Jecht'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff10-ronsos-honor',
    label: '론조의 긍지',
    series: 'FF10',
    members: ['Kimahri', 'Seymour'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff4-mist-tragedy',
    label: '미스트의 상흔',
    series: 'FF4',
    members: ['Kain', 'Rydia'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff4-dark-and-holy',
    label: '어둠과 성검',
    series: 'FF4',
    members: ['Cecil', 'Golbez', 'Kain'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff5-dawn-warriors',
    label: '새벽의 전사들',
    series: 'FF5',
    members: ['Dorgann', 'Galuf', 'Exdeath'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff6-empire-scars',
    label: '제국의 상흔',
    series: 'FF6',
    members: ['Terra', 'Celes', 'Kefka'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff6-figaro-crown',
    label: '피가로의 왕관',
    series: 'FF6',
    members: ['Edgar', 'Sabin', 'Setzer'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'ff7-avalanche-full',
    label: '아발란치 총공세',
    series: 'FF7',
    members: ['Cloud', 'Barret', 'Tifa', 'Jessie', 'Biggs&Wedge'],
    min: 3,
    bonus: 28,
    statBonus: 14,
  },
  {
    id: 'ff7-crisis-legacy',
    label: '크라이시스의 유산',
    series: 'FF7',
    members: ['Cloud', 'Zack', 'Aerith', 'Genesis'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff7-one-winged-fate',
    label: '외날개의 숙명',
    series: 'FF7',
    members: ['Cloud', 'Sephiroth', 'Genesis'],
    min: 2,
    bonus: 22,
    statBonus: 10,
  },
  {
    id: 'ff8-orphanage-memory',
    label: '고아원의 기억',
    series: 'FF8',
    members: ['Squall', 'Seifer', 'Zell', 'Selphie', 'Quistis', 'Irvine'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff8-gunblade-rivals',
    label: '건블레이드 라이벌',
    series: 'FF8',
    members: ['Squall', 'Seifer'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff8-sharpshooters',
    label: '저격수의 계보',
    series: 'FF8',
    members: ['Laguna', 'Irvine'],
    min: 2,
    bonus: 8,
    statBonus: 4,
  },
  {
    id: 'ff9-knights-of-alexandria',
    label: '알렉산드리아 기사단',
    series: 'FF9',
    members: ['Steiner', 'Beatrix'],
    min: 2,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff9-memory-of-gaia',
    label: '가이아의 기억',
    series: 'FF9',
    members: ['Zidane', 'Vivi', 'Garnet', 'Kuja'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'ff10-yu-yevon-shadow',
    label: '에본의 그림자',
    series: 'FF10',
    members: ['Yuna', 'Seymour', 'Yunalesca'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'ff10-spira-legends',
    label: '스피라의 전설',
    series: 'FF10',
    members: ['Tidus', 'Yuna', 'Auron', 'Jecht'],
    min: 3,
    bonus: 26,
    statBonus: 13,
  },
  {
    id: 'ff10-al-bhed-operation',
    label: '알베드 작전',
    series: 'FF10',
    members: ['Rikku', 'Wakka', 'Tidus'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'dai-disciple-rivals',
    label: '아방류 결전',
    series: 'C-AD',
    members: ['Dai', 'Hyunckel', 'Baran'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'dai-dark-army',
    label: '마왕군의 위압',
    series: 'C-AD',
    members: ['Hadlar', 'Crocodine', 'Hyunckel', 'Baran'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'kh-darkness-road',
    label: '어둠의 길',
    series: 'C-KH',
    members: ['Riku', 'Xehanort', 'Sephiroth'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
  {
    id: 'nier-resistance',
    label: '기계생명체의 잔향',
    series: 'C-NA',
    members: ['2B', '9S', 'A2', 'Adam', 'Eve'],
    min: 3,
    bonus: 18,
    statBonus: 9,
  },
  {
    id: 'tom-rivals',
    label: '마나의 라이벌',
    series: 'C-ToM',
    members: ['Duran', 'Angela', 'Kevin', 'Riesz'],
    min: 2,
    bonus: 10,
    statBonus: 5,
  },
  {
    id: 'vp-einherjar',
    label: '에인헤랴르의 맹세',
    series: 'C-VF',
    members: ['Lenneth', 'Arngrim', 'Lucian'],
    min: 2,
    bonus: 12,
    statBonus: 6,
  },
];

const BOND_ALIASES = {
  '21O': ['21O'],
  A2: ['A2'],
  Adam: ['Adam'],
  Aerith: ['Aerith'],
  Angela: ['Angela'],
  Arc: ['Arc'],
  Arngrim: ['Arngrim'],
  Auron: ['Auron'],
  Baran: ['Baran'],
  Barret: ['Barret'],
  Bartz: ['Bartz'],
  Beatrix: ['Beatrix'],
  'Biggs&Wedge': ['Biggs&Wedge', 'Biggs', 'Wedge'],
  Braska: ['Braska'],
  Cecil: ['Cecil'],
  Celes: ['Celes'],
  Charlotte: ['Charlotte'],
  Cloud: ['Cloud', 'Cloud Strife'],
  'Cloud of Darkness': ['Cloud of Darkness'],
  Crocodine: ['Crocodine'],
  Dagger: ['Dagger'],
  Dai: ['Dai'],
  Dorgann: ['Dorgann'],
  Duran: ['Duran'],
  Edgar: ['Edgar'],
  Edea: ['Edea'],
  Eiko: ['Eiko'],
  Emperor: ['Emperor'],
  Exdeath: ['Exdeath'],
  Eve: ['Eve'],
  Faris: ['Faris'],
  Firion: ['Firion'],
  Fratley: ['Fratley'],
  Freya: ['Freya'],
  Galuf: ['Galuf'],
  Garnet: ['Garnet'],
  Garland: ['Garland'],
  Genesis: ['Genesis'],
  Gilgamesh: ['Gilgamesh'],
  Golbez: ['Golbez'],
  Hadlar: ['Hadlar'],
  Hawkeye: ['Hawkeye'],
  Hyunckel: ['Hyunckel'],
  Ingus: ['Ingus'],
  Irvine: ['Irvine'],
  Jack: ['Jack'],
  Jelanda: ['Jelanda'],
  Jecht: ['Jecht'],
  Jessie: ['Jessie'],
  Kain: ['Kain'],
  Kairi: ['Kairi'],
  Kadaj: ['Kadaj'],
  Kevin: ['Kevin'],
  Kefka: ['Kefka'],
  Kimahri: ['Kimahri'],
  'Kiros and Ward': ['Kiros and Ward'],
  Krile: ['Krile'],
  Laguna: ['Laguna'],
  Lenna: ['Lenna'],
  Lenneth: ['Lenneth'],
  Leon: ['Leon'],
  Locke: ['Locke'],
  Lucian: ['Lucian'],
  Luneth: ['Luneth'],
  Lulu: ['Lulu'],
  Maam: ['Maam'],
  Maria: ['Maria'],
  Mystina: ['Mystina'],
  'Onion Knight': ['Onion Knight'],
  Popp: ['Popp'],
  Quina: ['Quina'],
  Quistis: ['Quistis'],
  Raijin: ['Raijin'],
  'Raijin and Fujin': ['Raijin and Fujin'],
  Refia: ['Refia'],
  Reno: ['Reno'],
  Riesz: ['Riesz'],
  Rikku: ['Rikku'],
  Riku: ['Riku'],
  Rinoa: ['Rinoa'],
  Rosa: ['Rosa'],
  Rydia: ['Rydia'],
  Sabin: ['Sabin'],
  Seifer: ['Seifer'],
  Selphie: ['Selphie'],
  Sephiroth: ['Sephiroth'],
  Setzer: ['Setzer'],
  Seymour: ['Seymour'],
  Shadow: ['Shadow'],
  Sora: ['Sora'],
  Squall: ['Squall'],
  Steiner: ['Steiner'],
  Terra: ['Terra', 'Teera'],
  Tifa: ['Tifa'],
  Tidus: ['Tidus'],
  Vincent: ['Vincent'],
  Vivi: ['Vivi'],
  Wakka: ['Wakka'],
  Yuffie: ['Yuffie'],
  Yuna: ['Yuna'],
  Yunalesca: ['Yunalesca'],
  'Yazoo and Loz': ['Yazoo and Loz'],
  Zack: ['Zack'],
  Zell: ['Zell'],
  Zidane: ['Zidane'],
  Rufus: ['Rufus'],
  Cyan: ['Cyan'],
  Kuja: ['Kuja'],
  '2B': ['2B'],
  '9S': ['9S'],
  Xande: ['Xande'],
  Xehanort: ['Xehanort', 'Young Xehanort'],
};

function getPartyJobCounts(state) {
  return getPartyUnits(state).reduce((counts, unit) => {
    const job = getUnitJob(unit);
    if (!job) return counts;
    counts[job] = (counts[job] || 0) + 1;
    return counts;
  }, {});
}

function satisfiesJobCombo(counts, rule) {
  return Object.entries(rule.requires).every(([job, amount]) => (counts[job] || 0) >= amount);
}

function getBondMembers(unit) {
  const name = String(unit?.name || '').toLowerCase();
  if (!name) return [];
  return Object.entries(BOND_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => name.includes(String(alias).toLowerCase())))
    .map(([member]) => member);
}

function satisfiesBondRule(party, rule) {
  const matched = new Set();
  party.forEach((unit) => {
    if (rule.series && unit?.series !== rule.series) return;
    getBondMembers(unit).forEach((member) => {
      if (rule.members.includes(member)) matched.add(member);
    });
  });
  return matched.size >= rule.min;
}

export function getRoleComboSummary(state) {
  const party = getPartyUnits(state);
  if (!party.length) {
    return { label: '대기', active: [], bonus: 0, statBonus: 0, powerMultiplier: 1, statMultiplier: 1, tone: 'neutral' };
  }

  const counts = getPartyJobCounts(state);
  const active = JOB_COMBO_RULES
    .filter((rule) => satisfiesJobCombo(counts, rule))
    .map((rule) => ({ ...rule, group: 'job' }));
  const uniqueJobs = Object.values(counts).filter((count) => count > 0).length;
  if (party.length >= 4 && uniqueJobs >= 4) {
    active.push({ id: 'many-jobs', label: '다직업 편성', group: 'job', bonus: 12, statBonus: 6 });
  }
  Object.entries(counts).forEach(([job, count]) => {
    if (party.length >= 4 && count >= 4) {
      active.push({ id: `same-job-${job}`, label: `${job} 결사대`, group: 'sameJob', bonus: 22, statBonus: 11 });
    }
  });
  BOND_RULES.forEach((rule) => {
    if (satisfiesBondRule(party, rule)) active.push({ ...rule, group: 'bond' });
  });

  const rawBonus = active.reduce((total, rule) => total + rule.bonus, 0);
  const rawStatBonus = active.reduce((total, rule) => total + rule.statBonus, 0);
  const bonus = Math.min(90, rawBonus);
  const statBonus = Math.min(45, rawStatBonus);
  const label = active.length ? active.slice(0, 2).map((rule) => rule.label).join(' · ') : '조합 없음';
  const tone = bonus >= 50 ? 'best' : bonus >= 30 ? 'good' : bonus > 0 ? 'ok' : 'neutral';
  return {
    label,
    active,
    bonus,
    statBonus,
    powerMultiplier: 1 + bonus / 100,
    statMultiplier: 1 + statBonus / 100,
    tone,
  };
}

function countJobs(units = []) {
  return units.reduce((counts, unit) => {
    const job = getUnitJob(unit);
    if (!job) return counts;
    counts[job] = (counts[job] || 0) + 1;
    return counts;
  }, {});
}

function formatJobRequires(requires = {}) {
  return Object.entries(requires)
    .map(([job, amount]) => `${job} ${amount}명`)
    .join(' + ');
}

function getRequireProgress(counts, requires = {}) {
  const entries = Object.entries(requires);
  const current = entries.reduce((sum, [job, amount]) => sum + Math.min(counts[job] || 0, amount), 0);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  return { current, total };
}

function getMatchedBondMembers(units = [], rule) {
  const matched = new Set();
  units.forEach((unit) => {
    if (rule.series && unit?.series !== rule.series) return;
    getBondMembers(unit).forEach((member) => {
      if (rule.members.includes(member)) matched.add(member);
    });
  });
  return matched;
}

export function getSynergyCatalogSummary(state) {
  const owned = Array.isArray(state?.units) ? state.units : [];
  const party = getPartyUnits(state);
  const ownedJobCounts = countJobs(owned);
  const partyJobCounts = countJobs(party);
  const libraryJobs = [...new Set(FULL_UNIT_LIBRARY.map((unit) => getUnitJob(unit)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const jobItems = JOB_COMBO_RULES.map((rule) => {
    const ownedProgress = getRequireProgress(ownedJobCounts, rule.requires);
    const partyProgress = getRequireProgress(partyJobCounts, rule.requires);
    return {
      ...rule,
      type: 'job',
      groupLabel: '직업 조합',
      condition: formatJobRequires(rule.requires),
      ownedCurrent: ownedProgress.current,
      ownedTotal: ownedProgress.total,
      partyCurrent: partyProgress.current,
      partyTotal: partyProgress.total,
      active: satisfiesJobCombo(partyJobCounts, rule),
    };
  });

  const sameJobItems = libraryJobs.map((job) => {
    const ownedCount = ownedJobCounts[job] || 0;
    const partyCount = partyJobCounts[job] || 0;
    return {
      id: `catalog-same-job-${job}`,
      type: 'sameJob',
      groupLabel: '같은 직업',
      label: `${job} 결사대`,
      condition: `${job} 4명 편성`,
      bonus: 22,
      statBonus: 11,
      ownedCurrent: Math.min(ownedCount, 4),
      ownedTotal: 4,
      partyCurrent: Math.min(partyCount, 4),
      partyTotal: 4,
      active: partyCount >= 4,
    };
  });

  const bondItems = BOND_RULES.map((rule) => {
    const ownedMatched = getMatchedBondMembers(owned, rule);
    const partyMatched = getMatchedBondMembers(party, rule);
    return {
      ...rule,
      type: 'bond',
      groupLabel: '원작 인연',
      condition: `${rule.series ? `${rule.series} ` : ''}${rule.members.join(' / ')} 중 ${rule.min}명`,
      ownedCurrent: Math.min(ownedMatched.size, rule.min),
      ownedTotal: rule.min,
      partyCurrent: Math.min(partyMatched.size, rule.min),
      partyTotal: rule.min,
      active: partyMatched.size >= rule.min,
    };
  });

  const all = [...jobItems, ...sameJobItems, ...bondItems]
    .sort((a, b) => Number(b.active) - Number(a.active)
      || (b.partyCurrent / Math.max(1, b.partyTotal)) - (a.partyCurrent / Math.max(1, a.partyTotal))
      || (b.ownedCurrent / Math.max(1, b.ownedTotal)) - (a.ownedCurrent / Math.max(1, a.ownedTotal))
      || a.label.localeCompare(b.label, 'ko'));

  return {
    all,
    active: all.filter((item) => item.active),
    byType: {
      job: all.filter((item) => item.type === 'job'),
      sameJob: all.filter((item) => item.type === 'sameJob'),
      bond: all.filter((item) => item.type === 'bond'),
    },
  };
}

export function cloneState() {
  return {
    currentScreen: 'home',
    adminMode: false,
    _savedAt: 0,
    resources: {
      rank: 12,
      energy: { current: 82, max: 120 },
      gold: 128400,
      gems: 99999,
      growthStone: 800,
      specialTickets: 0,
    },
    nickname: '',
    _currentUid: null,
    _currentEmail: '',
    party: {
      slots: [...DEFAULT_PARTY],
      formation: defaultPartyFormation(),
    },
    units: createStarterUnits(),
    equipment: {
      inventory: [],
      equipped: {},
    },
    visualProfiles: {
      portraits: {},
      sprites: {},
    },
    home: {
      groundId: 'meadow',
      wave: 14,
      winsToBoss: 3,
      rewardGold: 4680,
      autoRunning: true,
      stageClears: {},
      stageBestWaves: {},
      battleLogs: [],
    },
    quests: normalizeQuestState(),
  };
}

export function renderStars(value) {
  return '★'.repeat(Math.max(1, Math.min(6, Number(value) || 1)));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(value || 0));
}

export function normalizeEquipmentState(equipment = {}) {
  const inventory = Array.isArray(equipment.inventory)
    ? equipment.inventory.map((item) => {
        const stats = item?.stats && typeof item.stats === 'object' ? item.stats : {};
        return {
          ...item,
          stats,
          power: Number(item?.power) || getEquipmentPower(stats),
        };
      }).filter((item) => item?.id && EQUIPMENT_TYPES.includes(item.type))
    : [];
  const validIds = new Set(inventory.map((item) => item.id));
  const equipped = {};

  Object.entries(equipment.equipped || {}).forEach(([unitId, slots]) => {
    if (!slots || typeof slots !== 'object') return;
    const cleanSlots = {};
    EQUIPMENT_TYPES.forEach((type) => {
      const equipmentId = slots[type];
      if (equipmentId && validIds.has(equipmentId)) cleanSlots[type] = equipmentId;
    });
    if (Object.keys(cleanSlots).length) equipped[unitId] = cleanSlots;
  });

  return { inventory, equipped };
}

function normalizeVisualProfileMap(map = {}) {
  if (!map || typeof map !== 'object') return {};
  return Object.entries(map).reduce((acc, [key, value]) => {
    if (!value || typeof value !== 'object') return acc;
    acc[key] = {
      scale: Number.isFinite(Number(value.scale)) ? Number(value.scale) : undefined,
      x: Number.isFinite(Number(value.x)) ? Number(value.x) : undefined,
      y: Number.isFinite(Number(value.y)) ? Number(value.y) : undefined,
    };
    Object.keys(acc[key]).forEach((field) => {
      if (acc[key][field] === undefined) delete acc[key][field];
    });
    return acc;
  }, {});
}

export function normalizeVisualProfiles(profiles = {}) {
  return {
    portraits: normalizeVisualProfileMap(profiles.portraits),
    sprites: normalizeVisualProfileMap(profiles.sprites),
  };
}

export const VISUAL_DEFAULTS = {
  portrait: { scale: 1.3, x: 0, y: 0 },
  sprite: { scale: 1, x: 0, y: 0 },
};

export const VISUAL_LIMITS = {
  portrait: {
    scale: { min: 0.6, max: 2.2, step: 0.01 },
    x: { min: -80, max: 80, step: 1 },
    y: { min: -80, max: 80, step: 1 },
  },
  sprite: {
    scale: { min: 0.5, max: 2.4, step: 0.01 },
    x: { min: -120, max: 120, step: 1 },
    y: { min: -120, max: 120, step: 1 },
  },
};

export function ensureVisualProfiles(state) {
  if (!state || typeof state !== 'object') return normalizeVisualProfiles();
  if (!state.visualProfiles || typeof state.visualProfiles !== 'object') {
    state.visualProfiles = {};
  }
  if (!state.visualProfiles.portraits || typeof state.visualProfiles.portraits !== 'object') {
    state.visualProfiles.portraits = {};
  }
  if (!state.visualProfiles.sprites || typeof state.visualProfiles.sprites !== 'object') {
    state.visualProfiles.sprites = {};
  }
  return state.visualProfiles;
}

export function getVisualKey(unit) {
  const tier = Number(unit?.collectionTier || unit?.tier || unit?.stars || unit?.minTier || 1);
  return `${resolveUnitFolder(unit) || unit?.folderKey || unit?.id || 'unit'}:${tier}`;
}

function getTierFolderVisualKey(unit, tier) {
  const folder = unit?.tierFolders?.[tier];
  return folder ? `${folder}:${tier}` : '';
}

function getLegacyVisualKey(unit) {
  const tier = Number(unit?.collectionTier || unit?.tier || unit?.stars || unit?.minTier || 1);
  return `${unit?.folderKey || unit?.id || 'unit'}:${tier}`;
}

function getVisualLookupKeys(unit) {
  const tier = Number(unit?.collectionTier || unit?.tier || unit?.stars || unit?.minTier || 1);
  const keys = [getVisualKey(unit), getLegacyVisualKey(unit)];
  if (unit?.tierFolders && typeof unit.tierFolders === 'object') {
    const tierKeys = Object.keys(unit.tierFolders)
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .sort((a, b) => Math.abs(a - tier) - Math.abs(b - tier) || b - a);
    tierKeys.forEach((tierKey) => {
      const folder = unit.tierFolders[tierKey];
      if (folder) keys.push(`${folder}:${tierKey}`);
      if (unit.folderKey || unit.id) keys.push(`${unit.folderKey || unit.id}:${tierKey}`);
    });
  }
  return [...new Set(keys.filter(Boolean))];
}

export function clampVisualValue(kind, field, value) {
  const limits = VISUAL_LIMITS[kind]?.[field];
  const fallback = VISUAL_DEFAULTS[kind]?.[field] || 0;
  const numeric = Number.isFinite(Number(value)) ? Number(value) : fallback;
  if (!limits) return numeric;
  return Math.max(limits.min, Math.min(limits.max, numeric));
}

export function getUnitVisualProfile(state, unit, kind) {
  const profiles = ensureVisualProfiles(state);
  const store = kind === 'portrait' ? profiles.portraits : profiles.sprites;
  const saved = getVisualLookupKeys(unit).map((key) => store[key]).find(Boolean) || {};
  const defaults = VISUAL_DEFAULTS[kind] || VISUAL_DEFAULTS.portrait;
  return {
    scale: clampVisualValue(kind, 'scale', saved.scale ?? defaults.scale),
    x: clampVisualValue(kind, 'x', saved.x ?? defaults.x),
    y: clampVisualValue(kind, 'y', saved.y ?? defaults.y),
  };
}

export function setUnitVisualProfileValue(state, unit, kind, field, value) {
  const current = getUnitVisualProfile(state, unit, kind);
  const profiles = ensureVisualProfiles(state);
  const store = kind === 'portrait' ? profiles.portraits : profiles.sprites;
  const key = getVisualKey(unit);
  store[key] = {
    ...current,
    [field]: clampVisualValue(kind, field, value),
  };
  return store[key];
}

export function applyVisualProfileToPromotionLine(state, unit, kind = 'all') {
  const profiles = ensureVisualProfiles(state);
  const currentTier = Number(unit?.collectionTier || unit?.tier || unit?.stars || unit?.minTier || 1);
  const line = currentTier <= 2 ? [1, 2] : currentTier <= 4 ? [3, 4] : [currentTier];
  const sourcePortrait = getUnitVisualProfile(state, unit, 'portrait');
  const sourceSprite = getUnitVisualProfile(state, unit, 'sprite');
  const kinds = kind === 'all' ? ['portrait', 'sprite'] : [kind];
  let applied = 0;

  line.forEach((tier) => {
    const targetKey = getTierFolderVisualKey(unit, tier);
    if (!targetKey) return;
    if (kinds.includes('portrait')) {
      profiles.portraits[targetKey] = { ...sourcePortrait };
      applied += 1;
    }
    if (kinds.includes('sprite')) {
      profiles.sprites[targetKey] = { ...sourceSprite };
      applied += 1;
    }
  });

  return applied;
}

export function resetUnitVisualProfile(state, unit, kind = 'all') {
  const profiles = ensureVisualProfiles(state);
  const key = getVisualKey(unit);
  if (kind === 'all' || kind === 'portrait') delete profiles.portraits[key];
  if (kind === 'all' || kind === 'sprite') delete profiles.sprites[key];
}

export function renderVisualVars(state, unit) {
  const portrait = getUnitVisualProfile(state, unit, 'portrait');
  const sprite = getUnitVisualProfile(state, unit, 'sprite');
  const chipRatio = 42 / 132;
  return [
    `--portrait-scale:${portrait.scale}`,
    `--portrait-x:${portrait.x}px`,
    `--portrait-y:${portrait.y}px`,
    `--portrait-chip-x:${portrait.x * chipRatio}px`,
    `--portrait-chip-y:${portrait.y * chipRatio}px`,
    `--portrait-chip-wide-x:${portrait.x * (50 / 132)}px`,
    `--portrait-chip-wide-y:${portrait.y * (50 / 132)}px`,
    `--sprite-scale:${sprite.scale}`,
    `--sprite-x:${sprite.x}px`,
    `--sprite-y:${sprite.y}px`,
  ].join(';');
}

export function toVisualControlValue(field, value) {
  return field === 'scale' ? Math.round(Number(value) * 100) : Math.round(Number(value));
}

export function fromVisualControlValue(field, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return field === 'scale' ? 1 : 0;
  return field === 'scale' ? numeric / 100 : numeric;
}

function cleanForStorage(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanForStorage(item)).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== 'object') {
    return value === undefined ? undefined : value;
  }
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item === undefined || typeof item === 'function') return acc;
    const cleaned = cleanForStorage(item);
    if (cleaned !== undefined) acc[key] = cleaned;
    return acc;
  }, {});
}

function serializeUnitForStorage(unit) {
  return cleanForStorage({
    id: unit.id,
    folderKey: unit.folderKey,
    tier: unit.tier,
    level: unit.level,
    shards: unit.shards || 0,
    limitBreak: unit.limitBreak || 0,
    hp: unit.hp,
  });
}
function createOwnedUnit(unit) {
  const tier = Number(unit?.minTier) || Number(unit?.stars) || 1;
  return {
    ...unit,
    tier,
    level: 1,
    shards: 0,
    hp: Number(unit?.maxHp) || 1,
  };
}

function createStarterUnits() {
  return DEFAULT_PARTY
    .map((unitId) => FULL_UNIT_LIBRARY.find((unit) => unit.id === unitId))
    .filter(Boolean)
    .map(createOwnedUnit);
}
function todayQuestKey() {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeQuestState(quests = {}) {
  const today = todayQuestKey();
  const daily = quests.daily && typeof quests.daily === 'object' ? quests.daily : {};
  return {
    claimed: quests.claimed && typeof quests.claimed === 'object' ? quests.claimed : {},
    daily: {
      date: daily.date === today ? today : today,
      claimed: daily.date === today && daily.claimed && typeof daily.claimed === 'object' ? daily.claimed : {},
      progress: daily.date === today && daily.progress && typeof daily.progress === 'object' ? daily.progress : {},
    },
  };
}

export function recordQuestProgress(state, key, amount = 1) {
  if (!state) return;
  state.quests = normalizeQuestState(state.quests);
  const progress = state.quests.daily.progress;
  progress[key] = (Number(progress[key]) || 0) + Math.max(0, Math.floor(Number(amount) || 0));
}

function getQuestClaimStore(state, quest) {
  state.quests = normalizeQuestState(state.quests);
  return quest.group === 'daily' ? state.quests.daily.claimed : state.quests.claimed;
}

export function getQuestMetricValue(state, metric = '') {
  if (metric.startsWith('stageClear:')) {
    const groundId = metric.split(':')[1];
    return getGroundStageState(state, groundId).cleared ? 1 : 0;
  }
  if (metric.startsWith('daily:')) {
    const key = metric.split(':')[1];
    const quests = normalizeQuestState(state?.quests || {});
    return Number(quests.daily.progress?.[key]) || 0;
  }
  if (metric === 'partyPower') return getPartyPower(state);
  if (metric === 'ownedUnits') return Array.isArray(state?.units) ? state.units.length : 0;
  if (metric === 'fiveStarUnits') return (state?.units || []).filter((unit) => Number(unit.stars || unit.tier || 0) >= 5).length;
  if (metric === 'equipmentOwned') return state?.equipment?.inventory?.length || 0;
  if (metric === 'bosses') return Number(state?.home?.earnedResources?.bosses) || 0;
  if (metric === 'waves') return Number(state?.home?.earnedResources?.waves) || 0;
  return 0;
}

export function getQuestStatus(state, quest) {
  const current = getQuestMetricValue(state, quest.metric);
  const target = Math.max(1, Number(quest.target) || 1);
  const store = getQuestClaimStore(state, quest);
  const claimed = Boolean(store[quest.id]);
  const complete = current >= target;
  return {
    ...quest,
    current,
    target,
    progress: Math.max(0, Math.min(1, current / target)),
    complete,
    claimed,
    claimable: complete && !claimed,
  };
}

export function getQuestSummary(state) {
  const quests = QUEST_DATA.map((quest) => getQuestStatus(state, quest));
  return {
    all: quests,
    claimable: quests.filter((quest) => quest.claimable),
    byGroup: {
      story: quests.filter((quest) => quest.group === 'story'),
      daily: quests.filter((quest) => quest.group === 'daily'),
      achievement: quests.filter((quest) => quest.group === 'achievement'),
    },
  };
}

export function formatQuestReward(reward = {}) {
  return [
    reward.gold ? `골드 ${formatNumber(reward.gold)}` : '',
    reward.gems ? `다이아 ${formatNumber(reward.gems)}` : '',
    reward.growthStone ? `성장석 ${formatNumber(reward.growthStone)}` : '',

    reward.tickets ? `티켓 ${formatNumber(reward.tickets)}` : '',
  ].filter(Boolean).join(' · ') || '보상 없음';
}

export function claimQuestReward(state, questId) {
  const quest = QUEST_DATA.find((item) => item.id === questId);
  if (!quest) return { ok: false, reason: 'missing' };
  const status = getQuestStatus(state, quest);
  if (!status.claimable) return { ok: false, reason: status.claimed ? 'claimed' : 'incomplete', status };
  const reward = quest.reward || {};
  state.resources.gold = (Number(state.resources.gold) || 0) + (Number(reward.gold) || 0);
  state.resources.gems = (Number(state.resources.gems) || 0) + (Number(reward.gems) || 0);
  state.resources.growthStone = (Number(state.resources.growthStone) || 0) + (Number(reward.growthStone) || 0);
  state.resources.specialTickets = (Number(state.resources.specialTickets) || 0) + (Number(reward.tickets) || 0);
  const store = getQuestClaimStore(state, quest);
  store[quest.id] = Date.now();
  return { ok: true, quest, reward, status: getQuestStatus(state, quest) };
}
export function createPersistedState(state, savedAt = Date.now()) {
  return cleanForStorage({
    _savedAt: savedAt,
    currentScreen: state.currentScreen,
    resources: state.resources,
    nickname: state.nickname,
    party: state.party,
    units: Array.isArray(state.units) ? state.units.map(serializeUnitForStorage) : [],
    equipment: state.equipment,
    visualProfiles: normalizeVisualProfiles(state.visualProfiles || {}),
    home: state.home,
    quests: normalizeQuestState(state.quests),
  });
}

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ensureUnlockedHomeGround(cloneState());
    const saved = JSON.parse(raw);
    const fallback = cloneState();
    const loaded = {
      ...fallback,
      ...saved,
      resources: {
        ...fallback.resources,
        ...(saved.resources || {}),
        energy: {
          ...fallback.resources.energy,
          ...(saved.resources?.energy || {}),
        },
      },
      home: {
        ...fallback.home,
        ...(saved.home || {}),
      },
      quests: normalizeQuestState(saved.quests || fallback.quests),
      party: {
        ...fallback.party,
        ...(saved.party || {}),
        formation: normalizePartyFormation(saved.party?.formation || fallback.party.formation),
      },
      equipment: normalizeEquipmentState(saved.equipment || fallback.equipment),
      visualProfiles: normalizeVisualProfiles(saved.visualProfiles || fallback.visualProfiles),
      units: Array.isArray(saved.units) && saved.units.length
        ? saved.units.map((u) => {
            const base = FULL_UNIT_LIBRARY.find((b) => b.folderKey === u.folderKey || b.id === u.id);
            if (!base) return u;
            const merged = { shards: 0, limitBreak: 0, ...base, ...u,
              // 마스터 데이터 항목은 항상 unit-data.js 기준으로 덮어씌움
              role:        base.role,
              jobType:     base.jobType,
              job:         base.job,
              jobRoles:    base.jobRoles,
              battleRole:  base.battleRole || base.role,
              commonPassiveId: base.commonPassiveId,
              limitBurstId: base.limitBurstId,
              limitBurstName: base.limitBurstName,
              stars:       base.stars,
              minTier:     base.minTier,
              maxTier:     base.maxTier,
              tierFolders: base.tierFolders,
            };
            // 구버전 속성 마이그레이션: 화/목/수 표기를 묵/찌/빠로 변환
            const elMap = {
              '화': '묵',
              '목': '찌',
              '수': '빠',
              '화속': '묵',
              '천속': '찌',
              '지속': '빠',
            };
            if (elMap[merged.element]) merged.element = elMap[merged.element];
            const minTier = Number(merged.minTier) || 1;
            const maxTier = Number(merged.maxTier) || minTier;
            merged.tier = Math.max(minTier, Math.min(maxTier, Number(merged.tier) || minTier));
            merged.stars = Math.max(1, Math.min(6, Math.floor(Number(merged.tier) || Number(base.stars) || 1)));
            merged.limitBreak = Math.max(0, Math.floor(Number(merged.limitBreak) || Math.max(0, merged.tier - minTier)));
            return merged;
          }).filter(u => u.tierFolders)
        : fallback.units,
    };
    return ensureUnlockedHomeGround(loaded);
  } catch {
    return ensureUnlockedHomeGround(cloneState());
  }
}

function ensureUnlockedHomeGround(state) {
  if (!isGroundUnlocked(state, state.home?.groundId)) {
    state.home.groundId = getFirstUnlockedGroundId(state);
    state.home.wave = Math.max(1, Number(state.home.stageBestWaves?.[state.home.groundId]) || 1);
    state.home.winsToBoss = Math.max(1, 5 - (state.home.wave % 5 || 5));
  }
  return state;
}
export function saveAppState(state) {
  try {
    const persisted = createPersistedState(state);
    state._savedAt = persisted._savedAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    return persisted;
  } catch {
    return createPersistedState(state);
  }
}

export function getUnitById(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) || null;
}

export function getPartyUnits(state) {
  return state.party.slots.map((id) => getUnitById(state, id)).filter(Boolean);
}

export function getFormationRowForSlot(state, slotIndex) {
  return normalizePartyFormation(state.party?.formation)[slotIndex] || defaultPartyFormation()[slotIndex] || 'back';
}

export function getUnitFormationSlot(state, unitId) {
  return state.party?.slots?.indexOf(unitId) ?? -1;
}

export function getUnitFormationRow(state, unitId) {
  const slotIndex = getUnitFormationSlot(state, unitId);
  return slotIndex >= 0 ? getFormationRowForSlot(state, slotIndex) : null;
}

export function ensureEquipmentState(state) {
  state.equipment = normalizeEquipmentState(state.equipment || {});
  return state.equipment;
}

export function getEquipmentById(state, equipmentId) {
  const equipment = state.equipment || { inventory: [] };
  return equipment.inventory.find((item) => item.id === equipmentId) || null;
}

export function getEquippedItemsForUnit(state, unitId) {
  const slots = state.equipment?.equipped?.[unitId] || {};
  return Object.fromEntries(
    EQUIPMENT_TYPES.map((type) => [type, slots[type] ? getEquipmentById(state, slots[type]) : null])
  );
}

export function getUnitEquipmentStats(state, unitOrId) {
  const unitId = typeof unitOrId === 'string' ? unitOrId : unitOrId?.id;
  const equipped = getEquippedItemsForUnit(state, unitId);
  return Object.values(equipped).reduce((totals, item) => {
    if (!item?.stats) return totals;
    Object.entries(item.stats).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + (Number(value) || 0);
    });
    totals.power = (totals.power || 0) + (Number(item.power) || getEquipmentPower(item.stats));
    return totals;
  }, {});
}

export function getEffectiveUnitStats(state, unit) {
  if (!unit) return null;
  const bonus = getUnitEquipmentStats(state, unit.id);
  const formationRow = getUnitFormationRow(state, unit.id);
  const formationFit = getFormationRoleFit(unit, formationRow);
  const formationMultipliers = getFormationStatMultipliers(unit, formationRow);
  const seriesSynergy = getUnitSeriesSynergy(state, unit);
  const roleCombo = getRoleComboSummary(state);
  const standaloneTrait = getUnitStandaloneTrait(unit);
  const commonPassive = getUnitCommonPassive(unit) || {};
  const applySynergy = (value, key) => Math.max(0, Math.round(
    (Number(value) || 0)
      * (formationMultipliers[key] || 1)
      * (standaloneTrait.statMultiplier || 1)
      * (seriesSynergy.statMultiplier || 1)
      * (roleCombo.statMultiplier || 1)
      * (commonPassive.statMultiplier || 1)
      * (commonPassive.stats?.[key] || 1)
  ));

  const rawMaxHp = (Number(unit.maxHp) || 0) + (Number(bonus.maxHp) || 0);
  const maxHp = applySynergy(rawMaxHp, 'maxHp');
  const rawHp = Math.min(rawMaxHp, (Number(unit.hp) || Number(unit.maxHp) || rawMaxHp) + (Number(bonus.maxHp) || 0));
  const hpRatio = rawMaxHp > 0 ? maxHp / rawMaxHp : 1;
  const hp = Math.min(maxHp, Math.max(1, Math.round(rawHp * hpRatio)));
  const basePower = Number(unit.power) || 0;
  const equipmentPower = Number(bonus.power) || 0;
  const rawPower = basePower + equipmentPower;
  const formationPower = formationRow ? Math.round(rawPower * ((formationFit.powerMultiplier || 1) - 1)) : 0;
  const standalonePower = Math.round((rawPower + formationPower) * ((standaloneTrait.powerMultiplier || 1) - 1));
  const seriesPower = Math.round((rawPower + formationPower + standalonePower) * ((seriesSynergy.powerMultiplier || 1) - 1));
  const comboPower = Math.round((rawPower + formationPower + standalonePower + seriesPower) * ((roleCombo.powerMultiplier || 1) - 1));
  const commonPower = Math.round((rawPower + formationPower + standalonePower + seriesPower + comboPower) * ((commonPassive.powerMultiplier || 1) - 1));
  return {
    ...unit,
    basePower,
    equipmentPower,
    formationPower,
    standalonePower,
    standaloneTrait,
    seriesPower,
    seriesSynergy,
    comboPower,
    roleCombo,
    commonPassive,
    commonPower,
    formationRow,
    formationFit,
    formationMultipliers,
    equipmentStats: bonus,
    power: Math.max(0, rawPower + formationPower + standalonePower + seriesPower + comboPower + commonPower),
    maxHp,
    hp,
    mp: applySynergy((Number(unit.mp) || 0) + (Number(bonus.mp) || 0), 'mp'),
    atk: applySynergy((Number(unit.atk) || 0) + (Number(bonus.atk) || 0), 'atk'),
    mag: applySynergy((Number(unit.mag) || 0) + (Number(bonus.mag) || 0), 'mag'),
    def: applySynergy((Number(unit.def) || 0) + (Number(bonus.def) || 0), 'def'),
    spr: applySynergy((Number(unit.spr) || 0) + (Number(bonus.spr) || 0), 'spr'),
  };
}

export function getEffectivePartyUnits(state) {
  return getPartyUnits(state).map((unit) => getEffectiveUnitStats(state, unit)).filter(Boolean);
}

export function getPartyPower(state) {
  return getEffectivePartyUnits(state).reduce((total, unit) => total + (Number(unit.power) || 0), 0);
}

export function getFormationSummary(state) {
  const party = getPartyUnits(state);
  const fits = party.map((unit) => getFormationRoleFit(unit, getUnitFormationRow(state, unit.id)));
  if (!fits.length) return { label: '대기', percent: 100, bonus: 0, tone: 'neutral' };

  const average = fits.reduce((total, fit) => total + (fit.score || 1), 0) / fits.length;
  const percent = Math.round(average * 100);
  const bonus = percent - 100;
  const label = percent >= 107 ? '최적' : percent >= 102 ? '우수' : percent >= 98 ? '안정' : '조정 필요';
  const tone = percent >= 107 ? 'best' : percent >= 102 ? 'good' : percent >= 98 ? 'ok' : 'bad';
  return { label, percent, bonus, tone };
}

export function getReserveUnits(state) {
  const party = new Set(state.party.slots);
  return state.units.filter((unit) => !party.has(unit.id));
}

export function resolveGround(groundId) {
  return GROUND_DATA[groundId] || GROUND_DATA.meadow;
}

export function getGroundStageState(state, groundId = state?.home?.groundId) {
  const id = GROUND_DATA[groundId] ? groundId : 'meadow';
  const ground = resolveGround(id);
  const activeWave = Math.max(1, Math.floor(Number(state?.home?.wave) || 1));
  const currentWave = state?.home?.groundId === id ? activeWave : 1;
  const bestWaves = state?.home?.stageBestWaves || {};
  const bestWave = Math.max(currentWave, Math.floor(Number(bestWaves[id]) || 0));
  const targetWave = Math.max(5, Math.floor(Number(ground.targetWave) || 15));
  const cleared = Boolean(state?.home?.stageClears?.[id]) || bestWave > targetWave;
  const progress = Math.max(0, Math.min(1, (bestWave - 1) / Math.max(1, targetWave - 1)));
  return { id, ground, currentWave, bestWave, targetWave, cleared, progress };
}

export function getGroundRewardInfo(ground) {
  const firstClear = ground?.firstClear || { gold: 0, gems: 0 };
  const repeatBoss = ground?.repeatBoss || { gold: 0, gems: 0 };
  return { firstClear, repeatBoss };
}

export function isGroundUnlocked(state, groundId) {
  const ground = resolveGround(groundId);
  if (!ground?.requires) return true;
  return getGroundStageState(state, ground.requires).cleared;
}

export function getFirstUnlockedGroundId(state) {
  return Object.keys(GROUND_DATA).find((groundId) => isGroundUnlocked(state, groundId)) || 'meadow';
}

export function getGroundUnlockRequirement(state, groundId) {
  const ground = resolveGround(groundId);
  if (!ground?.requires) return null;
  const required = resolveGround(ground.requires);
  return {
    groundId: ground.requires,
    label: required.label,
    cleared: getGroundStageState(state, ground.requires).cleared,
  };
}
export function resolveUnitFolder(unit) {
  // tier 기반 (신규)
  if (unit.tierFolders) {
    const tier = unit.tier || unit.minTier || 1;
    if (unit.tierFolders[tier]) return unit.tierFolders[tier];
    const keys = Object.keys(unit.tierFolders).map(Number).sort((a, b) => a - b);
    return unit.tierFolders[keys[0]] || null;
  }
  // 구형 assetKey 기반 폴백
  const folders = UNIT_ASSET_FOLDERS[unit.assetKey] || {};
  const stars = Math.max(1, Math.min(6, Number(unit.stars) || 1));
  if (folders[stars]) return folders[stars];
  const keys = Object.keys(folders).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!keys.length) return null;
  let closest = keys[0];
  for (const key of keys) {
    if (Math.abs(key - stars) < Math.abs(closest - stars)) closest = key;
  }
  return folders[closest];
}

// move.gif 없는 폴더 목록 — 해당 폴더 요청 시 404 방지
const NO_MOVE_FOLDERS = new Set([
  "images/units/C-NA/2B T5",
  "images/units/C-NA/2B T6",
  "images/units/C-NA/A2 T5",
  "images/units/C-NA/A2 T6",
  "images/units/FF10/FF10_Songstress_Yuna_T5",
  "images/units/FF10/FF10_Songstress_Yuna_T6",
  "images/units/FF3/FF3_Onion_Knight_NV_T5",
  "images/units/FF3/FF3_Onion_Knight_NV_T6",
  "images/units/FF4/FF4_Summoner_Rydia_NV_T5",
  "images/units/FF4/FF4_Summoner_Rydia_NV_T6",
  "images/units/FF4/FF4_White_Mage_Rosa_T5",
  "images/units/FF5/FF5_World's_Hero_Gilgamesh_T5",
  "images/units/FF5/FF5_World's_Hero_Gilgamesh_T6",
  "images/units/FF6/FF6_Monk_Sabin_of_Kolts_T5",
  "images/units/FF7/FF7_Genesis_T5",
  "images/units/FF7/FF7_Genesis_T6",
  "images/units/FF7/FF7_Living_Legacy_Cloud_Strife_T5",
  "images/units/FF7/FF7_Materia_Hunter_Yuffie_T3",
  "images/units/FF7/FF7_Materia_Hunter_Yuffie_T4",
  "images/units/FF7/FF7_Young_Hero_Zack_T5",
  "images/units/FF7/FF7_Young_Hero_Zack_T6",
  "images/units/FF8/FF8_SeeD's_Blue_Mage_Quistis_T3",
  "images/units/FF8/FF8_SeeD's_Blue_Mage_Quistis_T4",
  "images/units/FF8/FF8_Sorceress's_Knight_Squall_T5",
  "images/units/FF8/FF8_Sorceress's_Knight_Squall_T6",
  "images/units/FF9/FF9_Determined_Dagger_T5",
  "images/units/FF9/FF9_Determined_Dagger_T6",
  "images/units/FF9/FF9_Knight_of_Pluto_Captain_Steiner_T5",
  "images/units/FF9/FF9_Knight_of_Pluto_Captain_Steiner_T6",
]);

const SPRITE_MEDIA_EXTENSIONS = ['webm', 'mp4', 'gif'];

function buildSpriteMediaCandidates(basePath, names) {
  return names.flatMap((name) => SPRITE_MEDIA_EXTENSIONS.map((ext) => `${basePath}/${name}.${ext}`));
}

function buildSpriteImageCandidates(basePath, names) {
  return names.map((name) => `${basePath}/${name}.gif`);
}

export function resolveUnitSprite(unit, state) {
  const folder = resolveUnitFolder(unit);
  if (!folder) return '';
  const map = {
    idle:    ['idle'],
    move:    NO_MOVE_FOLDERS.has(folder) ? ['idle'] : ['move', 'idle'],
    attack:  ['attack', 'idle'],
    casting: ['casting', 'idle'],
    limit:   ['limit', 'ilmit', 'attack', 'idle'],
    victory: ['victory', 'idle'],
    defeat:  ['defeat', 'idle'],
  };
  const candidates = map[state] || map.idle;
  return buildSpriteMediaCandidates(folder, candidates);
}


export function resolveUnitImageSprite(unit, state) {
  const folder = resolveUnitFolder(unit);
  if (!folder) return '';
  const map = {
    idle:    ['idle'],
    move:    NO_MOVE_FOLDERS.has(folder) ? ['idle'] : ['move', 'idle'],
    attack:  ['attack', 'idle'],
    casting: ['casting', 'idle'],
    limit:   ['limit', 'ilmit', 'attack', 'idle'],
    victory: ['victory', 'idle'],
    defeat:  ['defeat', 'idle'],
  };
  const candidates = map[state] || map.idle;
  return buildSpriteImageCandidates(folder, candidates);
}
export function resolveUnitPortrait(unit) {
  const folder = resolveUnitFolder(unit);
  if (!folder) return [];
  return [`${folder}/1.png`, ...resolveUnitImageSprite(unit, 'idle')];
}

export const RARITY_COLORS = {
  1: '#8A94A6',
  2: '#38D978',
  3: '#3FA7FF',
  4: '#A66BFF',
  5: '#FFCF4A',
  6: '#FF4D5E',
};

export function getRarityStars(unitOrStars) {
  const raw = typeof unitOrStars === 'number'
    ? unitOrStars
    : Number(unitOrStars?.collectionTier || unitOrStars?.tier || unitOrStars?.stars || unitOrStars?.minTier || 1);
  return Math.max(1, Math.min(6, Math.round(Number(raw) || 1)));
}

export function getRarityColor(unitOrStars) {
  return RARITY_COLORS[getRarityStars(unitOrStars)] || RARITY_COLORS[1];
}

export function getRarityStyle(unitOrStars) {
  return `--rarity-color:${getRarityColor(unitOrStars)}`;
}

export function resolveMonsterSprite(monsterId, state, isBoss) {
  const folder = isBoss ? 'boss' : 'normal';
  const map = {
    idle:   ['idle', 'atk'],
    attack: ['atk', 'idle'],
  };
  return (map[state] || map.idle)
    .flatMap((name) => SPRITE_MEDIA_EXTENSIONS.map((ext) => `images/monsters/W1/${folder}/${monsterId}_${name}.${ext}`));
}
