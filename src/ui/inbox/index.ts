import * as throttle from 'lodash/throttle'
import * as stream from 'mithril/stream'
import socket from '../../socket'
import redraw from '../../utils/redraw'
import { handleXhrError } from '../../utils'
import i18n from '../../i18n'
import { header } from '../shared/common'
import * as helper from '../helper'
import layout from '../layout'

import { renderFooter, inboxBody } from './inboxView'
import { PagedThreads } from './interfaces'
import * as xhr from './inboxXhr'

export interface InboxCtrl {
  threads: Mithril.Stream<PagedThreads>
  isLoading: Mithril.Stream<boolean>
  first: () => void
  prev: () => void
  next: () => void
  last: () => void
}

export default {
  oncreate: helper.viewFadeIn,

  oninit() {
    socket.createDefault()

    const threads = stream<PagedThreads>()
    const isLoading = stream<boolean>(false)

    const throttledReload = throttle((p: number) => {
      isLoading(true)
      xhr.reload(p)
      .then(data => {
        threads(data)
        isLoading(false)
        redraw()
      })
      .catch(() => {
        isLoading(false)
        redraw()
      })
    }, 1000)

    xhr.inbox()
    .then(data => {
      threads(data)
      redraw()
    })
    .catch(handleXhrError)

    this.ctrl = {
      threads,
      isLoading,
      first() {
        if (!isLoading()) throttledReload(1)
      },
      prev() {
        const prevPage = threads().previousPage
        if (!isLoading() && prevPage) throttledReload(prevPage)
      },
      next() {
        const nextPage = threads().nextPage
        if (!isLoading() && nextPage) throttledReload(nextPage)
      },
      last() {
        const lastPage = threads().nbPages
        if (!isLoading() && lastPage) throttledReload(lastPage)
      }
    }
  },

  view() {
    const headerCtrl = () => header(i18n('inbox'))
    const bodyCtrl = () => inboxBody(this.ctrl)
    const footer = () => renderFooter(this.ctrl)
    return layout.free(headerCtrl, bodyCtrl, footer)
  }
} as Mithril.Component<{}, { ctrl: InboxCtrl }>
