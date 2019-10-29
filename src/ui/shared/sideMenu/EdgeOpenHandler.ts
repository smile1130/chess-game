import redraw from '../../../utils/redraw'
import TinyGesture from '../../../utils/gesture/TinyGesture'
import { viewportDim } from '../../helper'
import { getMenuWidth, translateMenu, backdropOpacity, EDGE_SLIDE_THRESHOLD, OPEN_AFTER_SLIDE_RATIO, BACKDROP_OPACITY } from '.'

import SideMenuCtrl, { Side } from './SideMenuCtrl'

interface State {
  menuElement: HTMLElement | null
  backDropElement: HTMLElement | null
  canSlide: boolean
}

export interface Handlers {
  [eventName: string]: (gesture: TinyGesture) => (e: TouchEvent) => void
}

export default function EdgeOpenHandler(ctrl: SideMenuCtrl): Handlers {
  const side = ctrl.side
  const menuWidth = getMenuWidth()

  const state: State = {
    menuElement: null,
    backDropElement: null,
    canSlide: false
  }

  return {
    panstart: (gesture: TinyGesture) => (e: TouchEvent) => {
      const target = e.target! as HTMLElement
      if (
        target.nodeName === 'PIECE' ||
        target.nodeName === 'SQUARE' ||
        // svg element className is not a string
        (target.className.startsWith && target.className.startsWith('cg-board manipulable')) ||
        !inEdgeArea(gesture.touchStartX, side, viewportDim().vw)
      ) {
        state.canSlide = false
      } else {
        state.menuElement = ctrl.getMenuEl()
        state.backDropElement = ctrl.getBackdropEl()
        if (state.menuElement && state.backDropElement) {
          state.menuElement.style.visibility = 'visible'
          state.backDropElement.style.visibility = 'visible'
          state.canSlide = true
          redraw()
        }
      }
    },

    panmove: (gesture: TinyGesture) => (_: TouchEvent) => {
      if (state.canSlide) {
        const delta = gesture.touchMoveX
        if (side === 'left') {
          if (delta <= menuWidth) {
            translateMenu(state.menuElement!, -menuWidth + delta)
            backdropOpacity(state.backDropElement!, (delta / menuWidth * 100) / 100 * BACKDROP_OPACITY)
          }
        } else {
          if (delta >= -menuWidth) {
            translateMenu(state.menuElement!, menuWidth + delta)
            backdropOpacity(state.backDropElement!, (-delta / menuWidth * 100) / 100 * BACKDROP_OPACITY)
          }
        }
      }
    },

    panend: (gesture: TinyGesture) => () => {
      const velocity = gesture.velocityX
      if (state.canSlide && velocity !== null) {
        state.canSlide = false
        const delta = gesture.touchMoveX
        if (side === 'left') {
          if (
            velocity >= 0 &&
            (delta >= menuWidth * OPEN_AFTER_SLIDE_RATIO || velocity > 0.2)
          ) {
            ctrl.open()
          } else {
            ctrl.close()
          }
        } else {
          if (
            velocity <= 0 &&
            (delta <= -(menuWidth * OPEN_AFTER_SLIDE_RATIO) || velocity < -0.2)
          ) {
            ctrl.open()
          } else {
            ctrl.close()
          }
        }
      }
    }
  }
}

function inEdgeArea(inputPos: number, side: Side, vw: number) {
  return side === 'left' ?
    inputPos < EDGE_SLIDE_THRESHOLD :
    inputPos > vw - EDGE_SLIDE_THRESHOLD
}
