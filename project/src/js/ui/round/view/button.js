var game = require('../game');
var gameStatus = require('../status');
var helper = require('../../helper');
var throttle = require('lodash-node/modern/functions/throttle');
var i18n = require('../../../i18n');

module.exports = {
  standard: function(ctrl, condition, icon, hint, socketMsg) {
    return condition(ctrl.data) ? m('button', {
      className: socketMsg,
      'data-icon': icon,
      config: helper.ontouchend(function() { ctrl.socket.send(socketMsg); })
    }, i18n(hint)) : null;
  },
  shareLink: function(ctrl) {
    return m('button', {
      'data-icon': '"',
      config: helper.ontouchend(function() {
        window.plugins.socialsharing.share(null, null, null, 'http://lichess.org/' + ctrl.data.game.id);
      })
    }, i18n('shareGame'));
  },
  forceResign: function(ctrl) {
    return game.forceResignable(ctrl.data) ?
      m('div.force_resign_zone', [
        i18n('theOtherPlayerHasLeftTheGameYouCanForceResignationOrWaitForHim'),
        m('br'),
        m('button[data-icon=E]', {
          config: helper.ontouchend(function() { ctrl.socket.send('resign-force'); }),
        }, i18n('forceResignation')),
        m('button[data-icon=E]', {
          config: helper.ontouchend(function() { ctrl.socket.send('draw-force'); }),
        }, i18n('forceDraw'))
      ]) : null;
  },
  threefoldClaimDraw: function(ctrl) {
    return (ctrl.data.game.threefold) ? m('div.claim_draw_zone', [
      i18n('threefoldRepetition'),
      m.trust('&nbsp;'),
      m('button[data-icon=E]', {
        config: helper.ontouchend(function() { ctrl.socket.send('draw-claim'); })
      }, i18n('claimADraw'))
    ]) : null;
  },
  cancelDrawOffer: function(ctrl) {
    if (ctrl.data.player.offeringDraw) return m('div.negotiation', [
      i18n('drawOfferSent') + ' ',
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('draw-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentDrawOffer: function(ctrl) {
    if (ctrl.data.opponent.offeringDraw) return m('div.negotiation', [
      i18n('yourOpponentOffersADraw'),
      m('br'),
      m('button[data-icon=E]', {
        config: helper.ontouchend(function() { ctrl.socket.send('draw-yes'); })
      }, i18n('accept')),
      m.trust('&nbsp;'),
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('draw-no'); })
      }, i18n('decline')),
    ]);
  },
  cancelTakebackProposition: function(ctrl) {
    if (ctrl.data.player.proposingTakeback) return m('div.negotiation', [
      i18n('takebackPropositionSent') + ' ',
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('takeback-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentTakebackProposition: function(ctrl) {
    if (ctrl.data.opponent.proposingTakeback) return m('div.negotiation', [
      i18n('yourOpponentProposesATakeback'),
      m('br'),
      m('button[data-icon=E]', {
        config: helper.ontouchend(function() { ctrl.socket.send('takeback-yes'); })
      }, i18n('accept')),
      m.trust('&nbsp;'),
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('takeback-no'); })
      }, i18n('decline')),
    ]);
  },
  rematch: function(ctrl) {
    if ((gameStatus.finished(ctrl.data) || gameStatus.aborted(ctrl.data)) &&
      !ctrl.data.tournament && !ctrl.data.opponent.offeringRematch &&
      !ctrl.data.player.offeringRematch) {
      if (ctrl.data.opponent.onGame || ctrl.data.game.perf === 'correspondence') {
        return m('button[data-icon=B]', {
          config: helper.ontouchend(function() { ctrl.socket.send('rematch-yes'); })
        }, i18n('rematch'));
      } else {
        return null;
      }
    }
  },
  answerOpponentRematch: function(ctrl) {
    if (ctrl.data.opponent.offeringRematch) return [
      i18n('yourOpponentWantsToPlayANewGameWithYou'),
      m('br'),
      m('button[data-icon=E]', {
        config: helper.ontouchend(function() { ctrl.socket.send('rematch-yes'); })
      }, i18n('joinTheGame')),
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('rematch-no'); })
      }, i18n('declineInvitation'))
    ];
  },
  cancelRematch: function(ctrl) {
    if (ctrl.data.player.offeringRematch) return [
      i18n('rematchOfferSent'),
      m('br'),
      i18n('waitingForOpponent'),
      m('button[data-icon=L]', {
        config: helper.ontouchend(function() { ctrl.socket.send('rematch-no'); })
      }, i18n('cancelRematchOffer'))
    ];
  },
  moretime: function(ctrl) {
    if (game.moretimeable(ctrl.data)) return m('button[data-icon=O]', {
      config: helper.ontouchend(throttle(function() { ctrl.socket.send('moretime'); }, 600))
    }, i18n('giveNbSeconds', 15));
  }
};
