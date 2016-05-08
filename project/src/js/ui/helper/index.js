import Zanimo from 'zanimo';
import settings from '../../settings';
import * as utils from '../../utils';
import ButtonHandler from './button';
import animator from './animator';
import m from 'mithril';

const helper = {};
export default helper;

// view slide transition functions
// they listen to history to determine if animation is going forward or backward
function viewSlideIn(el, callback) {
  const direction = utils.getViewSlideDirection() === 'fwd' ? '100%' : '-100%';
	el.style.transform = `translate3d(${direction},0,0)`;
	el.style.transition = 'transform 200ms ease-out';

	setTimeout(() => {
		el.style.transform = 'translate3d(0%,0,0)';
	});

  function after() {
    utils.setViewSlideDirection('fwd');
    el.removeAttribute('style');
    callback();
  }

	el.addEventListener('transitionend', after, false);
}
function viewSlideOut(el, callback) {
  const direction = utils.getViewSlideDirection() === 'fwd' ? '-100%' : '100%';
	el.style.transform = 'translate3d(0%,0,0)';
	el.style.transition = 'transform 200ms ease-out';

	setTimeout(() => {
		el.style.transform = `translate3d(${direction},0,0)`;
	});

  function after() {
    utils.setViewSlideDirection('fwd');
    callback();
  }

	el.addEventListener('transitionend', after, false);
}

function viewFadesIn(el, callback) {
  var tId;

  el.style.opacity = '0.5';
  el.style.transition = 'opacity 200ms ease-out';

  setTimeout(() => {
    el.style.opacity = '1';
  });

  function after() {
    clearTimeout(tId);
    if (el) {
      el.removeAttribute('style');
      el.removeEventListener('transitionend', after, false);
    }
    callback();
  }

  el.addEventListener('transitionend', after, false);
  // in case transitionend does not fire
  // TODO find a way to avoid it
  tId = setTimeout(after, 250);
}

function viewFadesOut(el, callback) {
  var tId;

  el.style.opacity = '1';
  el.style.transition = 'opacity 200ms ease-out, visibility 0s linear 200ms';

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  });

  function after() {
    clearTimeout(tId);
    callback();
  }

  el.addEventListener('transitionend', after, false);
  // in case transitionend does not fire
  // TODO find a way to avoid it
  tId = setTimeout(after, 250);
}

helper.slidingPage = animator(viewSlideIn, viewSlideOut);
helper.fadingPage = animator(viewFadesIn, viewFadesOut);

// this must be cached because of the access to document.body.style
var cachedTransformProp;

function computeTransformProp() {
  return 'transform' in document.body.style ?
    'transform' : 'webkitTransform' in document.body.style ?
    'webkitTransform' : 'mozTransform' in document.body.style ?
    'mozTransform' : 'oTransform' in document.body.style ?
    'oTransform' : 'msTransform';
}

helper.transformProp = function() {
  if (!cachedTransformProp) cachedTransformProp = computeTransformProp();
  return cachedTransformProp;
};

function collectionHas(coll, el) {
  for (var i = 0, len = coll.length; i < len; i++) {
    if (coll[i] === el) return true;
  }
  return false;
}

function findParentBySelector(el, selector) {
  var matches = document.querySelectorAll(selector);
  var cur = el.parentNode;
  while (cur && !collectionHas(matches, cur)) {
    cur = cur.parentNode;
  }
  return cur;
}

helper.slidesInUp = function(el, isUpdate, context) {
  if (!isUpdate) {
    el.style.transform = 'translateY(100%)';
    // force reflow hack
    context.lol = el.offsetHeight;
    Zanimo(el, 'transform', 'translateY(0)', 250, 'ease-out')
    .catch(console.log.bind(console));
  }
};

helper.slidesOutDown = function(callback, elID) {
  return function() {
    const el = document.getElementById(elID);
    m.redraw.strategy('none');
    return Zanimo(el, 'transform', 'translateY(100%)', 250, 'ease-out')
    .then(utils.autoredraw.bind(undefined, callback))
    .catch(console.log.bind(console));
  };
};

