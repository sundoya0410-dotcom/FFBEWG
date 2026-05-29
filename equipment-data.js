export const EQUIPMENT_TYPES = ['weapon', 'armor', 'accessory'];

export const EQUIPMENT_TYPE_LABELS = {
  weapon: '무기',
  armor: '방어구',
  accessory: '장신구',
};

export const EQUIPMENT_TYPE_ICONS = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
};

export const EQUIPMENT_RARITIES = [
  { key: 'common', label: '일반', color: '#94a3b8', weight: 55, rank: 1, scale: 1.0 },
  { key: 'rare', label: '레어', color: '#60a5fa', weight: 30, rank: 2, scale: 1.65 },
  { key: 'epic', label: '영웅', color: '#c084fc', weight: 12, rank: 3, scale: 2.65 },
  { key: 'legend', label: '전설', color: '#ffd86a', weight: 3, rank: 4, scale: 4.25 },
];

const EQUIPMENT_NAME_POOL = {
  weapon: [
    { name: '브레이브 소드', kind: '검', icon: '⚔️', stats: { atk: 14 } },
    { name: '루나 스태프', kind: '지팡이', icon: '✨', stats: { mag: 15 } },
    { name: '별빛 지팡이', kind: '지팡이', icon: '✨', stats: { mag: 13, mp: 6 } },
    { name: '현자의 로드', kind: '로드', icon: '✨', stats: { mag: 12, spr: 5 } },
    { name: '쌍날 단검', kind: '단검', icon: '🗡️', stats: { atk: 10, mag: 5 } },
    { name: '마도 총검', kind: '총검', icon: '🔫', stats: { atk: 9, mag: 9 } },
    { name: '수호의 창', kind: '창', icon: '🔱', stats: { atk: 13, spr: 3 } },
  ],
  armor: [
    { name: '가디언 갑옷', kind: '갑옷', icon: '🛡️', stats: { def: 12, maxHp: 110 } },
    { name: '마도 로브', kind: '로브', icon: '🥻', stats: { spr: 13, maxHp: 90 } },
    { name: '미스릴 메일', kind: '메일', icon: '🛡️', stats: { def: 10, spr: 8, maxHp: 100 } },
    { name: '수호 망토', kind: '망토', icon: '🧥', stats: { def: 7, spr: 11, maxHp: 95 } },
    { name: '팔라딘 갑주', kind: '갑주', icon: '🛡️', stats: { def: 14, maxHp: 130 } },
  ],
  accessory: [
    { name: '힘의 반지', kind: '반지', icon: '💍', stats: { atk: 7, maxHp: 55 } },
    { name: '마력 귀걸이', kind: '귀걸이', icon: '💎', stats: { mag: 8, spr: 3 } },
    { name: '수호의 부적', kind: '부적', icon: '🔮', stats: { def: 5, spr: 5, maxHp: 65 } },
    { name: '전투 브로치', kind: '브로치', icon: '🏵️', stats: { atk: 5, mag: 5, maxHp: 45 } },
    { name: '생명의 목걸이', kind: '목걸이', icon: '📿', stats: { maxHp: 140, spr: 4 } },
  ],
};

const STAT_LABELS = {
  maxHp: 'HP',
  mp: 'MP',
  atk: 'ATK',
  mag: 'MAG',
  def: 'DEF',
  spr: 'SPR',
};

const LEGACY_EQUIPMENT_ICONS = {
  '검': '⚔️',
  '지': '✨',
  '로': '✨',
  '단': '🗡️',
  '총': '🔫',
  '창': '🔱',
  '갑': '🛡️',
  '롭': '🥻',
  '망': '🧥',
  '반': '💍',
  '귀': '💎',
  '부': '🔮',
  '브': '🏵️',
  '목': '📿',
};

function pickWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[0];
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

function rollStat(value, scale) {
  const jitter = 0.9 + Math.random() * 0.22;
  return Math.max(1, Math.round(value * scale * jitter));
}

export function getEquipmentPower(stats = {}) {
  return Math.round(
    (Number(stats.maxHp) || 0) * 0.65 +
    (Number(stats.mp) || 0) * 5 +
    (Number(stats.atk) || 0) * 55 +
    (Number(stats.mag) || 0) * 55 +
    (Number(stats.def) || 0) * 44 +
    (Number(stats.spr) || 0) * 44
  );
}

export function createEquipmentDrop(type = null) {
  const slotType = EQUIPMENT_TYPES.includes(type) ? type : pickOne(EQUIPMENT_TYPES);
  const rarity = pickWeighted(EQUIPMENT_RARITIES);
  const base = pickOne(EQUIPMENT_NAME_POOL[slotType]);
  const stats = Object.fromEntries(
    Object.entries(base.stats).map(([key, value]) => [key, rollStat(value, rarity.scale)])
  );

  return {
    id: `eq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: slotType,
    kind: base.kind || EQUIPMENT_TYPE_LABELS[slotType],
    icon: base.icon || EQUIPMENT_TYPE_ICONS[slotType],
    name: `${rarity.label} ${base.name}`,
    rarity: rarity.label,
    rarityKey: rarity.key,
    rarityRank: rarity.rank,
    color: rarity.color,
    stats,
    power: getEquipmentPower(stats),
  };
}

export function getEquipmentDisplayIcon(itemOrType) {
  if (typeof itemOrType === 'string') return EQUIPMENT_TYPE_ICONS[itemOrType] || '?';
  return LEGACY_EQUIPMENT_ICONS[itemOrType?.icon] || itemOrType?.icon || EQUIPMENT_TYPE_ICONS[itemOrType?.type] || '?';
}

export function formatEquipmentStats(stats = {}, emptyText = '능력치 없음') {
  const parts = Object.entries(STAT_LABELS)
    .filter(([key]) => Number(stats[key]) > 0)
    .map(([key, label]) => `${label} +${Math.round(Number(stats[key]) || 0)}`);
  return parts.length ? parts.join(' · ') : emptyText;
}
