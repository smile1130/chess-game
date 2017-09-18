import redraw from '../../../utils/redraw'
import Chessground from '../../../chessground/Chessground'
import * as cg from '../../../chessground/interfaces'
import * as helper from '../../helper'
import settings from '../../../settings'
import * as h from 'mithril/hyperscript'
import { PromotingInterface } from '../round'

type PromoteCallback = (orig: Key, dest: Key, prom: Role) => void
interface Promoting {
  orig: Key
  dest: Key
  callback: PromoteCallback
}

let promoting: Promoting | null = null

function promote(ground: Chessground, key: Key, role: Role) {
  const pieces: {[k: string]: Piece } = {}
  const piece = ground.state.pieces[key]
  if (piece && piece.role === 'pawn') {
    pieces[key] = {
      color: piece.color,
      role: role
    }
    ground.setPieces(pieces)
  }
}

function start(chessground: Chessground, orig: Key, dest: Key, callback: PromoteCallback) {
  const piece = chessground.state.pieces[dest]
  if (piece && piece.role === 'pawn' && (
    (dest[1] === '1' && chessground.state.turnColor === 'white') ||
    (dest[1] === '8' && chessground.state.turnColor === 'black'))) {
    promoting = {
      orig: orig,
      dest: dest,
      callback: callback
    }
    redraw()
    return true
  }
  return false
}

function finish(ground: Chessground, role: Role) {
  if (promoting) promote(ground, promoting.dest, role)
  if (promoting && promoting.callback) promoting.callback(promoting.orig, promoting.dest, role)
  promoting = null
}

function cancel(chessground: Chessground, cgConfig?: cg.SetConfig) {
  if (promoting) {
    promoting = null
    if (cgConfig) chessground.set(cgConfig)
    redraw()
  }
}

export function view(ctrl: PromotingInterface) {
  if (!promoting) return null

  const pieces = ['queen', 'knight', 'rook', 'bishop']
  if (ctrl.data && ctrl.data.game.variant.key === 'antichess') {
    pieces.push('king')
  }

  return h('div.overlay.open', [h('div#promotion_choice', {
    className: settings.general.theme.piece(),
    style: { top: (helper.viewportDim().vh - 100) / 2 + 'px' }
  }, pieces.map((role: Role) => {
    return h('piece.' + role + '.' + ctrl.player(), {
      oncreate: helper.ontap(() => finish(ctrl.chessground, role))
    })
  }))])
}

export default {
  start,
  cancel
}
