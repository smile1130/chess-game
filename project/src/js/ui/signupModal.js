var session = require('../session');
var utils = require('../utils');
var i18n = require('../i18n');

var signupModal = {};

var isOpen = false;

var submit = function(form) {
  var login = form[0].value.trim();
  var pass = form[1].value.trim();
  if (!login || !pass) return false;
  window.cordova.plugins.Keyboard.close();
  session.signup(
    form[0].value.trim(),
    form[1].value.trim()
  ).then(function() {
    signupModal.close();
    require('./loginModal').close();
    window.plugins.toast.show(i18n('loginSuccessful'), 'short', 'center');
  }, function(data) {
    if (data.error.username)
      window.plugins.toast.show(data.error.username[0], 'short', 'center');
    else if (data.error.password)
      window.plugins.toast.show(data.error.password[0], 'short', 'center');
  });
};

signupModal.open = function() {
  window.analytics.trackView('Sign Up');
  isOpen = true;
};

signupModal.close = function() {
  window.cordova.plugins.Keyboard.close();
  isOpen = false;
};

signupModal.view = function() {
  if (!isOpen) return m('div#signup.modal');

  return m('div#signup.modal.show', [
    m('header', [
      m('button.modal_close[data-icon=L]', {
        config: utils.ontouchend(signupModal.close)
      }),
      m('h2', i18n('signUp'))
    ]),
    m('div.modal_content', [
      m('form', {
        onsubmit: function(e) {
          e.preventDefault();
          return submit(e.target);
        }
      }, [
        m('input#pseudo[type=text]', {
          placeholder: i18n('username'),
          autocomplete: 'off',
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: false,
          required: true
        }),
        m('input#password[type=password]', {
          placeholder: i18n('password'),
          required: true
        }),
        m('button.fat', i18n('signUp'))
      ])
    ])
  ]);
};

module.exports = signupModal;
