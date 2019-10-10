import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import Stream from 'mithril/stream'
import * as helper from '../../helper'
import * as xhr from '../userXhr'
import socket from '../../../socket'
import { handleXhrError, gameIcon } from '../../../utils'
import redraw from '../../../utils/redraw'
import spinner from '../../../spinner'
import { header as headerWidget, backButton } from '../../shared/common'
import { shortPerfTitle } from '../../../lichess/perfs'
import { User, PerfStats } from '../../../lichess/interfaces/user'
import layout from '../../layout'
import { renderBody } from './variantPerfView'

interface Attrs {
  id: string
  perf: PerfKey
}

export interface State {
  user: Stream<User>
  perfData: Stream<PerfStats>
}

export default {
  oncreate: helper.viewSlideIn,

  oninit(vnode) {
    const userId = vnode.attrs.id
    const perf = vnode.attrs.perf

    this.user = Stream()
    this.perfData = Stream()

    socket.createDefault()

    spinner.spin()
    Promise.all([
      xhr.user(userId, false),
      xhr.variantperf(userId, perf)
    ])
    .then(results => {
      spinner.stop()
      const [userData, variantData] = results
      this.user(userData)
      this.perfData(variantData)
      redraw()
    })
    .catch(err => {
      spinner.stop()
      handleXhrError(err)
    })
  },

  view(vnode) {
    const userId = vnode.attrs.id
    const perf = vnode.attrs.perf
    const header = headerWidget(null,
      backButton(h('div.main_header_title', [
        h('span.withIcon', { 'data-icon': gameIcon(perf) }),
        userId + ' ' + shortPerfTitle(perf as PerfKey) + ' stats'
      ]))
    )

    return layout.free(header, renderBody(this))
  }
} as Mithril.Component<Attrs, State>
