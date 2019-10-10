import * as Mithril from 'mithril'
import { Plugins } from '@capacitor/core'
import router from '../../router'
import redraw from '../../utils/redraw'
import * as helper from '../helper'
import { dropShadowHeader, backButton } from '../shared/common'
import layout from '../layout'
import i18n from '../../i18n'
import socket from '../../socket'
import h from 'mithril/hyperscript'

interface State {
  appVersion?: string
}

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    socket.createDefault()
    Plugins.Device.getInfo()
    .then(info => {
      this.appVersion = info.appVersion
      redraw()
    })
  },

  view() {
    const header = dropShadowHeader(null, backButton(i18n('settings')))
    return layout.free(header, renderBody(this.appVersion))
  }
} as Mithril.Component<{}, State>

function renderBody(appVersion?: string) {
  return [
    h('ul.settings_list.native_scroller.page', [
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/gameDisplay'))
      }, i18n('gameDisplay')),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/gameBehavior'))
      }, i18n('gameBehavior')),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/lang'))
      }, i18n('language')),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/theme'))
      }, `${i18n('theming')}`),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/themes/board'))
      }, i18n('board')),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/themes/piece'))
      }, i18n('pieces')),
      h('li.list_item.nav', {
        oncreate: helper.ontapY(() => router.set('/settings/soundNotifications'))
      }, i18n('soundAndNotifications'))
    ]),
    appVersion ? h('section.app_version', 'v' + appVersion) : null
  ]
}
