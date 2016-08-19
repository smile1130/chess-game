import Rlite from 'rlite-router';
import m from 'mithril';
import Vnode from 'mithril/render/vnode';
import signals from './signals';

const router = new Rlite();

// this counter is passed to the root component as key to force mithril to
// trash current view and re-render on every route change (even same path)
// this way it reproduces what was the mithril 0.2 behaviour, to help having a
// smooth migration
let routeCounter = 0;

export function defineRoutes(mountPoint, routes) {
  for (let route in routes) {
    const component = routes[route];
    router.add(route, function onRouteMatch({ url, params }) {
      routeCounter++;

      function redraw() {
        m.render(mountPoint, Vnode(component, routeCounter, params, undefined, undefined, undefined));
      }
      // allow to have a lower level router handler
      if (typeof component === 'function') {
        component({ url, params });
      } else {
        // TODO it works but would be better in a router exit hook
        signals.redraw.removeAll();
        signals.redraw.add(redraw);
        redraw();
      }

    });
  }
  window.addEventListener('popstate', processQuerystring);
  processQuerystring();
}

function processQuerystring() {
  const qs = window.location.search || '?=';
  const matched = router.run(qs.slice(2));
  if (!matched) router.run('/');
}

export default {
  set(path, replace) {
    if (replace) {
      window.history.replaceState(null, null, '?=' + path);
    } else {
      window.history.pushState(null, null, '?=' + path);
    }
    const matched = router.run(path);
    if (!matched) router.run('/');
  },
  get() {
    return window.location.search || '?=';
  }
};