helper.slidesInLeft = function(el, isUpdate, context) {
  if (!isUpdate) {
    el.style.transform = 'translateX(100%)';
    // force reflow hack
    context.lol = el.offsetHeight;
    Zanimo(el, 'transform', 'translateX(0)', 250, 'ease-out')
    .catch(console.log.bind(console));
  }
};

helper.slidesOutRight = function(callback, elID) {
  return function() {
    const el = document.getElementById(elID);
    m.redraw.strategy('none');
    return Zanimo(el, 'transform', 'translateX(100%)', 250, 'ease-out')
    .then(utils.autoredraw.bind(undefined, callback))
    .catch(console.log.bind(console));
  };
};

helper.fadesOut = function(callback, selector, time = 150) {
  return function(e) {
    e.stopPropagation();
    var el = selector ? findParentBySelector(e.target, selector) : e.target;
    m.redraw.strategy('none');
    return Zanimo(el, 'opacity', 0, time)
    .then(() => utils.autoredraw(callback))
    .catch(console.log.bind(console));
  };
};

function ontouch(tapHandler, holdHandler, repeatHandler, scrollX, scrollY, touchEndFeedback) {
  return function(el, isUpdate) {
    if (!isUpdate) {
      ButtonHandler(el,
        e => {
          m.startComputation();
          try {
            tapHandler(e);
          } finally {
            m.endComputation();
          }
        },
        holdHandler ? () => utils.autoredraw(holdHandler) : null,
        repeatHandler,
        scrollX,
        scrollY,
        touchEndFeedback
      );
    }
  };
}

helper.ontouch = function(tapHandler, holdHandler, repeatHandler, touchEndFeedback = true) {
  return ontouch(tapHandler, holdHandler, repeatHandler, false, false, touchEndFeedback);
};

helper.ontouchX = function(tapHandler, holdHandler, touchEndFeedback = true) {
  return ontouch(tapHandler, holdHandler, null, true, false, touchEndFeedback);
};
helper.ontouchY = function(tapHandler, holdHandler, touchEndFeedback = true) {
  return ontouch(tapHandler, holdHandler, null, false, true, touchEndFeedback);
};

helper.progress = function(p) {
  if (p === 0) return null;
  return m('span', {
    className: 'progress ' + (p > 0 ? 'positive' : 'negative'),
    'data-icon': p > 0 ? 'N' : 'M'
  }, Math.abs(p));
};

helper.classSet = function(classes) {
  var arr = [];
  for (var i in classes) {
    if (classes[i]) arr.push(i);
  }
  return arr.join(' ');
};

helper.cachedViewportDim = null;
helper.viewportDim = function() {
  if (helper.cachedViewportDim) return helper.cachedViewportDim;

  let e = document.documentElement;
  let viewportDim = helper.cachedViewportDim = {
    vw: e.clientWidth,
    vh: e.clientHeight
  };
  return viewportDim;
};

helper.isWideScreen = function() {
  return helper.viewportDim().vw >= 600;
};

helper.isVeryWideScreen = function() {
  return helper.viewportDim().vw >= 960;
};

helper.isIpadLike = function () {
  const { vh, vw } = helper.viewportDim();
  return vh >= 700 && vw <= 1050;
};

helper.isPortrait = function() {
  return window.matchMedia('(orientation: portrait)').matches;
};

helper.isLandscape = function() {
  return window.matchMedia('(orientation: landscape)').matches;
};

helper.miniBoardSize = function(isPortrait) {
  const { vh, vw } = helper.viewportDim();
  const side = isPortrait ? vw * 0.66 : vh * 0.66;
  const bounds = {
    height: side,
    width: side
  };
  return bounds;
};

// allow user to opt out of track analytics
// only log if setting has it enabled
helper.analyticsTrackView = function(view) {
  const enabled = settings.general.analytics();
  if (enabled)
    window.analytics.trackView(view);
};

helper.analyticsTrackEvent = function(category, action) {
  const enabled = settings.general.analytics();
  if (enabled) {
    window.analytics.trackEvent(category, action);
  }
};

helper.autofocus = function(el, isUpdate) {
  if (!isUpdate) el.focus();
};
