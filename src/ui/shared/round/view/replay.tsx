import * as h from 'mithril/hyperscript'
import { fixCrazySan } from '../../../../utils/chessFormat'
import * as helper from '../../../helper'
import settings from '../../../../settings'
import { autoScroll, autoScrollInline, onReplayTap, getMoveEl } from '../util'
import OnlineRound from '../OnlineRound'

let pieceNotation: boolean

export function renderReplay(ctrl: OnlineRound) {
  pieceNotation = pieceNotation === undefined ? settings.game.pieceNotation() : pieceNotation
  return h('div.replay', {
    className: pieceNotation ? ' displayPieces' : '',
    oncreate: (vnode: Mithril.DOMNode) => {
      setTimeout(() => autoScroll(vnode.dom as HTMLElement), 100)
      helper.ontapY((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.DOMNode) => autoScroll(vnode.dom as HTMLElement),
  }, renderMoves(ctrl))
}

export function renderInlineReplay(ctrl: OnlineRound) {
  pieceNotation = pieceNotation === undefined ? settings.game.pieceNotation() : pieceNotation
  return h('div.replay_inline', {
    className: pieceNotation ? ' displayPieces' : '',
    oncreate: (vnode: Mithril.DOMNode) => {
      setTimeout(() => autoScrollInline(vnode.dom as HTMLElement), 100)
      helper.ontapX((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.DOMNode) => autoScrollInline(vnode.dom as HTMLElement),
  }, renderMoves(ctrl))
}

function renderMoves(ctrl: OnlineRound) {
  return ctrl.data.steps.filter(s => s.san !== null).map(s => h('move.replayMove', {
    className: s.ply === ctrl.vm.ply ? 'current' : '',
    'data-ply': s.ply,
  }, [
    s.ply & 1 ? renderIndex(s.ply, true) : null,
    fixCrazySan(s.san!)
  ]))
}

function renderIndexText(ply: Ply, withDots?: boolean): string {
  return plyToTurn(ply) + (withDots ? (ply % 2 === 1 ? '.' : '...') : '')
}

function renderIndex(ply: Ply, withDots?: boolean): Mithril.Children {
  return h('index', renderIndexText(ply, withDots))
}

function plyToTurn(ply: number): number {
  return Math.floor((ply - 1) / 2) + 1
}

