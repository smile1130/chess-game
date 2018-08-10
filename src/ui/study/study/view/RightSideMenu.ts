import * as h from 'mithril/hyperscript'
import router from '../../../../router'
import { lightPlayerName } from '../../../../lichess/player'
import { StudyMemberMap, StudyMember } from '../../../../lichess/interfaces/study'
import * as helper from '../../../helper'
import CloseSlideHandler from '../../../shared/sideMenu/CloseSlideHandler'
import CloseSwipeHandler from '../../../shared/sideMenu/CloseSwipeHandler'
import { expandMore, expandLess } from '../../../shared/icons'

import StudyCtrl from '../../../analyse/study/StudyCtrl'

export interface Attrs {
  studyCtrl: StudyCtrl
}

interface State {
  showMembers: boolean
}

interface DataSet extends DOMStringMap {
  id: string
}

export default {
  oninit({ attrs }) {
    const { studyCtrl } = attrs
    const nbMembers = Object.keys(studyCtrl.data.members).length
    this.showMembers = nbMembers <= 5
  },

  onbeforeupdate({ attrs }) {
    const sm = attrs.studyCtrl.sideMenu
    return sm.isOpen
  },

  view({ attrs }) {
    const { studyCtrl } = attrs
    const study = studyCtrl.data
    const members = sortMembers(study.members)
    const membPluralSuffix = members.length > 1 ? 's' : ''
    return h('aside#studyMenu', {
      oncreate: ({ dom }: Mithril.DOMNode) => {
        if (window.cordova.platformId === 'ios') {
          CloseSwipeHandler(dom as HTMLElement, studyCtrl.sideMenu)
        } else {
          CloseSlideHandler(dom as HTMLElement, studyCtrl.sideMenu)
        }
      }
    }, [
      h('div.native_scroller', [
        h('h2.study-menu-title.study-members', {
          oncreate: helper.ontapXY(() => this.showMembers = !this.showMembers)
        }, [
          h('span', `${members.length} member${membPluralSuffix}`),
          this.showMembers ? expandLess : expandMore
        ]),
        this.showMembers ? h('ul', members.map(memb =>
          h('li.study-menu-link', {
            className: memb.role === 'w' ? 'contrib' : 'viewer'
          }, [
            h('span.bullet.fa', {
              className: memb.role === 'w' ? 'fa-user' : 'fa-eye'
            }),
            h('span', memb.user ? lightPlayerName(memb.user) : '?')
          ])
        )) : null,
        h('h2.study-menu-title.study-chapters', `${study.chapters.length} chapters`),
        h('ol', {
          oncreate: helper.ontapXY(e => {
            const el = helper.getLI(e)
            const id = el && (el.dataset as DataSet).id
            if (id) {
              studyCtrl.sideMenu.close()
              .then(() => {
                const a = studyCtrl.analyseCtrl
                router.set(`/study/${study.id}/chapter/${id}?tabId=` + a.currentTab(a.availableTabs()).id, true)
              })
            }
          }, undefined, helper.getLI)
        }, study.chapters.map((c, i) => {
          return h('li.study-menu-link', {
            'data-id': c.id,
            className: study.chapter.id === c.id ? 'current' : ''
          }, [
            h('span.bullet', i + 1),
            h('span', c.name)
          ])
        }))
      ])
    ])
  }
} as Mithril.Component<Attrs, State>


function sortMembers(members: StudyMemberMap): ReadonlyArray<StudyMember> {
  return Object.keys(members).map(id => members[id]!).sort((a, b) => {
    if (a.role === 'r' && b.role === 'w') return 1
    if (a.role === 'w' && b.role === 'r') return -1
    return a.addedAt > b.addedAt ? 1 : -1
  })
}
