import socket from '../../socket';
import redraw from '../../utils/redraw';
import router from '../../router';
import backbutton from '../../backbutton';
import { throttle } from 'lodash/function';
import * as utils from '../../utils';
import * as xhr from './playerXhr';
import * as helper from '../helper';
import * as m from 'mithril';

export default function oninit(vnode) {
  socket.createDefault();

  helper.analyticsTrackView('Players');

  const isSearchOpen = m.prop(false);
  const searchResults = m.prop([]);
  const players = m.prop([]);
  let listHeight;

  function onKeyboardShow(e) {
    if (window.cordova.platformId === 'ios') {
      let ul = document.getElementById('players_search_results');
      if (ul) {
        listHeight = ul.offsetHeight;
        ul.style.height = (listHeight - e.keyboardHeight) + 'px';
      }
    }
  }

  function onKeyboardHide() {
    if (window.cordova.platformId === 'ios') {
      let ul = document.getElementById('players_search_results');
      if (ul) ul.style.height = listHeight + 'px';
    }
    let input = document.getElementById('searchPlayers');
    if (input) input.blur();
  }

  function closeSearch(fromBB) {
    if (fromBB !== 'backbutton' && isSearchOpen()) backbutton.stack.pop();
    isSearchOpen(false);
  }

  window.addEventListener('native.keyboardshow', onKeyboardShow);
  window.addEventListener('native.keyboardhide', onKeyboardHide);

  xhr.onlinePlayers()
  .then(data => {
    players(data);
    redraw();
  })
  .catch(utils.handleXhrError);

  vnode.state = {
    players,
    isSearchOpen,
    searchResults,
    onInput: throttle(e => {
      const term = e.target.value.trim();
      if (term.length >= 3)
        xhr.autocomplete(term).then(data => {
          searchResults(data);
          redraw();
        });
    }, 250),
    closeSearch,
    goSearch() {
      helper.analyticsTrackView('Player search');
      backbutton.stack.push(closeSearch);
      isSearchOpen(true);
    },
    goToProfile(u) {
      router.set('/@/' + u);
    },
    onKeyboardShow,
    onKeyboardHide
  };
}
