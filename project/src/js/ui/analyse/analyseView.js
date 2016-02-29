import m from 'mithril';
import i18n from '../../i18n';
import treePath from './path';
import cevalView from './ceval/cevalView';
import gameApi from '../../lichess/game';
import control from './control';
import { empty, defined, renderEval, isSynthetic } from './util';
import gameStatusApi from '../../lichess/status';
import helper from '../helper';
import layout from '../layout';
import { view as renderPromotion } from './promotion';
import { header } from '../shared/common';
import { renderBoard } from '../round/view/roundView';
import { partialf } from '../../utils';

export default function analyseView(ctrl) {

  const isPortrait = helper.isPortrait();

  return layout.board(
    header.bind(undefined, i18n('analysis')),
    () => renderContent(ctrl, isPortrait),
    () => overlay(ctrl, isPortrait)
  );
}

function renderContent(ctrl, isPortrait) {
  return [
    renderBoard(ctrl.data.game.variant.key, ctrl.chessground, isPortrait),
    renderAnalyse(ctrl),
    renderActionsBar(ctrl, isPortrait)
  ];
}

function overlay(ctrl) {
  return [
    renderPromotion(ctrl)
  ];
}

function renderEvalTag(e) {
  return {
    tag: 'eval',
    children: [e]
  };
}

function autoScroll(movelist) {
  if (!movelist) return;
  const plyEl = movelist.querySelector('.current');
  if (plyEl) movelist.scrollTop = plyEl.offsetTop - movelist.offsetHeight / 2 + plyEl.offsetHeight / 2;
}

const emptyMove = <move className="empty">...</move>;

function renderMove(ctrl, move, path) {
  if (!move) return emptyMove;
  const pathStr = treePath.write(path);
  const evaluation = path[1] ? {} : (move.oEval || move.ceval || {});
  const className = [
    pathStr === ctrl.vm.pathStr ? 'current' : '',
    pathStr === ctrl.vm.initialPathStr ? 'initial' : ''
  ].join(' ');
  const jump = helper.ontouchY(() => ctrl.userJump(path));
  return (
    <move className={className} config={jump} data-path={path[1] ? pathStr : ''}>
      {defined(evaluation.cp) ? renderEvalTag(renderEval(evaluation.cp)) : (
        defined(evaluation.mate) ? renderEvalTag('#' + evaluation.mate) : null
      )}
      {move.san[0] === 'P' ? move.san.slice(1) : move.san}
    </move>
  );
}

function plyToTurn(ply) {
  return Math.floor((ply - 1) / 2) + 1;
}

function renderVariation(ctrl, variation, path, klass) {
  var showMenu = ctrl.vm.variationMenu && ctrl.vm.variationMenu === treePath.write(path.slice(0, 1));
  return m('div', {
    className: klass + ' ' + helper.classSet({
      variation: true,
      menu: showMenu
    })
  }, [
    m('span', {
      className: 'menu',
      'data-icon': showMenu ? 'L' : '',
      config: helper.ontouch(partialf(ctrl.toggleVariationMenu, path))
    }),
    showMenu ? (function() {
      var promotable = isSynthetic(ctrl.data) ||
        !ctrl.analyse.getStepAtPly(path[0].ply).fixed;
      return [
        m('a', {
          className: 'delete text',
          'data-icon': 'q',
          config: helper.ontouch(partialf(ctrl.deleteVariation, path))
        }, 'Delete variation'),
        promotable ? m('a', {
          className: 'promote text',
          'data-icon': 'E',
          config: helper.ontouch(partialf(ctrl.promoteVariation, path))
        }, 'Promote to main line') : null
      ];
    })() :
    renderVariationContent(ctrl, variation, path)
  ]);
}

function renderVariationNested(ctrl, variation, path) {
  return (
    <span className="variation">
      {'(' + renderVariationContent(ctrl, variation, path) + ')' }
    </span>
  );
}

function renderVariationContent(ctrl, variation, path) {
  const turns = [];
  if (variation[0].ply % 2 === 0) {
    variation = variation.slice(0);
    const move = variation.shift();
    turns.push({
      turn: plyToTurn(move.ply),
      black: move
    });
  }
  const visiting = treePath.contains(path, ctrl.vm.path);
  const maxPlies = Math.min(visiting ? 999 : (path[2] ? 2 : 4), variation.length);
  for (var i = 0; i < maxPlies; i += 2) turns.push({
    turn: plyToTurn(variation[i].ply),
    white: variation[i],
    black: variation[i + 1]
  });
  return turns.map(turn => renderVariationTurn(ctrl, turn, path));
}

function renderVariationMeta(ctrl, move, path) {
  if (!move || empty(move.variations)) return null;
  return move.variations.map(function(variation, i) {
    return renderVariationNested(ctrl, variation, treePath.withVariation(path, i + 1));
  });
}

function renderVariationTurn(ctrl, turn, path) {
  const wPath = turn.white ? treePath.withPly(path, turn.white.ply) : null;
  const wMove = wPath ? renderMove(ctrl, turn.white, wPath) : null;
  const wMeta = renderVariationMeta(ctrl, turn.white, wPath);
  const bPath = turn.black ? treePath.withPly(path, turn.black.ply) : null;
  const bMove = bPath ? renderMove(ctrl, turn.black, bPath) : null;
  const bMeta = renderVariationMeta(ctrl, turn.black, bPath);
  if (wMove) {
    if (wMeta) return (
      <turn className="vTurn">
        { renderIndex(turn.turn + '.') }
        { wMove }
        { wMeta }
        {bMove ? bMove : null}
        {bMove ? bMeta : null}
      </turn>
    );
    return (
      <turn className="vTurn">
        {renderIndex(turn.turn + '.')}
        {wMove}
        {bMeta ? ' ' : null}
        {bMove ? bMove : null}
        {bMove ? bMeta : null}
      </turn>
    );
  }
  return (
    <turn className="vTurn">
      {renderIndex(turn.turn + '...')}
      {bMove}
      {bMeta}
    </turn>
  );
}

