import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import router from '../../router'
import { emptyFen } from '../../utils/fen'
import { hasNetwork } from '../../utils'
import i18n, { formatNumber, fromNow } from '../../i18n'
import session from '../../session'
import socket from '../../socket'
import { PongMessage, CorrespondenceSeek } from '../../lichess/interfaces'
import * as helper from '../helper'
import { renderTimelineEntry, timelineOnTap } from '../timeline'
import signals from '../../signals'
import MiniBoard from '../shared/miniBoard'
import TabNavigation from '../shared/TabNavigation'
import TabView from '../shared/TabView'
import newGameForm, { renderQuickSetup } from '../newGameForm'
import challengeForm from '../challengeForm'
import playMachineForm from '../playMachineForm'
import { renderTournamentList } from '../tournament/tournamentsListView'

import HomeCtrl from './HomeCtrl'

export function body(ctrl: HomeCtrl) {
  const playbanEndsAt = session.currentBan()

  if (!hasNetwork()) {
    const puzzleData = ctrl.offlinePuzzle
    const boardConf = puzzleData ? {
      fen: puzzleData.puzzle.fen,
      orientation: puzzleData.puzzle.color,
      link: () => router.set('/training'),
    } : null

    return (
      <div className={'native_scroller homeOfflineWrapper' + (boardConf ? ' withBoard' : '')}>
        <div className="home homeOffline">
          <section className="playOffline">
            <h2>{i18n('playOffline')}</h2>
            <button className="fatButton" oncreate={helper.ontapY(() => router.set('/ai'))}>{i18n('playOfflineComputer')}</button>
            <button className="fatButton" oncreate={helper.ontapY(() => router.set('/otb'))}>{i18n('playOnTheBoardOffline')}</button>
          </section>
          { boardConf ?
          <section className="miniPuzzle">
            <h2 className="homeTitle">{i18n('training')}</h2>
            {h(MiniBoard, boardConf)}
          </section> : undefined
          }
        </div>
      </div>
    )
  }

  return (
    <div className="native_scroller page">
      <div className="home">
        {playbanEndsAt && ((playbanEndsAt.valueOf() - Date.now()) / 1000) > 1 ?
          renderPlayban(playbanEndsAt) : renderLobby(ctrl)
        }
        <div className="home_start">
          <button className="buttonMetal"
            oncreate={helper.ontapY(() => newGameForm.openRealTime('custom'))}
          >
            {i18n('createAGame')}
          </button>
          <button className="buttonMetal"
            oncreate={helper.ontapY(() => challengeForm.open())}
          >
            {i18n('playWithAFriend')}
          </button>
          <button className="buttonMetal"
            oncreate={helper.ontapY(playMachineForm.open)}
          >
            {i18n('playWithTheMachine')}
          </button>
        </div>
        {h(Stats)}
        {renderFeaturedTournaments(ctrl)}
        {renderDailyPuzzle(ctrl)}
        {renderTimeline(ctrl)}
      </div>
    </div>
  )
}

const Stats = {
  oncreate() {
    const nbRoundSpread = spreadNumber(
      document.querySelector('#nb_games_in_play > strong'),
      8,
      socket.getCurrentPingInterval
    )
    const nbUserSpread = spreadNumber(
      document.querySelector('#nb_connected_players > strong'),
      10,
      socket.getCurrentPingInterval
    )
    this.render = (pong: PongMessage) => {
      nbUserSpread(pong.d)
      setTimeout(() => nbRoundSpread(pong.r), socket.getCurrentPingInterval() / 2)
    }
    signals.homePong.add(this.render)
  },
  onremove() {
    signals.homePong.remove(this.render)
  },
  view() {
    return h('div.stats', [
      h('div#nb_connected_players', h.trust(i18n('nbPlayers:other', '<strong>?</strong>'))),
      h('div#nb_games_in_play', h.trust(i18n('nbGames:other', '<strong>?</strong>'))),
    ])
  }
} as Mithril.Component<{}, { render: (p: PongMessage) => void }>

function renderLobby(ctrl: HomeCtrl) {
  const tabsContent = [
    () => renderQuickSetup(() => newGameForm.openRealTime('custom')),
    () => renderCorresPool(ctrl),
  ]

  return h('div.homeCreate', [
    h(TabNavigation, {
      buttons: [
        {
          label: i18n('quickPairing')
        },
        {
          label: i18n('correspondence')
        }
      ],
      selectedIndex: ctrl.selectedTab,
      onTabChange: ctrl.onTabChange,
      wrapperClass: 'homeSetup',
      withBottomBorder: true,
    }),
    h(TabView, {
      selectedIndex: ctrl.selectedTab,
      contentRenderers: tabsContent,
      onTabChange: ctrl.onTabChange,
      className: 'setupTabView',
      withWrapper: true,
    }),
  ])
}

