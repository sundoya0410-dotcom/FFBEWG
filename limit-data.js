const BASE_LIMIT = {
  id: 'limit_burst',
  name: 'Limit Burst',
  hitCount: 3,
  damageMultiplier: 3.15,
  bossBonus: 1,
  splashMultiplier: 0,
  breakTurns: 0,
  healAll: 0,
  guardAll: 0,
  attackBuffTurns: 0,
  critBuffTurns: 0,
  selfGuardTurns: 0,
  rewardGoldBonus: 0,
  rewardGrowthStoneBonus: 0,
  logEffect: '',
};

function limit(data) {
  return { ...BASE_LIMIT, ...data };
}

function byTheme(unit = {}) {
  const key = String(unit.folderKey || '').toLowerCase();
  const name = String(unit.name || '').toLowerCase();
  const text = `${key} ${name}`;

  if (/wol|warrior_of_light|awakened_wol/.test(text)) return limit({ id: 'shining_nova', name: 'Shining Nova', hitCount: 4, damageMultiplier: 3.05, guardAll: 2, selfGuardTurns: 3, logEffect: '빛의 방패' });
  if (/garland|leon|hyunckel|kadaj|yazoo|loz|seifer|dark_knight/.test(text)) return limit({ id: 'chaotic_impact', name: 'Chaotic Impact', hitCount: 3, damageMultiplier: 3.55, bossBonus: 1.12, breakTurns: 3, selfGuardTurns: 2, logEffect: '혼돈 압박' });

  if (/rikku|al_bhed/.test(text)) return limit({ id: 'hyper_mighty_g', name: 'Hyper Mighty G', hitCount: 2, damageMultiplier: 2.25, healAll: 0.10, guardAll: 3, attackBuffTurns: 3, critBuffTurns: 3, rewardGoldBonus: 0.12, rewardGrowthStoneBonus: 0.12, logEffect: '알베드 조합' });
  if (/wakka|setzer|selphie|gambler/.test(text)) return limit({ id: 'attack_reel', name: 'Attack Reel', hitCount: 6, damageMultiplier: 3.35, critBuffTurns: 3, logEffect: '릴 찬스' });
  if (/auron|cyan|samurai|doma_samurai/.test(text)) return limit({ id: 'banishing_blade', name: 'Banishing Blade', hitCount: 2, damageMultiplier: 3.95, bossBonus: 1.16, breakTurns: 3, logEffect: '검기 파쇄' });
  if (/kimahri|ronso|blue_mage|quina|quistis|fratley/.test(text)) return limit({ id: 'blue_magic_drive', name: 'Blue Magic Drive', hitCount: 3, damageMultiplier: 2.9, splashMultiplier: 0.45, breakTurns: 2, guardAll: 2, logEffect: '청마법 공명' });
  if (/lulu|emperor|xande|edea|mystina|lezard|angela/.test(text)) return limit({ id: 'arcane_cataclysm', name: 'Arcane Cataclysm', hitCount: 5, damageMultiplier: 3.45, splashMultiplier: 0.55, breakTurns: 2, logEffect: '비전 폭주' });
  if (/seymour|exdeath|golbez|cloud_of_darkness|kefka|kuja/.test(text)) return limit({ id: 'wings_of_ruin', name: 'Wings of Ruin', hitCount: 4, damageMultiplier: 3.35, splashMultiplier: 0.45, bossBonus: 1.10, breakTurns: 3, logEffect: '파멸의 날개' });
  if (/yuna|rosa|maria|aerith|lenna|refia|arc|eiko|garnet|dagger|charlotte|jelanda/.test(text)) return limit({ id: 'prayer_of_rebirth', name: 'Prayer of Rebirth', hitCount: 1, damageMultiplier: 1.35, healAll: 0.24, guardAll: 3, logEffect: '재생의 기도' });

  if (/tidus|jecht|cloud|zack|squall|dai|sora|duran|lucian/.test(text)) return limit({ id: 'braver_rush', name: 'Braver Rush', hitCount: 5, damageMultiplier: 3.55, bossBonus: 1.10, attackBuffTurns: 2, logEffect: '돌파 연격' });
  if (/tifa|zell|sabin|monk|kevin|maam|adam/.test(text)) return limit({ id: 'final_heaven_style', name: 'Final Heaven Style', hitCount: 7, damageMultiplier: 3.35, critBuffTurns: 2, selfGuardTurns: 2, logEffect: '격투 연계' });
  if (/kain|dragoon|freya|aelia|baran|riesz/.test(text)) return limit({ id: 'dragon_dive', name: 'Dragon Dive', hitCount: 3, damageMultiplier: 3.75, bossBonus: 1.22, breakTurns: 2, logEffect: '용기사 강하' });
  if (/bartz|luneth|firion|onion|ingus|cecil|steiner|gilgamesh|arngrim|lenneth/.test(text)) return limit({ id: 'blade_dance', name: 'Blade Dance', hitCount: 4, damageMultiplier: 3.25, guardAll: /cecil|ingus|steiner|lenneth/.test(text) ? 2 : 0, attackBuffTurns: 2, logEffect: '검무 전개' });

  if (/locke|faris|zidane|yuffie|hawkeye|reno|thief|materia_hunter|pluto_knight|rakish/.test(text)) return limit({ id: 'treasure_hunter', name: 'Treasure Hunter', hitCount: 4, damageMultiplier: 2.85, breakTurns: 3, rewardGoldBonus: 0.15, rewardGrowthStoneBonus: 0.08, logEffect: '전리품 확보' });
  if (/edgar|barret|jessie|biggs|wedge|rufus|irvine|laguna|21o|9s|machinist/.test(text)) return limit({ id: 'machina_salvo', name: 'Machina Salvo', hitCount: 5, damageMultiplier: 3.05, splashMultiplier: 0.35, breakTurns: 3, logEffect: '기계 제압' });
  if (/shadow|ninja|vincent|riku/.test(text)) return limit({ id: 'night_hawk', name: 'Nighthawk', hitCount: 5, damageMultiplier: 3.25, bossBonus: 1.08, breakTurns: 2, critBuffTurns: 2, logEffect: '암습 연계' });

  if (/terra|rinoa|vivi|rydia|krile|summoner|yunalesca/.test(text)) return limit({ id: 'eidolon_burst', name: 'Eidolon Burst', hitCount: 4, damageMultiplier: 3.25, splashMultiplier: 0.5, healAll: /summoner|yuna|eiko|garnet/.test(text) ? 0.08 : 0, logEffect: '소환 공명' });
  if (/2b|a2/.test(text)) return limit({ id: 'yorha_overdrive', name: 'YoRHa Overdrive', hitCount: 6, damageMultiplier: 3.45, bossBonus: 1.12, breakTurns: 2, logEffect: '요르하 공세' });

  return limit({ id: 'limit_burst', name: 'Limit Burst', hitCount: 3, damageMultiplier: 3.1, logEffect: '한계 돌파' });
}

