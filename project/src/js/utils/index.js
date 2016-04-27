import i18n from '../i18n';
import storage from '../storage';
import cloneDeep from 'lodash/cloneDeep';
import m from 'mithril';

export const lichessSri = Math.random().toString(36).substring(2);

export function autoredraw(action) {
  m.startComputation();
  try {
    return action();
  } finally {
    m.endComputation();
  }
}

export function askWorker(worker, msg, callback) {
  return new Promise(function(resolve) {
    function listen(e) {
      if (e.data.topic === msg.topic) {
        worker.removeEventListener('message', listen);
        if (callback) {
          callback(e.data.payload);
        } else {
          resolve(e.data.payload);
        }
      }
    }
    worker.addEventListener('message', listen);
    worker.postMessage(msg);
  });
}

export function hasNetwork() {
  return window.navigator.connection.type !== window.Connection.NONE;
}

export function handleXhrError(error) {
  var {response: data, status} = error;
  if (!hasNetwork()) {
    window.plugins.toast.show(i18n('noInternetConnection'), 'short', 'center');
  } else {
    let message;
    if (!status || status === 0)
      message = 'lichessIsUnreachable';
    else if (status === 401)
      message = 'unauthorizedError';
    else if (status === 404)
      message = 'resourceNotFoundError';
    else if (status === 503)
      message = 'lichessIsUnavailableError';
    else if (status >= 500)
      message = 'Server error.';
    else
      message = 'Error.';

    message = i18n(message);

    if (typeof data === 'string') {
      message += ` ${data}`;
    }
    else if (data.global && data.global.constructor === Array) {
      message += ` ${data.global[0]}`;
    }
    else if (typeof data.error === 'string') {
      message += ` ${data.error}`;
    }

    window.plugins.toast.show(message, 'short', 'center');
  }
}

export function serializeQueryParameters(obj) {
  var str = '';
  for (var key in obj) {
    if (str !== '') {
      str += '&';
    }
    str += encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }
  return str;
}

function partialApply(fn, args) {
  return fn.bind.apply(fn, [null].concat(args));
}

export function partialf() {
  return partialApply(arguments[0], Array.prototype.slice.call(arguments, 1));
}

export function f() {
  var args = arguments,
    fn = arguments[0];
  return function() {
    fn.apply(fn, Array.prototype.slice.call(args, 1));
  };
}

export function noop() {}

export function lightPlayerName(player, withRating) {
  if (player) {
    return (player.title ? player.title + ' ' + player.name : player.name) + (
      withRating ? ' (' + player.rating + ')' : '');
  } else {
    return 'Anonymous';
  }
}

export function playerName(player, withRating) {
  if (player.username || player.user) {
    var name = player.username || player.user.username;
    if (player.user && player.user.title) name = player.user.title + ' ' + name;
    if (withRating && (player.user || player.rating)) {
      name += ' (' + (player.rating || player.user.rating);
      if (player.provisional) name += '?';
      name += ')';
    }
    return name;
  }

  if (player.ai) {
    return aiName(player.ai);
  }

  return 'Anonymous';
}

export function aiName(level) {
  return i18n('aiNameLevelAiLevel', 'Stockfish', level);
}

export function backHistory() {
  setViewSlideDirection('bwd');
  if (window.navigator.app && window.navigator.app.backHistory)
    window.navigator.app.backHistory();
  else
    window.history.go(-1);
}

// simple way to determine views animation direction
var viewSlideDirection = 'fwd';
export function setViewSlideDirection(d) {
  viewSlideDirection = d;
}
export function getViewSlideDirection() {
  return viewSlideDirection;
}

const perfIconsMap = {
  bullet: 'T',
  blitz: ')',
  classical: '+',
  correspondence: ';',
  chess960: '\'',
  kingOfTheHill: '(',
  threeCheck: '.',
  antichess: '@',
  atomic: '>',
  puzzle: '-',
  horde: '_',
  fromPosition: '*',
  racingKings: '',
  crazyhouse: ''
};

export function gameIcon(perf) {
  return perfIconsMap[perf] || '8';
}

export function secondsToMinutes(sec) {
  return sec === 0 ? sec : sec / 60;
}

export function tupleOf(x) {
  return [x.toString(), x.toString()];
}

export function oppositeColor(color) {
  return color === 'white' ? 'black' : 'white';
}

export function caseInsensitiveSort(a, b) {
  var alow = a.toLowerCase();
  var blow = b.toLowerCase();

  return alow > blow ? 1 : (alow < blow ? -1 : 0);
}

export function userFullNameToId(fullName) {
  var split = fullName.split(' ');
  var id = split.length === 1 ? split[0] : split[1];
  return id.toLowerCase();
}

export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function loadJsonFile(filename) {
  return m.request({
    url: filename,
    method: 'GET',
    deserialize: function(text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw { error: 'Error when parsing json from: ' + filename };
      }
    }
  });
}

// Returns a random number between min (inclusive) and max (exclusive)
export function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

const offlineCorresStorageKey = 'offline.corres.games';

export function getOfflineGames() {
  const stored = storage.get(offlineCorresStorageKey) || {};
  let arr = [];
  for (const i in stored) {
    arr.push(stored[i]);
  }
  return arr;
}

export function getOfflineGameData(id) {
  const stored = storage.get(offlineCorresStorageKey) || {};
  return stored[id];
}

export function saveOfflineGameData(id, gameData) {
  const stored = storage.get(offlineCorresStorageKey) || {};
  const toStore = cloneDeep(gameData);
  toStore.player.onGame = false;
  toStore.opponent.onGame = false;
  if (toStore.player.user) toStore.player.user.online = false;
  if (toStore.opponent.user) toStore.opponent.user.online = false;
  stored[id] = toStore;
  storage.set(offlineCorresStorageKey, stored);
}

export function removeOfflineGameData(id) {
  const stored = storage.get(offlineCorresStorageKey);
  if (stored && stored[id]) {
    delete stored[id];
  }
  storage.set(offlineCorresStorageKey, stored);
}

export function challengeTime(c) {
  if (c.timeControl.type === 'clock') {
    return c.timeControl.show;
  } else if (c.timeControl.type === 'correspondence') {
    return i18n('nbDays', c.timeControl.daysPerTurn);
  } else {
    return '∞';
  }
}

export function boardOrientation(data, flip) {
  if (data.game.variant.key === 'racingKings') {
    return flip ? 'black' : 'white';
  } else {
    return flip ? data.opponent.color : data.player.color;
  }
}

export function getBoardBounds(viewportDim, isPortrait, isIpadLike) {
  const { vh, vw } = viewportDim;
  const top = 50;

  if (isPortrait) {
    const contentHeight = vh - 50;
    const pTop = 50 + ((contentHeight - vw - 40) / 2);
    return {
      top: pTop,
      right: vw,
      bottom: pTop + vw,
      left: 0,
      width: vw,
      height: vw
    };
  } else if (isIpadLike) {
    const wsSide = vh - top - (vh * 0.12);
    const wsTop = top + ((vh - wsSide - top) / 2);
    return {
      top: wsTop,
      right: wsSide,
      bottom: wsTop + wsSide,
      left: 0,
      width: wsSide,
      height: wsSide
    };
  } else {
    const lSide = vh - top;
    return {
      top,
      right: lSide,
      bottom: top + lSide,
      left: 0,
      width: lSide,
      height: lSide
    };
  }
}

