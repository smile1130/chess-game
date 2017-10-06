import * as h from 'mithril/hyperscript'
import i18n from '../../i18n'
import router from '../../router'
import { pad, formatTournamentDuration, formatTournamentTimeControl, capitalize } from '../../utils'
import { TournamentListItem } from '../../lichess/interfaces/tournament'
import * as helper from '../helper'
import TabNavigation from '../shared/TabNavigation'
import TabView from '../shared/TabView'

import newTournamentForm from './newTournamentForm'
import TournamentsListCtrl from './TournamentsListCtrl'

const TABS = [{
    label: 'In Progress'
}, {
    label: 'Upcoming'
}, {
    label: 'Completed'
}]

function onTournamentTap(e: Event) {
  const el = helper.getLI(e)
  const ds = el.dataset as DOMStringMap
  if (el && ds.id) {
    router.set('/tournament/' + ds.id)
  }
}

export function renderTournamentsList(ctrl: TournamentsListCtrl) {
  if (!ctrl.tournaments) return null

  const tabsContent = [
    ctrl.tournaments['started'],
    ctrl.tournaments['created'],
    ctrl.tournaments['finished']
  ]

  return [
    h('div.tabs-nav-header',
      h(TabNavigation, {
          buttons: TABS,
          selectedIndex: ctrl.currentTab,
          onTabChange: ctrl.onTabChange
      }),
      h('div.main_header_drop_shadow')
    ),
    h(TabView, {
      className: 'tournamentTabsWrapper',
      selectedIndex: ctrl.currentTab,
      content: tabsContent,
      renderer: renderTabContent,
      onTabChange: ctrl.onTabChange
    })
  ]
}

export function renderFooter() {
  return (
    <div className="actions_bar">
      <button key="createTournament" className="action_create_button" oncreate={helper.ontap(newTournamentForm.open)}>
        <span className="fa fa-plus-circle" />
        {i18n('createANewTournament')}
      </button>
    </div>
  )
}

function renderTabContent(list: Array<TournamentListItem>) {
  return h('ul.native_scroller.tournamentList', {
    oncreate: helper.ontapXY(onTournamentTap, undefined, helper.getLI)
  }, list.map(renderTournamentListItem))
}

function renderTournamentListItem(tournament: TournamentListItem, index: number) {
  const time = formatTournamentTimeControl(tournament.clock)
  const mode = tournament.rated ? i18n('rated') : i18n('casual')
  const duration = formatTournamentDuration(tournament.minutes)
  const variant = tournament.variant.key !== 'standard' ?
    capitalize(tournament.variant.short) : ''
  const evenOrOdd = index % 2 === 0 ? ' even ' : ' odd '

  return (
    <li key={tournament.id}
      className={'list_item tournament_item' + evenOrOdd + (tournament.createdBy === 'lichess' ? ' official' : '')}
      data-id={tournament.id}
      data-icon={tournament.perf.icon}
    >
      <div className="tournamentListName">
        <div className="fullName">{tournament.fullName}</div>
        <small className="infos">{time} {variant} {mode} • {duration}</small>
      </div>
      <div className="tournamentListTime">
        <div className="time">{formatTime(tournament.startsAt)} <strong className="timeArrow">-</strong> {formatTime(tournament.finishesAt)}</div>
        <small className="nbUsers withIcon" data-icon="r">{tournament.nbPlayers}</small>
      </div>
    </li>
  )
}

function formatTime(timeInMillis: number) {
  const date = new Date(timeInMillis)
  const hours = pad(date.getHours(), 2)
  const mins = pad(date.getMinutes(), 2)
  return hours + ':' + mins
}