export function getLimitBurstData(unit = {}) {
  return byTheme(unit);
}

export function getLimitBurstName(unit = {}) {
  return getLimitBurstData(unit).name;
}
export function getLimitBurstSummary(data = {}) {
  const parts = [];
  const hitCount = Math.max(1, Math.floor(Number(data.hitCount) || 1));
  const damageMultiplier = Number(data.damageMultiplier) || 0;
  if (damageMultiplier > 0) parts.push(`${hitCount}히트 · 피해 x${damageMultiplier.toFixed(2)}`);
  if (Number(data.bossBonus) > 1) parts.push(`보스 피해 +${Math.round((Number(data.bossBonus) - 1) * 100)}%`);
  if (Number(data.splashMultiplier) > 0) parts.push(`주변 적 추가 피해 ${Math.round(Number(data.splashMultiplier) * 100)}%`);
  if (Number(data.breakTurns) > 0) parts.push(`방어 약화 ${Math.floor(Number(data.breakTurns))}턴`);
  if (Number(data.healAll) > 0) parts.push(`아군 전체 HP ${Math.round(Number(data.healAll) * 100)}% 회복`);
  if (Number(data.guardAll) > 0) parts.push(`아군 전체 보호 ${Math.floor(Number(data.guardAll))}턴`);
  if (Number(data.attackBuffTurns) > 0) parts.push(`공격 강화 ${Math.floor(Number(data.attackBuffTurns))}턴`);
  if (Number(data.critBuffTurns) > 0) parts.push(`치명 강화 ${Math.floor(Number(data.critBuffTurns))}턴`);
  if (Number(data.selfGuardTurns) > 0) parts.push(`자신 보호 ${Math.floor(Number(data.selfGuardTurns))}턴`);
  if (Number(data.rewardGoldBonus) > 0) parts.push(`골드 보상 +${Math.round(Number(data.rewardGoldBonus) * 100)}%`);
  if (Number(data.rewardGrowthStoneBonus) > 0) parts.push(`성장석 보상 +${Math.round(Number(data.rewardGrowthStoneBonus) * 100)}%`);
  return parts;
}

export function describeLimitBurst(unit = {}) {
  const data = getLimitBurstData(unit);
  const summary = getLimitBurstSummary(data);
  return {
    ...data,
    summary,
    text: summary.join(' · ') || '강력한 리미트 공격을 사용합니다.',
  };
}