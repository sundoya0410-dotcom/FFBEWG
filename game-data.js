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
    chapter: '1장',
    description: '초반 파밍용 초원 지대. 첫 보스 처치로 성장의 방향을 잡습니다.',
    background: 'images/bg/battle_bg_0001_01.jpg',
    normal: ['1010010', '1010020', '1010060', '1010110'],
    boss: ['2010110', '2010130'],
    recommendedPower: 18000,
    targetWave: 15,
    enemyScale: 1,
    rewardGold: 1,
    firstClear: { gold: 12000, gems: 250 },
    repeatBoss: { gold: 1800, gems: 60 },
    dropLabel: '초급 강화석',
  },
  ruins: {
    label: '폐허의 잔영',
    requires: 'meadow',
    chapter: '2장',
    description: '방어가 높은 적이 등장하는 폐허. 장비 성장의 첫 시험대입니다.',
    background: 'images/bg/battle_bg_0004_01.jpg',
    normal: ['1030010', '1030020', '1030110', '1030310'],
    boss: ['2030010', '2030020'],
    recommendedPower: 42000,
    targetWave: 25,
    enemyScale: 1.25,
    rewardGold: 1.25,
    firstClear: { gold: 22000, gems: 350 },
    repeatBoss: { gold: 2600, gems: 80 },
    dropLabel: '폐허 장비 파편',
  },
  'ice-cave': {
    label: '빙혈 동굴',
    requires: 'ruins',
    chapter: '3장',
    description: '마법형 적 비중이 높아 후열과 회복 조합이 중요합니다.',
    background: 'images/bg/battle_bg_0018_01.jpg',
    normal: ['1080150', '1080210', '1080230', '1040110'],
    boss: ['2040010', '2040110'],
    recommendedPower: 78000,
    targetWave: 35,
    enemyScale: 1.55,
    rewardGold: 1.55,
    firstClear: { gold: 36000, gems: 500 },
    repeatBoss: { gold: 3600, gems: 100 },
    dropLabel: '빙혈 승급석',
  },
  volcano: {
    label: '용암 균열',
    requires: 'ice-cave',
    chapter: '4장',
    description: '보스 화력이 크게 오르는 구간. 탱커와 디버퍼 가치가 높아집니다.',
    background: 'images/bg/battle_bg_0034_01.jpg',
    normal: ['1050010', '1050110', '1050210', '1050440'],
    boss: ['2050110'],
    recommendedPower: 125000,
    targetWave: 45,
    enemyScale: 1.95,
    rewardGold: 1.95,
    firstClear: { gold: 54000, gems: 700 },
    repeatBoss: { gold: 5200, gems: 130 },
    dropLabel: '용암 장비 코어',
  },
  abyss: {
    label: '심연의 문턱',
    requires: 'volcano',
    chapter: '5장',
    description: '현재 최종 목표. 완성된 시너지와 고성장 파티를 요구합니다.',
    background: 'images/bg/battle_bg_0055_01.jpg',
    normal: ['1070010', '1070020', '1070040', '1060010'],
    boss: ['2040310', '2040270'],
    recommendedPower: 190000,
    targetWave: 60,
    enemyScale: 2.45,
    rewardGold: 2.45,
    firstClear: { gold: 82000, gems: 1000 },
    repeatBoss: { gold: 7600, gems: 170 },
    dropLabel: '심연 유물 조각',
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

export const QUEST_DATA = [
  { id: 'story-meadow', group: 'story', title: '초원의 경계 돌파', description: '초원의 경계 목표 웨이브를 클리어', metric: 'stageClear:meadow', target: 1, reward: { gold: 6000, gems: 120, growthStone: 120 } },
  { id: 'story-ruins', group: 'story', title: '폐허의 잔영 조사', description: '폐허의 잔영 목표 웨이브를 클리어', metric: 'stageClear:ruins', target: 1, reward: { gold: 10000, gems: 160, growthStone: 180 } },
  { id: 'story-ice-cave', group: 'story', title: '빙혈 동굴 진입', description: '빙혈 동굴 목표 웨이브를 클리어', metric: 'stageClear:ice-cave', target: 1, reward: { gold: 16000, gems: 220, growthStone: 260 } },
  { id: 'story-volcano', group: 'story', title: '용암 균열 제압', description: '용암 균열 목표 웨이브를 클리어', metric: 'stageClear:volcano', target: 1, reward: { gold: 24000, gems: 300, growthStone: 360 } },
  { id: 'story-abyss', group: 'story', title: '심연의 문턱 봉쇄', description: '심연의 문턱 목표 웨이브를 클리어', metric: 'stageClear:abyss', target: 1, reward: { gold: 40000, gems: 500, growthStone: 600, tickets: 1 } },

  { id: 'daily-waves', group: 'daily', title: '오늘의 전투 순찰', description: '오늘 웨이브 10회 클리어', metric: 'daily:waves', target: 10, reward: { gold: 5000, gems: 50, growthStone: 80 } },
  { id: 'daily-bosses', group: 'daily', title: '오늘의 보스 토벌', description: '오늘 보스 2회 처치', metric: 'daily:bosses', target: 2, reward: { gold: 8000, gems: 80, growthStone: 130 } },
  { id: 'daily-summon', group: 'daily', title: '오늘의 소환 의식', description: '오늘 유닛 또는 장비 소환 1회 진행', metric: 'daily:summons', target: 1, reward: { gems: 60, growthStone: 40 } },
  { id: 'daily-growth', group: 'daily', title: '오늘의 성장 훈련', description: '오늘 레벨업/승급/장비 변경 1회 진행', metric: 'daily:growth', target: 1, reward: { gold: 7000, growthStone: 120 } },

  { id: 'ach-power-50k', group: 'achievement', title: '전투력 5만 달성', description: '파티 전투력 50,000 달성', metric: 'partyPower', target: 50000, reward: { gold: 15000, gems: 150, growthStone: 180 } },
  { id: 'ach-power-100k', group: 'achievement', title: '전투력 10만 달성', description: '파티 전투력 100,000 달성', metric: 'partyPower', target: 100000, reward: { gold: 30000, gems: 250, growthStone: 320 } },
  { id: 'ach-units-10', group: 'achievement', title: '동료 10명 확보', description: '보유 유닛 10명 달성', metric: 'ownedUnits', target: 10, reward: { gems: 200, growthStone: 160 } },
  { id: 'ach-five-stars-5', group: 'achievement', title: '5성 전력 편성 준비', description: '5성 이상 유닛 5명 보유', metric: 'fiveStarUnits', target: 5, reward: { gold: 20000, gems: 300, growthStone: 260 } },
  { id: 'ach-equipment-10', group: 'achievement', title: '장비고 확장', description: '장비 10개 보유', metric: 'equipmentOwned', target: 10, reward: { gold: 12000, gems: 150, growthStone: 160 } },
];