function renderOpening(ctrl, opening) {
  return (
    <div className="comment opening">{ opening.code + ': ' + opening.name }</div>
  );
}

function renderMeta(ctrl, move, path) {
  if (!ctrl.vm.comments) return null;

  const opening = (move && opening && opening.size === move.ply) ?
    renderOpening(ctrl, opening) :
    null;

  if (!move || (!opening && empty(move.comments) && empty(move.variations))) return null;

  const children = [];
  if (opening) children.push(opening);
  const colorClass = move.ply % 2 === 0 ? 'black ' : 'white ';
  var commentClass = '';
  if (!empty(move.comments)) move.comments.forEach(function(comment) {
    if (comment.indexOf('Inaccuracy.') === 0) commentClass = 'inaccuracy';
    else if (comment.indexOf('Mistake.') === 0) commentClass = 'mistake';
    else if (comment.indexOf('Blunder.') === 0) commentClass = 'blunder';
    children.push(<div className={'comment ' + colorClass + commentClass}>comment</div>);
  });
  if (!empty(move.variations)) move.variations.forEach(function(variation, i) {
    if (empty(variation)) return null;
    children.push(renderVariation(
      ctrl,
      variation,
      treePath.withVariation(path, i + 1),
      i === 0 ? colorClass + commentClass : null
    ));
  });
  return (
    <div className="meta">{children}</div>
  );
}

function renderIndex(txt) {
  return {
    tag: 'index',
    children: [txt]
  };
}

function renderTurnEl(children) {
  return {
    tag: 'turn',
    children: children
  };
}

function renderTurn(ctrl, turn, path) {
  var index = renderIndex(turn.turn + '.');
  var wPath = turn.white ? treePath.withPly(path, turn.white.ply) : null;
  var wMove = wPath ? renderMove(ctrl, turn.white, wPath) : null;
  var wMeta = renderMeta(ctrl, turn.white, wPath);
  var bPath = turn.black ? treePath.withPly(path, turn.black.ply) : null;
  var bMove = bPath ? renderMove(ctrl, turn.black, bPath) : null;
  var bMeta = renderMeta(ctrl, turn.black, bPath);
  if (wMove) {
    if (wMeta) return [
      renderTurnEl([index, wMove, emptyMove]),
      wMeta,
      bMove ? [
        renderTurnEl([index, emptyMove, bMove]),
        bMeta
      ] : null
    ];
    return [
      renderTurnEl([index, wMove, bMove]),
      bMeta
    ];
  }
  return [
    renderTurnEl([index, emptyMove, bMove]),
    bMeta
  ];
}

function renderTree(ctrl, tree) {
  var turns = [];
  var initPly = ctrl.analyse.firstPly();
  if (initPly % 2 === 0)
    for (var i = 1, nb = tree.length; i < nb; i += 2) turns.push({
      turn: Math.floor((initPly + i) / 2) + 1,
      white: tree[i],
      black: tree[i + 1]
    });
  else {
    turns.push({
      turn: Math.floor(initPly / 2) + 1,
      white: null,
      black: tree[1]
    });
    for (var j = 2, jnb = tree.length; j < jnb; j += 2) turns.push({
      turn: Math.floor((initPly + j) / 2) + 1,
      white: tree[j],
      black: tree[j + 1]
    });
  }

  var path = treePath.default();
  var tags = [];
  for (var k = 0, len = turns.length; k < len; k++)
    tags.push(renderTurn(ctrl, turns[k], path));

  return tags;
}

function renderAnalyse(ctrl) {
  var result;
  if (ctrl.data.game.status.id >= 30) switch (ctrl.data.game.winner) {
    case 'white':
      result = '1-0';
      break;
    case 'black':
      result = '0-1';
      break;
    default:
      result = '½-½';
  }
  const tree = renderTree(ctrl, ctrl.analyse.tree);
  if (result) {
    tree.push(m('div.result', result));
    var winner = gameApi.getPlayer(ctrl.data, ctrl.data.game.winner);
    tree.push(m('div.status', [
      gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key),
      winner ? ', ' + ctrl.trans(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') : null
    ]));
  }
  const config = (el, isUpdate) => {
    autoScroll(el);
    if (!isUpdate) setTimeout(autoScroll.bind(undefined, el), 100);
  };

  return (
    <div className="analyse native_scroller" config={config}>
      {tree}
    </div>
  );
}

function buttons(ctrl) {
  return [
    ['first', 'fast-backward', control.first ],
    ['prev', 'backward', control.prev],
    ['next', 'forward', control.next],
    ['last', 'fast-forward', control.last]
    ].map(function(b) {
      const className = [
        'action_bar_button',
        'fa',
        'fa-' + b[1],
        ctrl.broken ? 'disabled' : '',
        ctrl.vm.late && b[0] === 'last' ? 'glow' : ''
        ].join(' ');
        return (
          <button className={className} key={b[1]} config={helper.ontouch(() => b[2](ctrl))} />
        );
    });
}

function renderActionsBar(ctrl, isPortrait) {
  return (
    <section className="actions_bar">
      <button className="action_bar_button fa fa-ellipsis-h" key="analyseMenu" />
      {buttons(ctrl)}
    </section>
  );
}
