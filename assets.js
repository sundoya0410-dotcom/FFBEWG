// assets.js — 호환성 유지용 re-export 배럴
// 각 파일을 직접 import해도 되고, 기존처럼 assets.js에서 가져와도 동일하게 동작합니다.
//
//   import { FULL_UNIT_LIBRARY } from './unit-data.js';   // 직접
//   import { FULL_UNIT_LIBRARY } from './assets.js';      // 기존 방식 (동일)

export { FULL_UNIT_LIBRARY } from './unit-data.js';

export {
  SCREEN_META,
  GROUND_DATA,
  DEFAULT_PARTY,
  UNIT_TIER_FOLDERS,
  UNIT_ASSET_FOLDERS,
  UNIT_RENDER_PROFILES,
  MONSTER_RENDER_PROFILE,
} from './game-data.js';

export {
  STORAGE_KEY,
  cloneState,
  renderStars,
  formatNumber,
  loadAppState,
  saveAppState,
  getUnitById,
  getPartyUnits,
  getPartyPower,
  getReserveUnits,
  resolveGround,
  resolveUnitFolder,
  resolveUnitSprite,
  resolveMonsterSprite,
} from './utils.js';
