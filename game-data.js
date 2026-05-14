import { FULL_UNIT_LIBRARY } from './unit-data.js';

export const SCREEN_META = {
  home: {
    label: '홈 허브 / 4인 파티 중심 메인 화면',
    note: '',
    title: '홈',
  },
  units: {
    label: '유닛 / 4인 파티 편성 확인',
    note: '',
    title: '유닛',
  },
  growth: {
    label: '성장 / 압축 정보',
    note: '',
    title: '성장',
  },
  summon: {
    label: '소환 / 코어 더미 화면',
    note: '',
    title: '소환',
  },
  pvp: {
    label: 'PVP / 코어 더미 화면',
    note: '',
    title: 'PVP',
  },
};

export const GROUND_DATA = {
  meadow: {
    label: '초원의 경계',
    background: 'images/bg/battle_bg_0001_01.jpg',
    normal: ['1010010', '1010020', '1010060', '1010110'],
    boss: ['2010110', '2010130'],
  },
  ruins: {
    label: '폐허의 잔영',
    background: 'images/bg/battle_bg_0004_01.jpg',
    normal: ['1030010', '1030020', '1030110', '1030310'],
    boss: ['2030010', '2030020'],
  },
  'ice-cave': {
    label: '빙혈 동굴',
    background: 'images/bg/battle_bg_0018_01.jpg',
    normal: ['1080150', '1080210', '1080230', '1040110'],
    boss: ['2040010', '2040110'],
  },
  volcano: {
    label: '용암 균열',
    background: 'images/bg/battle_bg_0034_01.jpg',
    normal: ['1050010', '1050110', '1050210', '1050440'],
    boss: ['2050110'],
  },
  abyss: {
    label: '심연의 문턱',
    background: 'images/bg/battle_bg_0055_01.jpg',
    normal: ['1070010', '1070020', '1070040', '1060010'],
    boss: ['2040310', '2040270'],
  },
};

export const DEFAULT_PARTY = ['u003', 'u002', 'u004', 'u001'];

// folderKey → tierFolders 빠른 조회
export const UNIT_TIER_FOLDERS = Object.fromEntries(
  FULL_UNIT_LIBRARY.map(u => [u.folderKey, u.tierFolders])
);

export const UNIT_ASSET_FOLDERS = {
  guardian: {
    1: 'images/units/FF10/FF10_Auron_T3',
    3: 'images/units/FF10/FF10_Auron_T3',
    4: 'images/units/FF10/FF10_Auron_T4',
    5: 'images/units/FF10/FF10_Legendary_Guardian_Auron_T5',
    6: 'images/units/FF10/FF10_Legendary_Guardian_Auron_T6',
  },
  blade: {
    1: 'images/units/FF10/FF10_Tidus_T1',
    2: 'images/units/FF10/FF10_Tidus_T2',
    3: 'images/units/FF10/FF10_Star_Player_Tidus_T3',
    4: 'images/units/FF10/FF10_Star_Player_Tidus_T4',
    5: 'images/units/FF10/FF10_New_Guardian_Tidus_T5',
    6: 'images/units/FF10/FF10_New_Guardian_Tidus_T6',
  },
  aura_mage: {
    1: 'images/units/FF10/FF10_Yuna_T1',
    2: 'images/units/FF10/FF10_Yuna_T2',
    3: 'images/units/FF10/FF10_Summoner_Yuna_T3',
    4: 'images/units/FF10/FF10_Summoner_Yuna_T4',
    5: 'images/units/FF10/FF10_Songstress_Yuna_T5',
    6: 'images/units/FF10/FF10_Songstress_Yuna_T6',
  },
  slasher: {
    3: 'images/units/FF10/FF10_Jecht_T3',
    4: 'images/units/FF10/FF10_Jecht_T4',
    5: 'images/units/FF10/FF10_Fabled_Guardian_Jecht_T5',
    6: 'images/units/FF10/FF10_Fabled_Guardian_Jecht_T6',
  },
  seraphim: {
    3: 'images/units/FF10/FF10_Lulu_T3',
    4: 'images/units/FF10/FF10_Lulu_T4',
    5: 'images/units/FF10/FF10_Besaid_Mage_Lulu_T5',
    6: 'images/units/FF10/FF10_Besaid_Mage_Lulu_T6',
  },
  shadow_fang: {
    1: 'images/units/FF10/FF10_Rikku_T1',
    2: 'images/units/FF10/FF10_Rikku_T2',
    3: 'images/units/FF10/FF10_Al_Bhed_Girl_Rikku_T3',
    4: 'images/units/FF10/FF10_Al_Bhed_Girl_Rikku_T4',
  },
  flare_witch: {
    1: 'images/units/FF10/FF10_Wakka_T1',
    2: 'images/units/FF10/FF10_Wakka_T2',
    3: 'images/units/FF10/FF10_Aurochs_Leader_Wakka_T3',
    4: 'images/units/FF10/FF10_Aurochs_Leader_Wakka_T4',
  },
  stone_wall: {
    1: 'images/units/FF10/FF10_Kimahri_T1',
    2: 'images/units/FF10/FF10_Kimahri_T2',
    3: 'images/units/FF10/FF10_Ronso_Warrior_Kimahri_T3',
    4: 'images/units/FF10/FF10_Ronso_Warrior_Kimahri_T4',
  },
};

export const UNIT_RENDER_PROFILES = {
  guardian:    { scale: 1, shiftX: 0, shiftY: 0, contact: 11, moveType: 'melee-heavy', formation: 'mid-back' },
  blade:       { scale: 1, shiftX: 0, shiftY: 0, contact: 12, moveType: 'melee',       formation: 'front' },
  aura_mage:   { scale: 1, shiftX: 0, shiftY: 0, contact: 10, moveType: 'support',     formation: 'back' },
  slasher:     { scale: 1, shiftX: 0, shiftY: 0, contact: 15, moveType: 'melee-heavy', formation: 'front' },
  seraphim:    { scale: 1, shiftX: 0, shiftY: 0, contact:  9, moveType: 'hover',       formation: 'back' },
  shadow_fang: { scale: 1, shiftX: 0, shiftY: 0, contact: 13, moveType: 'skirmish',    formation: 'mid-front' },
  flare_witch: { scale: 1, shiftX: 0, shiftY: 0, contact: 10, moveType: 'ranged',      formation: 'mid' },
  stone_wall:  { scale: 1, shiftX: 0, shiftY: 0, contact: 12, moveType: 'melee-heavy', formation: 'front' },
};

export const MONSTER_RENDER_PROFILE = {
  size: 66,
  bossSize: 84,
};
