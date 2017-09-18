import socket from '../../socket'
import redraw from '../../utils/redraw'
import { handleXhrError } from '../../utils'
import * as xhr from './inboxXhr'
import { PagedThreads, InboxState } from './interfaces'
import * as throttle from 'lodash/throttle'
import * as stream from 'mithril/stream'

export default function oninit(vnode: Mithril.Vnode<void, InboxState>): void {
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

  vnode.state = <InboxState> {
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
}
