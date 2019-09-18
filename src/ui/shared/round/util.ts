import { OnlineGameData, GameStep } from '../../../lichess/interfaces/game'
import * as helper from '../../helper'
import { Bounds } from '../Board'
import { RoundInterface } from '.'

export function firstPly(d: OnlineGameData): number {
  return d.steps[0].ply
}

export function lastPly(d: OnlineGameData): number {
  return d.steps[d.steps.length - 1].ply
}

export function plyStep(d: OnlineGameData, ply: number): GameStep {
  return d.steps[ply - firstPly(d)]
}

export function autoScroll(movelist?: HTMLElement) {
  if (!movelist) return
  requestAnimationFrame(() => {
    const plyEl = movelist.querySelector('.current') as HTMLElement
    if (plyEl) movelist.scrollTop = plyEl.offsetTop - movelist.offsetHeight / 2 + plyEl.offsetHeight / 2
  })
}

export function autoScrollInline(movelist?: HTMLElement) {
  if (!movelist) return
  requestAnimationFrame(() => {
    const plyEl = movelist.querySelector('.current') as HTMLElement
    if (plyEl) movelist.scrollLeft = plyEl.offsetLeft - movelist.offsetWidth / 2 + plyEl.offsetWidth / 2
  })
}

export function getMoveEl(e: Event) {
  const target = (e.target as HTMLElement)
  return target.tagName === 'MOVE' ? target :
    helper.findParentBySelector(target, 'move')
}

export function onReplayTap(ctrl: RoundInterface, e: Event) {
  const el = getMoveEl(e)
  if (el && el.dataset.ply) {
    ctrl.jump(Number(el.dataset.ply))
  }
}

function remainingSpace(vd: helper.ViewportDim, bounds: Bounds): number {
  // vh - headerHeight - boardHeight - footerHeight
  return vd.vh - bounds.height - 56 - 45
}

export function isReducedTableHeight(vd: helper.ViewportDim, bounds: Bounds): boolean {
  return remainingSpace(vd, bounds) < 90
}

export function hasSpaceForInlineReplay(vd: helper.ViewportDim, bounds: Bounds): boolean {
  return remainingSpace(vd, bounds) - 110 >= 30
}
