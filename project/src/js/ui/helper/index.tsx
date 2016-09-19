import * as Zanimo from 'zanimo';
import redraw from '../../utils/redraw';
import router from '../../router';
import settings from '../../settings';
import * as utils from '../../utils';
import ButtonHandler from './button';
import * as m from 'mithril';

export interface ViewportDim {
  vw: number
  vh: number
}

const animDuration = 250;

// store temporarily last route to disable animations on same route
// TODO find a better way cause this is ugly
let lastRoute: string;

// this must be cached because of the access to document.body.style
let cachedTransformProp: string;
let cachedViewportDim: ViewportDim = null;

export function onPageEnter(anim: (el: HTMLElement) => void) {
  return ({ dom }) => anim(dom);
}

// because mithril will call 'onremove' asynchronously when the component has
// an 'onbeforeremove' hook, some cleanup tasks must be done in the latter hook
// thus this helper
export function onPageLeave(anim: (el: HTMLElement) => Promise<any>, cleanup: () => void = null) {
  return function({ dom }, done: () => void) {
    if (cleanup) cleanup();
    return anim(dom)
    .then(done)
    .catch(done);
  };
}

// el fade in transition, can be applied to any element
export function elFadeIn(el: HTMLElement) {
  let tId: number;

  el.style.opacity = '0.5';
  el.style.transition = `opacity ${animDuration}ms ease-out`;

  setTimeout(() => {
    el.style.opacity = '1';
  });

  function after() {
    clearTimeout(tId);
    if (el) {
      el.removeAttribute('style');
      el.removeEventListener('transitionend', after, false);
    }
  }

  el.addEventListener('transitionend', after, false);
  // in case transitionend does not fire
  tId = setTimeout(after, animDuration + 10);
}

// page slide transition
// apply only to page change transitions
// they listen to history to determine if animation is going forward or backward
export function pageSlideIn(el: HTMLElement) {
  if (router.get() === lastRoute) {
    return;
  }
  let tId: number;
  lastRoute = router.get();

  function after() {
    clearTimeout(tId);
    if (el) {
      el.removeAttribute('style');
      el.removeEventListener('transitionend', after, false);
    }
  }

  const direction = router.getViewSlideDirection() === 'fwd' ? '100%' : '-100%';
  el.style.transform = `translate3d(${direction},0,0)`;
  el.style.transition = `transform ${animDuration}ms ease-out`;

  setTimeout(() => {
    el.style.transform = 'translate3d(0%,0,0)';
  });

  el.addEventListener('transitionend', after, false);
  // in case transitionend does not fire
  tId = setTimeout(after, animDuration + 10);
}

export function elFadeOut(el: HTMLElement) {
  return Zanimo(el, 'opacity', 0, 250, 'ease-out');
}

function computeTransformProp() {
  return 'transform' in document.body.style ?
    'transform' : 'webkitTransform' in document.body.style ?
    'webkitTransform' : 'mozTransform' in document.body.style ?
    'mozTransform' : 'oTransform' in document.body.style ?
    'oTransform' : 'msTransform';
}

function collectionHas(coll: NodeListOf<Element>, el: HTMLElement) {
  for (let i = 0, len = coll.length; i < len; i++) {
    if (coll[i] === el) return true;
  }
  return false;
}

export function findParentBySelector(el: HTMLElement, selector: string) {
  const matches = document.querySelectorAll(selector);
  let cur = (el.parentNode as HTMLElement);
  while (cur && !collectionHas(matches, cur)) {
    cur = (cur.parentNode as HTMLElement);
  }
  return cur;
}

export function viewportDim(): ViewportDim {
  if (cachedViewportDim) return cachedViewportDim;

  let e = document.documentElement;
  let vpd = cachedViewportDim = {
    vw: e.clientWidth,
    vh: e.clientHeight
  };
  return vpd;
}

export const viewSlideIn = onPageEnter(pageSlideIn);
export const viewFadeIn = onPageEnter(elFadeIn);
export const viewSlideOut = onPageLeave((el: HTMLElement) => {
  const x = router.getViewSlideDirection() === 'fwd' ? '-100%' : '100%';
  return Zanimo(el, 'transform', `translateX(${x})`, animDuration, 'ease-in');
});

export const viewFadeOut = onPageLeave(elFadeOut);

export function transformProp() {
  if (!cachedTransformProp) cachedTransformProp = computeTransformProp();
  return cachedTransformProp;
}

export function clearCachedViewportDim() {
  cachedViewportDim = null;
}

export function slidesInUp(vnode: Mithril.Vnode<any>) {
  const el = vnode.dom;
  el.style.transform = 'translateY(100%)';
  // force reflow hack
  vnode.state.lol = el.offsetHeight;
  Zanimo(el, 'transform', 'translateY(0)', 250, 'ease-out')
  .catch(console.log.bind(console));
}

