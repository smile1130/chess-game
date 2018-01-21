import * as sleepUtils from '../../utils/sleep'
import * as helper from '../helper'
import layout from '../layout'

import ChessClockCtrl, { IChessClockCtrl } from './ChessClockCtrl'
import { clockBody, renderClockSettingsOverlay } from './clockView'

interface State {
  ctrl: IChessClockCtrl
}

const ChessClockScreen: Mithril.Component<{}, State> = {
  oncreate: helper.viewFadeIn,

  oninit() {
    sleepUtils.keepAwake()
    this.ctrl = ChessClockCtrl()
  },

  onremove() {
    const c = this.ctrl.clockObj()
    if (c !== undefined) {
      c.clear()
    }
    sleepUtils.allowSleepAgain()
    document.removeEventListener('resume', this.ctrl.hideStatusBar)
    window.removeEventListener('resize', this.ctrl.hideStatusBar)
    window.StatusBar.show()
    if (window.cordova.platformId === 'android') {
      window.AndroidFullScreen.showSystemUI()
    }
  },

  view() {
    const body = () => clockBody(this.ctrl)
    const clockSettingsOverlay = () => renderClockSettingsOverlay(this.ctrl)

    return layout.clock(body, clockSettingsOverlay)
  }
}

export default ChessClockScreen
