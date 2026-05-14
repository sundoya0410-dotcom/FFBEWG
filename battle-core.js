import { attachBattleFlow } from './battle-flow.js';
import { attachBattleUI } from './battle-ui.js';
import { attachBattleEffects } from './battle-effects.js';

export class HomeBattleCore {
constructor({ state, onStateChange }) {
  this.state = state;
  this.onStateChange = onStateChange;
  this.root = null;
  this.destroyed = false;
  this.dom = {};
  this.frame = null;
  this.turnLoopPromise = null;
  this.actorOrderIndex = 0;
  this.activeActorId = null;
  this.floaters = [];
  this.allies = [];
  this.enemies = [];
  this.seed = 1;
}

mount(root) {
  this.root = root;
  this.destroyed = false;
  this.ensureCombatants();
  this.renderShell();
  this.syncStaticUI();
  this.syncAll();
  if (!this.frame) this.loop(performance.now());
  if (!this.turnLoopPromise) this.turnLoopPromise = this.turnLoop();
}

unmount() {
  this.root = null;
}

destroy() {
  this.destroyed = true;
  if (this.frame) cancelAnimationFrame(this.frame);
  this.frame = null;
  this.turnLoopPromise = null;
}
}

attachBattleUI(HomeBattleCore);
attachBattleEffects(HomeBattleCore);
attachBattleFlow(HomeBattleCore);
