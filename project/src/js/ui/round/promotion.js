var chessground = require('chessground');
var partial = chessground.util.partial;
var ground = require('./ground');
var xhr = require('./roundXhr');
var utils = require('../../utils');
var helper = require('../helper');

var promoting = false;

function start(ctrl, orig, dest, isPremove) {
  var piece = ctrl.chessground.data.pieces[dest];
  if (piece && piece.role === 'pawn' && (
    (dest[1] === '8' && ctrl.data.player.color === 'white') ||
    (dest[1] === '1' && ctrl.data.player.color === 'black'))) {
    if (ctrl.data.pref.autoQueen === 3 || (ctrl.data.pref.autoQueen === 2 && isPremove)) return false;
    m.startComputation();
    promoting = [orig, dest];
    m.endComputation();
    return true;
  }
  return false;
}

function finish(ctrl, role) {
  if (promoting) {
    ground.promote(ctrl.chessground, promoting[1], role);
    ctrl.sendMove(promoting[0], promoting[1], role);
  }
  promoting = false;
}

function cancel(ctrl) {
  if (promoting) xhr.reload(ctrl).then(ctrl.reload);
  promoting = false;
}

module.exports = {

  start: start,

  view: function(ctrl) {
    if (!promoting) return;
    var pieces = ['queen', 'knight', 'rook', 'bishop'];
    if (ctrl.data.game.variant.key === "antichess") pieces.push('king');
    return m('div.overlay', [m('div#promotion_choice', {
      config: helper.ontouch(partial(cancel, ctrl)),
      style: { top: (helper.viewportDim().vh - 100) / 2 + 'px' }
    }, pieces.map(function(role) {
      return m('div.cg-piece.' + role + '.' + ctrl.data.player.color, {
        config: helper.ontouch(utils.f(finish, ctrl, role))
      });
    }))]);
  }
};
