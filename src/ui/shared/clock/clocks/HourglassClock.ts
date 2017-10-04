import redraw from '../../../../utils/redraw'
import sound from '../../../../sound'

import { ClockType, Side, IChessClock, IChessBasicClockState } from '../interfaces'

const CLOCK_TICK_STEP = 100

export default function HourglassClock(time: number): IChessClock {
  let state: IChessBasicClockState = {
    whiteTime: time/2,
    blackTime: time/2,
    activeSide: undefined,
    flagged: undefined,
    isRunning: false
  }

  let clockInterval: number
  let whiteTimestamp: number
  let blackTimestamp: number

  function tick () {
    const now = performance.now()
    if (activeSide() === 'white') {
      const elapsed = now - whiteTimestamp
      whiteTimestamp = now
      state.whiteTime = Math.max(state.whiteTime - elapsed, 0)
      state.blackTime = time - state.whiteTime
      if (whiteTime() <= 0) {
        state.flagged = 'white'
        sound.dong()
        clearInterval(clockInterval)
      }
    }
    else if (activeSide() === 'black') {
      const elapsed = now - blackTimestamp
      blackTimestamp = now
      state.blackTime = Math.max(state.blackTime - elapsed, 0)
      state.whiteTime = time - state.blackTime
      if (blackTime() <= 0) {
        state.flagged = 'black'
        sound.dong()
        clearInterval(clockInterval)
      }
    }
    redraw()
  }

  function clockHit(side: Side) {
    if (flagged()) {
      return
    }
    sound.clock()

    if (side === 'white') {
      blackTimestamp = performance.now()
      state.activeSide = 'black'
    }
    else {
      whiteTimestamp = performance.now()
      state.activeSide = 'white'
    }
    if (clockInterval) {
      clearInterval(clockInterval)
    }
    clockInterval = setInterval(tick, CLOCK_TICK_STEP)
    state.isRunning = true
    redraw()
  }

  function startSwhite () {
    if (isRunning()) {
      state.isRunning = false
      clearInterval(clockInterval)
    }
    else {
      state.isRunning = true
      clockInterval = setInterval(tick, CLOCK_TICK_STEP)
      if (activeSide() === 'white') {
        whiteTimestamp = performance.now()
      } else {
        blackTimestamp = performance.now()
      }
    }
  }

  function activeSide(): Side | undefined {
     return state.activeSide;
  }

  function flagged(): Side | undefined {
     return state.flagged;
  }

  function isRunning(): boolean {
    return state.isRunning;
  }

  function getState(): IChessBasicClockState {
    return state
  }

  function setState(newState: IChessBasicClockState): void {
    state = newState
  }

  function whiteTime(): number {
    return state.whiteTime
  }

  function blackTime(): number {
    return state.blackTime
  }

  const clockType: ClockType = 'hourglass'

  return {
    clockType,
    getState,
    setState,
    activeSide,
    flagged,
    isRunning,
    clockHit,
    startSwhite,
    whiteTime,
    blackTime,
    clear() {
      clearInterval(clockInterval)
    }
  }
}
