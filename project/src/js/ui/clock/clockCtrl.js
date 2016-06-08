import * as utils from '../../utils';
import helper from '../helper';
import settings from '../../settings';
import m from 'mithril';
import clockSettings from './clockSettings';

export default function controller() {
  let clockInterval = null;
  let clockMap = null;
  const isRunning = m.prop(false);
  const clockObj = m.prop();

  function reload() {
    clockMap = {
      'simple': simpleClock.bind(undefined, Number(settings.clock.simple.time()) * 60, m.redraw),
      'increment': incrementClock.bind(undefined, Number(settings.clock.increment.time()) * 60, Number(settings.clock.increment.increment()), m.redraw),
      'delay': delayClock.bind(undefined, Number(settings.clock.delay.time()) * 60, Number(settings.clock.delay.increment()), m.redraw)
    };
    clockObj(clockMap[settings.clock.clockType()]());
  }

  reload();

  const clockSettingsCtrl = clockSettings.controller(reload);

  function clockTap (side) {
    clockObj().clockHit(side);
  }

  function startStop () {
    clockObj().startStop();
  }

  window.plugins.insomnia.keepAwake();

  return {
    isRunning,
    startStop,
    clockSettingsCtrl,
    clockObj,
    reload,
    clockTap,
    onunload: () => {
      window.plugins.insomnia.allowSleepAgain();
      window.StatusBar.show();
      if (clockInterval) {
        clearInterval(clockInterval);
      }
    }
  };
}


function simpleClock(time) {
  return incrementClock(time, 0);
}

function incrementClock(time, increment, draw) {
  const topTime = m.prop(time);
  const bottomTime = m.prop(time);
  const activeSide = m.prop(null);
  const flagged = m.prop(null);
  const isRunning = m.prop(false);
  let clockInterval = null;

  function tick () {
    if (activeSide() === 'top') {
      topTime(Math.max(topTime()-1, 0));
      if (topTime() <= 0) {
        flagged('top');
      }
    }
    else if (activeSide() === 'bottom') {
      bottomTime(Math.max(bottomTime()-1, 0));
      if (bottomTime() <= 0) {
        flagged('bottom');
      }
    }
    draw();
  }

  function clockHit (side) {
    if (activeSide() === 'top') {
      if (side === activeSide()) {
        activeSide('bottom');
        topTime(topTime() + increment);
      }
    }
    else if (activeSide() === 'bottom') {
      if (side === activeSide()) {
        activeSide('top');
        bottomTime(bottomTime() + increment);
      }
    }
    else {
      if (side === 'top') {
        activeSide('bottom');
      }
      else {
        activeSide('top');
      }
    }
    if (clockInterval) {
      clearInterval(clockInterval);
    }
    clockInterval = setInterval(tick, 1000);
    isRunning(true);
    draw();
  }

  function startStop () {
    if (isRunning()) {
      isRunning(false);
      clearInterval(clockInterval);
    }
    else {
      isRunning(true);
      clockInterval = setInterval(tick, 1000);
    }
  }

  return {
    topTime,
    bottomTime,
    activeSide,
    flagged,
    isRunning,
    tick,
    clockHit,
    startStop
  };
}

function delayClock(time, increment, draw) {
  const topTime = m.prop(time);
  const bottomTime = m.prop(time);
  const topDelay = m.prop(increment);
  const bottomDelay = m.prop(increment);
  const activeSide = m.prop(null);
  const flagged = m.prop(null);
  const isRunning = m.prop(false);
  let clockInterval = null;

  function tick () {
    if (activeSide() === 'top') {
      if (topDelay() > 0) {
        topDelay(topDelay() - 1);
      }
      topTime(Math.max(topTime()-1, 0));
      if (topTime() <= 0) {
        flagged('top');
      }
    }
    else if (activeSide() === 'bottom') {
      bottomTime(Math.max(bottomTime()-1, 0));
      if (bottomTime() <= 0) {
        flagged('bottom');
      }
    }
    draw();
  }

  function clockHit (side) {
    if (activeSide() === 'top') {
      if (side === activeSide()) {
        activeSide('bottom');
        topTime(topTime() + increment);
      }
    }
    else if (activeSide() === 'bottom') {
      if (side === activeSide()) {
        activeSide('top');
        bottomTime(bottomTime() + increment);
      }
    }
    else {
      if (side === 'top') {
        activeSide('bottom');
      }
      else {
        activeSide('top');
      }
    }
    if (clockInterval) {
      clearInterval(clockInterval);
    }
    clockInterval = setInterval(tick, 1000);
    isRunning(true);
    draw();
  }

  function startStop () {
    if (isRunning()) {
      isRunning(false);
      clearInterval(clockInterval);
    }
    else {
      isRunning(true);
      clockInterval = setInterval(tick, 1000);
    }
  }

  return {
    topTime,
    bottomTime,
    activeSide,
    flagged,
    isRunning,
    tick,
    clockHit,
    startStop
  };
}