function renderCorresPool(ctrl: HomeCtrl) {
  return h('div.corresPoolWrapper.native_scroller', [
    h('table.corres_seeks', [
      h('thead', [
        h('tr', [
          h('th', ''),
          h('th', 'Player'),
          h('th', 'Rating'),
          h('th', 'Time'),
          h('th', 'Mode'),
        ]),
      ]),
      h('tbody', ctrl.corresPool.map(s => renderSeek(ctrl, s)))
    ]),
    h('div.corres_create', [
      h('button.defaultButton', {
        oncreate: helper.ontap(newGameForm.openCorrespondence)
      }, i18n('createAGame')),
    ]),
  ])
}

function renderSeek(ctrl: HomeCtrl, seek: CorrespondenceSeek) {
  const action = seek.username.toLowerCase() === session.getUserId() ?
    'cancelCorresSeek' :
    'joinCorresSeek'

  const icon = seek.color === '' ? 'random' :
      seek.color === 'white' ? 'white' : 'black'

  return h('tr', {
    key: 'seek' + seek.id,
    'id': seek.id,
    className: 'corres_seek ' + action,
    oncreate: helper.ontapY(() => ctrl[action](seek.id))
  }, [
    h('td', h('span.color-icon.' + icon)),
    h('td', seek.username),
    h('td', seek.rating + (seek.provisional ? '?' : '')),
    h('td', seek.days ? i18n(seek.days === 1 ? 'oneDay' : 'nbDays', seek.days) : '∞'),
    h('td', h('span.withIcon', {
      'data-icon': seek.perf.icon
    }, i18n(seek.mode === 1 ? 'rated' : 'casual'))),
  ])
}

function renderFeaturedTournaments(ctrl: HomeCtrl) {
  if (ctrl.featuredTournaments && ctrl.featuredTournaments.length)
    return (
      <div className="homeTournament">
        {renderTournamentList(ctrl.featuredTournaments)}
      </div>
    )
  else
    return null
}

function renderDailyPuzzle(ctrl: HomeCtrl) {
  const puzzle = ctrl.dailyPuzzle
  const boardConf = puzzle ? {
    fen: puzzle.fen,
    orientation: puzzle.color,
    link: () => router.set(`/training/${puzzle.id}?initFen=${puzzle.fen}&initColor=${puzzle.color}`),
    boardTitle: [
      h('span', i18n('puzzleOfTheDay')),
      h('br'),
      h('span', puzzle.color === 'white' ? i18n('whitePlays') : i18n('blackPlays')),
    ]
  } : {
    orientation: 'white' as Color,
    fen: emptyFen,
  }

  return (
    <section className="miniPuzzle">
      {h(MiniBoard, boardConf)}
    </section>
  )
}

function renderTimeline(ctrl: HomeCtrl) {
  const timeline = ctrl.timeline
  if (!timeline || timeline.length === 0) return null

  return (
    <section id="timeline">
      <ul className="items_list_block"
        oncreate={helper.ontapY(timelineOnTap, undefined, helper.getLI)}
      >
        { timeline.map(renderTimelineEntry)}
      </ul>
      <div className="moreButton">
        <button oncreate={helper.ontapY(() => router.set('/timeline'))}>
          {i18n('more')}
        </button>
      </div>
    </section>
  )
}

function renderPlayban(endsAt: Date) {
  const seconds = (endsAt.valueOf() - Date.now()) / 1000
  return (
    <div className="home-playbanInfo">
      <h2>Sorry :(</h2>
      <p>We had to time you out for a {seconds < 3600 ? 'little ' : ''}while.</p>
      <br />
      <p>The timeout expires <strong>{fromNow(endsAt)}</strong>.</p>
      <h2>Why?</h2>
      <p>
        We aim to provide a pleasant chess experience for everyone.
        To that effect, we must ensure that all players follow good practices.
        When a potential problem is detected, we display this message.
      </p>
      <h2>How to avoid this?</h2>
      <ul>
        <li>Play every game you start</li>
        <li>Try to win (or at least draw) every game you play</li>
        <li>Resign lost games (don't let the clock run down)</li>
      </ul>
      <br />
      <br />
      <p>
        We apologize for the temporary inconvenience,<br />
        and wish you great games on lichess.org.<br />
        Thank you for reading!
      </p>
    </div>
  )
}

function spreadNumber(el: HTMLElement | null, nbSteps: number, getDuration: () => number) {
  let previous: number
  let displayed: string
  function display(prev: number, cur: number, it: number) {
    const val = formatNumber(Math.round(((prev * (nbSteps - 1 - it)) + (cur * (it + 1))) / nbSteps))
    if (el && val !== displayed) {
      el.textContent = val
      displayed = val
    }
  }
  let timeouts: Array<number> = []
  return function(nb: number, overrideNbSteps?: number) {
    if (!el || (!nb && nb !== 0)) return
    if (overrideNbSteps) nbSteps = Math.abs(overrideNbSteps)
    timeouts.forEach(clearTimeout)
    timeouts = []
    let prev = previous === 0 ? 0 : (previous || nb)
    previous = nb
    let interv = Math.abs(getDuration() / nbSteps)
    for (let i = 0; i < nbSteps; i++)
      timeouts.push(setTimeout(() => display(prev, nb, i), Math.round(i * interv)))
  }
}
