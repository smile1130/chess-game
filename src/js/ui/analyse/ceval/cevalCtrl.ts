import * as m from 'mithril';
import settings from '../../../settings';
import cevalEngine from './cevalEngine';
import { AnalysisStep, Path, CevalEmit, CevalCtrlInterface } from '../interfaces';

export default function cevalCtrl(
  variant: VariantKey,
  allow: boolean,
  emit: (res: CevalEmit) => void): CevalCtrlInterface {

  let initialized = false;

  const minDepth = 8;
  const maxDepth = 20;
  const allowed = m.prop(allow);

  const engine = cevalEngine({ minDepth, maxDepth });

  let curDepth = 0;
  let started = false;
  let isEnabled = settings.analyse.enableCeval();

  function enabled() {
    return allowed() && isEnabled;
  }

  function onEmit(res: CevalEmit) {
    curDepth = res.ceval.depth;
    emit(res);
  }

  function start(path: Path, steps: Array<AnalysisStep>) {
    if (!enabled()) {
      return;
    }
    const step = steps[steps.length - 1];
    if (step.ceval && step.ceval.depth >= maxDepth) {
      return;
    }
    engine.start({
      position: steps[0].fen,
      moves: steps.slice(1).map((s) => fixCastle(s.uci, s.san)).join(' '),
      path: path,
      steps: steps,
      ply: step.ply,
      emit: function(res) {
        if (enabled()) onEmit(res);
      }
    });
    started = true;
  }

  function stop() {
    if (!enabled() || !started) return;
    engine.stop();
    started = false;
  }

  function destroy() {
    if (initialized) {
      engine.exit()
      .then(() => {
        initialized = false;
      })
      .catch(() => {
        initialized = false;
      });
    }
  }

  function fixCastle(uci: string, san: string) {
    if (san.indexOf('O-O') !== 0) return uci;
    switch (uci) {
      case 'e1h1':
        return 'e1g1';
      case 'e1a1':
        return 'e1c1';
      case 'e8h8':
        return 'e8g8';
      case 'e8a8':
        return 'e8c8';
    }
    return uci;
  }

  return {
    init() {
      return engine.init(variant).then(() => {
        initialized = true;
      });
    },
    isInit() {
      return initialized;
    },
    start,
    stop,
    destroy,
    allowed,
    enabled,
    toggle() {
      isEnabled = settings.analyse.enableCeval();
    },
    percentComplete() {
      return Math.round(100 * curDepth / maxDepth);
    }
  };
}