export function slidesOutDown(callback: () => void, elID: string) {
  return function() {
    const el = document.getElementById(elID);
    return Zanimo(el, 'transform', 'translateY(100%)', 250, 'ease-out')
    .then(utils.autoredraw.bind(undefined, callback))
    .catch(console.log.bind(console));
  };
}

export function slidesInLeft(vnode: Mithril.Vnode<any>) {
  const el = vnode.dom;
  el.style.transform = 'translateX(100%)';
  // force reflow hack
  vnode.state.lol = el.offsetHeight;
  Zanimo(el, 'transform', 'translateX(0)', 250, 'ease-out')
  .catch(console.log.bind(console));
}

export function slidesOutRight(callback: () => void, elID: string) {
  return function() {
    const el = document.getElementById(elID);
    return Zanimo(el, 'transform', 'translateX(100%)', 250, 'ease-out')
    .then(utils.autoredraw.bind(undefined, callback))
    .catch(console.log.bind(console));
  };
}

export function fadesOut(callback: () => void, selector?: string, time = 150) {
  return function(e: Event) {
    e.stopPropagation();
    const el = selector ? findParentBySelector((e.target as HTMLElement), selector) : e.target;
    return Zanimo(el, 'opacity', 0, time)
    .then(() => utils.autoredraw(callback))
    .catch(console.log.bind(console));
  };
}

type TapHandler = (e?: Event) => void;
type RepeatHandler = () => boolean;

function createTapHandler(tapHandler: TapHandler, holdHandler: TapHandler, repeatHandler: RepeatHandler, scrollX: boolean, scrollY: boolean, touchEndFeedback: boolean, getElement?: (e: TouchEvent) => HTMLElement) {
  return function(vnode: Mithril.Vnode<any>) {
    ButtonHandler(vnode.dom,
      (e: Event) => {
        tapHandler(e);
        redraw();
      },
      holdHandler ? () => utils.autoredraw(holdHandler) : null,
      repeatHandler,
      scrollX,
      scrollY,
      touchEndFeedback,
      getElement
    );
  };
}

export function ontouch(handler: TapHandler) {
  return ({ dom }) => {
    dom.addEventListener('touchstart', handler);
  };
}

export function ontap(tapHandler: TapHandler, holdHandler?: TapHandler, repeatHandler?: RepeatHandler, touchEndFeedback?: boolean, getElement?: (e: TouchEvent) => HTMLElement) {
  return createTapHandler(tapHandler, holdHandler, repeatHandler, false, false, touchEndFeedback, getElement);
}

export function ontapX(tapHandler: TapHandler, holdHandler?: TapHandler, touchEndFeedback?: boolean) {
  return createTapHandler(tapHandler, holdHandler, null, true, false, touchEndFeedback);
}

export function ontapY(tapHandler: TapHandler, holdHandler?: TapHandler, touchEndFeedback?: boolean) {
  return createTapHandler(tapHandler, holdHandler, null, false, true, touchEndFeedback);
}

export function progress(p: number) {
  if (p === 0) return null;
  return m('span', {
    className: 'progress ' + (p > 0 ? 'positive' : 'negative'),
    'data-icon': p > 0 ? 'N' : 'M'
  }, String(Math.abs(p)));
}

export function classSet(classes: {[cl: string]: boolean}) {
  const arr: string[] = [];
  for (let i in classes) {
    if (classes[i]) arr.push(i);
  }
  return arr.join(' ');
}

export function isWideScreen() {
  return viewportDim().vw >= 600;
}

export function isVeryWideScreen() {
  return viewportDim().vw >= 960;
}

export function isIpadLike() {
  const { vh, vw } = viewportDim();
  return vh >= 700 && vw <= 1050;
}

export function isPortrait() {
  return window.matchMedia('(orientation: portrait)').matches;
}

export function isLandscape() {
  return window.matchMedia('(orientation: landscape)').matches;
}

export function isLandscapeSmall() {
  const { vh } = viewportDim();
  return vh <= 450;
}

// allow user to opt out of track analytics
// only log if setting has it enabled
export function analyticsTrackView(view: string) {
  const enabled = settings.general.analytics();
  if (enabled)
    window.analytics.trackView(view);
}

export function analyticsTrackEvent(category: string, action: string) {
  const enabled = settings.general.analytics();
  if (enabled) {
    window.analytics.trackEvent(category, action);
  }
}

export function autofocus(vnode: any) {
  vnode.dom.focus();
}

export function renderRatingDiff(player: Player) {
  if (player.ratingDiff === undefined) return null;
  if (player.ratingDiff === 0) return <span className="rp null"> +0</span>;
  if (player.ratingDiff > 0) return <span className="rp up"> + {player.ratingDiff}</span>;
  if (player.ratingDiff < 0) return <span className="rp down"> {player.ratingDiff}</span>;

  return null;
}
