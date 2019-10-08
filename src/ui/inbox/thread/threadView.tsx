import { Plugins } from '@capacitor/core'
import h from 'mithril/hyperscript'
import * as helper from '../../helper'
import { userStatus } from '../../shared/common'
import i18n from '../../../i18n'
import { linkify } from '../../../utils/html'
import redraw from '../../../utils/redraw'
import { Post } from '../interfaces'

import { IThreadCtrl } from './threadCtrl'

export function threadBody(ctrl: IThreadCtrl) {
  if (!ctrl.thread()) return null
  return (
    <div key={ctrl.thread().id} className="threadWrapper native_scroller">
      {ctrl.thread().posts.map(renderPost)}
      <div className="responseWrapper">
        <form id="responseForm"
          onsubmit={(e: Event) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const body = (form[1] as HTMLTextAreaElement).value
            if (body.length >= 3)
              return ctrl.sendResponse(form)
            else
              Plugins.Toast.show({ text: 'Minimum length is 3', duration: 'short' })
          }}
        >
          <input id="id" key="id" value={ctrl.id()} type="hidden" />
          <textarea id="body" key="body" className="responseBody composeTextarea" />
          <button key="send" className="fatButton sendResponse" oncreate={helper.autofocus} type="submit">
            <span className="fa fa-check" />
            {i18n('send')}
          </button>
          { deleteButton (ctrl) }
        </form>
      </div>
    </div>
  )
}

function renderPost(post: Post, index: number, posts: Array<Post>) {
  let postClass = 'postWrapper'
  if (index === 0)
    postClass += ' first'
  if (index === posts.length - 1)
    postClass += ' last'
  return (
    <div className={postClass} key={post.createdAt}>
      <div className="infos">
        {userStatus(post.sender)}
        <span className="arrow" data-icon="H" />
        {userStatus(post.receiver)}
        &nbsp;–&nbsp;
        {postDateFormat(post.createdAt)}
      </div>
      <div className="text">
        {h.trust(linkify(post.text).replace(/\n/g, '<br>'))}
      </div>
    </div>
  )
}

function postDateFormat (timeInMillis: number) {
  const time = window.moment(timeInMillis)
  return time.calendar()
}

function deleteButton (ctrl: IThreadCtrl) {
  return ctrl.deleteAttempted() ? (
    <div className="negotiation confirmDeleteDialog">
      <button key="confirmDelete" className="fatButton confirmDelete" oncreate={helper.ontapY(() => {ctrl.deleteThread(ctrl.id())})}>
        <span className="fa fa-trash-o" />
        Delete
      </button>
      <button key="cancelDelete" className="fatButton cancelDelete"
        oncreate={helper.ontapY(() => {
          ctrl.deleteAttempted(false)
          redraw()
        })}>
        <span className="fa fa-ban" />
        {i18n('cancel')}
      </button>
    </div>
  ) : (
    <button key="delete" className="fatButton deleteThread" oncreate={helper.ontapY(() => {
      ctrl.deleteAttempted(true)
      redraw()
    })}>
      <span className="fa fa-trash-o" />
      Delete
    </button>
  )
}
