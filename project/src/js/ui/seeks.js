var utils = require('../utils');
var layout = require('./layout');
var menu = require('./menu');
var widgets = require('./_commonWidgets');
var xhr = require('../xhr');
var i18n = require('../i18n');
var socket = require('../socket');
var session = require('../session');
var loginModal = require('./loginModal');

var seeks = {};

seeks.controller = function() {

  var pool = [];

  window.analytics.trackView('Seeks');

  xhr.seeks(true).then(function(d) {
    pool = d;
  });

  return {
    pool: function() {
      return pool;
    },
    onunload: function() {
      if (lobbySocket) {
        lobbySocket.destroy();
        lobbySocket = null;
      }
    }
  };
};

function renderSeek(ctrl, seek) {
  return m('div.seek', {
    key: seek.id,
    'data-id': seek.id,
    class: 'seek ' + (seek.action === 'joinSeek' ? 'join' : 'cancel')
  }, [
    m('div.icon', {
      'data-icon': seek.perf.icon
    }),
    m('div.body', [
      m('div.player', seek.username + ' (' + seek.rating + ')'),
      m('div.variant', seek.variant.name),
      m('div', [
        seek.days ? i18n(seek.days === 1 ? 'oneDay' : 'nbDays', seek.days) : '∞',
        ', ',
        i18n(seek.mode === 1 ? 'rated' : 'casual')
      ])
    ])
  ]);
}

seeks.view = function(ctrl) {

  var body = function() {
    return session.isConnected() ? m('div.seeks',
      ctrl.pool().map(utils.partialƒ(renderSeek, ctrl))
    ) : m('div.disconnected',
      m('button.fat', {
        config: utils.ontouchend(loginModal.open)
      }, i18n('logIn'))
    )
  };

  return layout.board(widgets.header, body, widgets.empty, menu.view, widgets.empty);
};

module.exports = seeks;
