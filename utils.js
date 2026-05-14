import { GROUND_DATA, UNIT_ASSET_FOLDERS, DEFAULT_PARTY } from './game-data.js';
import { FULL_UNIT_LIBRARY } from './unit-data.js';

export const STORAGE_KEY = 'ffbewg-compact-core-ffdiag-v4';

export function cloneState() {
  return {
    currentScreen: 'home',
    resources: {
      rank: 12,
      energy: { current: 82, max: 120 },
      gold: 128400,
      gems: 99999,
      specialTickets: 0,
    },
    nickname: '',
    _currentUid: null,
    party: {
      slots: [...DEFAULT_PARTY],
    },
    units: [], // 소환으로만 유닛 획득
    home: {
      groundId: 'meadow',
      wave: 14,
      winsToBoss: 3,
      rewardGold: 4680,
      autoRunning: true,
    },
  };
}

export function renderStars(value) {
  return '★'.repeat(Math.max(1, Math.min(6, Number(value) || 1)));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(Math.floor(value || 0));
}

export function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneState();
    const saved = JSON.parse(raw);
    const fallback = cloneState();
    return {
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
      party: {
        ...fallback.party,
        ...(saved.party || {}),
      },
      units: Array.isArray(saved.units) && saved.units.length
        ? saved.units.map((u) => {
            const base = FULL_UNIT_LIBRARY.find((b) => b.folderKey === u.folderKey || b.id === u.id);
            if (!base) return u;
            const merged = { shards: 0, ...base, ...u,
              // 마스터 데이터 항목은 항상 unit-data.js 기준으로 덮어씌움
              role:        base.role,
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
            return merged;
          }).filter(u => u.tierFolders)
        : fallback.units,
    };
  } catch {
    return cloneState();
  }
}

export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getUnitById(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) || null;
}

export function getPartyUnits(state) {
  return state.party.slots.map((id) => getUnitById(state, id)).filter(Boolean);
}

export function getPartyPower(state) {
  return getPartyUnits(state).reduce((total, unit) => total + (Number(unit.power) || 0), 0);
}

export function getReserveUnits(state) {
  const party = new Set(state.party.slots);
  return state.units.filter((unit) => !party.has(unit.id));
}

export function resolveGround(groundId) {
  return GROUND_DATA[groundId] || GROUND_DATA.meadow;
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
  return candidates.map((name) => `${folder}/${name}.gif`);
}

export function resolveMonsterSprite(monsterId, state, isBoss) {
  const folder = isBoss ? 'boss' : 'normal';
  const map = {
    idle:   ['idle', 'atk'],
    attack: ['atk', 'idle'],
  };
  return (map[state] || map.idle).map((name) => `images/monsters/W1/${folder}/${monsterId}_${name}.gif`);
}
