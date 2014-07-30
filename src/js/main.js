/* lichess-mobile application entry point */

'use strict';

require('./knockoutExtend');

var play = require('./play'),
    alert = require('./alert'),
    Zepto = require('./vendor/zepto'),
    session = require('./session'),
    settings = require('./settings'),
    ko = require('knockout'),
    signals = require('./signals'),
    storage = require('./storage'),
    utils = require('./utils'),
    $ = utils.$;

function main() {

  document.body.addEventListener('submit', function (e) {
    e.preventDefault();
  });

  var view = {
    claimDraw: function() {
      signals.claimDraw.dispatch();
    },
    settings: settings,
    user: session.userView
  };
  ko.applyBindings(view);

  var currGame = storage.get('currentGame');

  if (currGame) {
    play.resume(currGame).done(function (game) {
      if (game && game.isFinished()) play.closeConnection();
    });
  }

  // try to get session from cookie
  session.refresh();


  $('#login').addEventListener('submit', function () {
    var usernameInput = $('#username');
    var passwordInput = $('#password');
    var username = usernameInput.value;
    var password = passwordInput.value;

    if (window.cordova && !utils.isConnected()) {
      alert.show(
        'danger',
        'No network connection detected.'
      );
      return false;
    }

    session.login(username, password).done(function(data) {
      console.log(data);
      $('#userModal').classList.remove('active');
    }, function (error) {
      console.log(error);
      // handle error
    });


    return false;
  });

  Zepto('#signout').tap(function (e) {
    e.preventDefault();
    session.logout();
    $('#userModal').classList.remove('active');
  });

  Zepto('#play-button').tap(function (e) {
    e.preventDefault();
    $('#computerGameModal').classList.remove('active');
    play.start();
  });

  Zepto('#settingsModal').tap(function (e) {
    e.preventDefault();
  });

}

window.document.addEventListener(window.cordova ? 'deviceready' : 'DOMContentLoaded', main, false);
