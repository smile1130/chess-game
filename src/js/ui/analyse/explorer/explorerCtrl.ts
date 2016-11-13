import * as m from 'mithril';
import redraw from '../../../utils/redraw';
import * as helper from '../../helper';
import { debounce } from 'lodash';
import router from '../../../router';
import explorerConfig from './explorerConfig';
import { openingXhr, tablebaseXhr } from './explorerXhr';
import { isSynthetic } from '../util';
import * as gameApi from '../../../lichess/game';
import { AnalyseCtrlInterface, ExplorerCtrlInterface, ExplorerData } from '../interfaces';

function tablebaseRelevant(fen: string) {
  const parts = fen.split(/\s/);
  const pieceCount = parts[0].split(/[nbrqkp]/i).length - 1;
  const castling = parts[2];
  return pieceCount <= 6 && castling === '-';
}

export default function(root: AnalyseCtrlInterface, allow: boolean): ExplorerCtrlInterface {

  const allowed = m.prop(allow);
  const enabled = m.prop(false);
  const loading = m.prop(true);
  const failing = m.prop(false);
  const current: Mithril.Stream<ExplorerData> = m.prop({
    moves: []
  });

  function open() {
    router.backbutton.stack.push(close);
    helper.analyticsTrackView('Analysis Explorer');
    enabled(true);
  }

  function close(fromBB?: string) {
    if (fromBB !== 'backbutton' && enabled()) router.backbutton.stack.pop();
    enabled(false);
    setTimeout(() => root && root.debouncedScroll(), 200);
  }

  let cache: {[index: string]: ExplorerData} = {};

  function setResult(fen: string, data: ExplorerData) {
    cache[fen] = data;
    current(data);
  }

  function onConfigClose(changed: boolean) {
    if (changed) {
      cache = {};
      setStep();
    }
  }

  const withGames = isSynthetic(root.data) || gameApi.replayable(root.data) || !!root.data.opponent.ai;
  const effectiveVariant: VariantKey = root.data.game.variant.key === 'fromPosition' ? 'standard' : root.data.game.variant.key;

  const config = explorerConfig.controller(root.data.game.variant, onConfigClose);
  const debouncedScroll = debounce(() => {
    const table = document.getElementById('explorerTable');
    if (table) table.scrollTop = 0;
  }, 200);

  function handleFetchError() {
    loading(false);
    failing(true);
    redraw();
  }

  const fetchOpening = debounce((fen: string) => {
    return openingXhr(effectiveVariant, fen, config.data, withGames)
    .then((res: ExplorerData) => {
      res.opening = true;
      res.fen = fen;
      setResult(fen, res);
      loading(false);
      failing(false);
      redraw();
    })
    .catch(handleFetchError);
  }, 1000);

  const fetchTablebase = debounce((fen: string) => {
    return tablebaseXhr(root.vm.step.fen)
    .then((res: ExplorerData) => {
      res.tablebase = true;
      res.fen = fen;
      setResult(fen, res);
      loading(false);
      failing(false);
      redraw();
    })
    .catch(handleFetchError);
  }, 500);

  function fetch(fen: string) {
    const hasTablebase = effectiveVariant === 'standard' || effectiveVariant === 'chess960';
    if (hasTablebase && withGames && tablebaseRelevant(fen)) return fetchTablebase(fen);
    else return fetchOpening(fen);
  }

  const empty: ExplorerData = {
    opening: true,
    moves: []
  };

  function setStep() {
    if (!enabled()) return;
    const step = root.vm.step;
    if (step.ply > 50 && !tablebaseRelevant(step.fen)) {
      setResult(step.fen, empty);
    }
    const fromCache = cache[step.fen];
    if (!fromCache) {
      loading(true);
      fetch(step.fen);
    } else {
      current(fromCache);
      loading(false);
      failing(false);
    }
    redraw();
    debouncedScroll();
  }

  return {
    allowed,
    enabled,
    setStep,
    loading,
    failing,
    config,
    withGames,
    current,
    toggle() {
      if (enabled()) close();
      else open();
      setStep();
    }
  };
}
