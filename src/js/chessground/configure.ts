import * as merge from 'lodash/merge'
import * as cg from './interfaces'
import { State, defaults } from './state'
import * as board from './board'
import fen from './fen'

export type InitConfig = Partial<State> & {
  fen?: string
}

// TODO make sth more robust
export function initBoard(cfg: InitConfig): State {
  const defCopy = Object.assign({}, defaults) as State

  configureBoard(defCopy, cfg || {})

  return defCopy
}

export function configureBoard(state: State, config: InitConfig): void {

  if (!config) return

  // don't merge destinations. Just override.
  if (config.movable && config.movable.dests) state.movable.dests = null

  // if a fen was provided, replace the pieces
  if (config.fen) {
    state.pieces = fen.read(config.fen)
  }

  merge(state, config)

  // fix move/premove dests
  if (state.selected) board.setSelected(state, state.selected)

  // no need for such short animations
  if (!state.animation.duration || state.animation.duration < 10)
    state.animation.enabled = false
}

export function setNewBoardState(d: State, config: cg.SetConfig) {
  if (!config) return

  if (config.fen) {
    d.pieces = fen.read(config.fen)
  }

  if (config.dests) {
    d.movable.dests = config.dests
  }

  if (config.movableColor) {
    d.movable.color = config.movableColor
  }

  if (config.check !== undefined) board.setCheck(d, config.check)
  if (config.orientation !== undefined) d.orientation = config.orientation
  if (config.turnColor !== undefined) d.turnColor = config.turnColor
  if (config.lastMove !== undefined) d.lastMove = config.lastMove

  // fix move/premove dests
  if (d.selected) {
    board.setSelected(d, d.selected)
  }
}
