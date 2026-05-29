// app-context.js — 탭 모듈들이 공유하는 가변 참조들
// main.js에서 초기화 후 각 탭에 ctx 객체로 넘겨줍니다.
//
// 사용법:
//   import { createContext } from './app-context.js';
//   const ctx = createContext({ state, refs, save, syncHud, getBattleCore, setBattleCore });

export function createContext({ state, refs, save, syncHud, getBattleCore, setBattleCore, refreshBattle }) {
  return { state, refs, save, syncHud, getBattleCore, setBattleCore, refreshBattle };
}
