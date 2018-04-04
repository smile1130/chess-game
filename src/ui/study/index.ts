import * as h from 'mithril/hyperscript'
import redraw from '../../utils/redraw'
import router from '../../router'
import * as utils from '../../utils'
import * as helper from '../helper'
import layout from '../layout'
import EdgeOpenHandler, { HammerHandlers } from '../shared/sideMenu/EdgeOpenHandler'

import AnalyseCtrl from '../analyse/AnalyseCtrl'
import { renderContent, overlay, loadingScreen } from '../analyse/view'
import { load as loadStudy } from '../analyse/study/studyXhr'

import { notFound, studyHeader } from './view/studyView'
import RightSideMenu from './view/RightSideMenu'

export interface Attrs {
  id: string
  chapterId?: string
  ply?: string
  tab?: string
  // fen used for placeholder board while loading
  curFen?: string
}

export interface State {
  ctrl?: AnalyseCtrl
  notFound?: boolean
  hammerHandlers?: HammerHandlers
}

export default {
  oninit(vnode) {
    const studyId = vnode.attrs.id
    const studyChapterId = vnode.attrs.chapterId
    const now = performance.now()
    const ply = utils.safeStringToNum(vnode.attrs.ply)
    const tab = utils.safeStringToNum(vnode.attrs.tab)

    loadStudy(studyId, studyChapterId)
    .then(data => {
      const elapsed = performance.now() - now
      setTimeout(() => {
        this.ctrl = new AnalyseCtrl(
          data.analysis,
          data.study,
          'online',
          data.study.chapter.setup.orientation,
          true,
          ply || 0,
          tab
        )
        this.hammerHandlers = EdgeOpenHandler(this.ctrl.study!.sideMenu)
        redraw()
      }, Math.max(400 - elapsed, 0))
    })
    .catch(err => {
      if (err.status === 404) {
        this.notFound = true
        redraw()
      } else {
        utils.handleXhrError(err)
      }
    })
  },

  oncreate(vnode) {
    if (router.get().startsWith('/study')) {
      helper.elFadeIn(vnode.dom as HTMLElement)
    } else {
      helper.pageSlideIn(vnode.dom as HTMLElement)
    }
  },

  view(vnode) {
    if (this.notFound) {
      return notFound()
    }

    const isPortrait = helper.isPortrait()
    const ctrl = this.ctrl
    const hammerHandlers = this.hammerHandlers

    if (ctrl && hammerHandlers) {
      const bounds = helper.getBoardBounds(helper.viewportDim(), isPortrait, ctrl.settings.s.smallBoard)

      return layout.board(
        studyHeader(ctrl.study!.data),
        renderContent(ctrl, isPortrait, bounds),
        [
          ...overlay(ctrl),
          h(RightSideMenu, { studyCtrl: ctrl.study! }),
          h('div#studyMenu-backdrop.menu-backdrop', {
            oncreate: helper.ontap(() => ctrl.study!.sideMenu.close())
          })
        ],
        hammerHandlers
      )
    } else {
      return loadingScreen(isPortrait, undefined, vnode.attrs.curFen)
    }
  }

} as Mithril.Component<Attrs, State>
