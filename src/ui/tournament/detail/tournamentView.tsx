import * as h from 'mithril/hyperscript'
import router from '../../../router'
import session from '../../../session'
import i18n from '../../../i18n'
import { Tournament, StandingPlayer, PodiumPlace } from '../../../lichess/interfaces/tournament'
import { gameIcon, formatTournamentDuration, formatTournamentTimeControl } from '../../../utils'
import * as helper from '../../helper'
import settings from '../../../settings'
import miniBoard from '../../shared/miniBoard'
import CountdownTimer from '../../shared/CountdownTimer'

import faq from '../faq'
import playerInfo from './playerInfo'
import passwordForm from './passwordForm'
import TournamentCtrl from './TournamentCtrl'

export function renderFAQOverlay(ctrl: TournamentCtrl) {
  return [
    faq.view(ctrl.faqCtrl)
  ]
}

export function renderPlayerInfoOverlay(ctrl: TournamentCtrl) {
  return [
    playerInfo.view(ctrl.playerInfoCtrl)
  ]
}

export function tournamentBody(ctrl: TournamentCtrl) {
  const data = ctrl.tournament
  if (!data) return null

  return h('div.tournamentContainer.native_scroller.page.withFooter', [
    tournamentHeader(data),
    data.podium ? tournamentPodium(data.podium) : null,
    tournamentLeaderboard(ctrl),
    data.featured ? tournamentFeaturedGame(ctrl) : null
  ])
}

export function renderFooter(ctrl: TournamentCtrl) {
  const t = ctrl.tournament
  if (!t) return null
  const tUrl = 'https://lichess.org/tournament/' + t.id

  return (
    <div className="actions_bar">
      <button key="faq" className="action_bar_button" oncreate={helper.ontap(ctrl.faqCtrl.open)}>
        <span className="fa fa-question-circle" />
        FAQ
      </button>
      <button key="share" className="action_bar_button" oncreate={helper.ontap(() => window.plugins.socialsharing.share(tUrl))}>
        <span className="fa fa-share-alt" />
        Share
      </button>
      { ctrl.hasJoined ? withdrawButton(ctrl, t) : joinButton(ctrl, t) }
    </div>
  )
}

export function timeInfo(key: string, seconds?: number, preceedingText?: string) {
  if (seconds === undefined) return null

  return [
    preceedingText ? (preceedingText + ' ') : null,
    h(CountdownTimer, { key, seconds })
  ]
}

function tournamentHeader(data: Tournament) {
  const variant = variantDisplay(data)
  const control = formatTournamentTimeControl(data.clock)
  const conditionsClass = [
    'tournamentConditions',
    session.isConnected() ? '' : 'anonymous',
    data.verdicts.accepted ? 'accepted' : 'rejected'
  ].join(' ')
  return (
    <div key="header" className="tournamentHeader">
      <div className="tournamentInfoTime">
        <strong className="tournamentInfo withIcon" data-icon={gameIcon(variantKey(data))}>
          {variant + ' • ' + control + ' • ' + formatTournamentDuration(data.minutes) }
        </strong>
      </div>
      <div className="tournamentCreatorInfo">
        { data.createdBy === 'lichess' ? i18n('tournamentOfficial') : i18n('by', data.createdBy) }
        &nbsp;•&nbsp;
        { window.moment(data.startsAt).calendar() }
      </div>
      { data.position ?
      <div className={'tournamentPositionInfo' + (data.position.wikiPath ? ' withLink' : '')}
        oncreate={helper.ontapY(() => data.position && data.position.wikiPath &&
          window.open(`https://en.wikipedia.org/wiki/${data.position.wikiPath}`)
        )}
      >
        {data.position.eco + ' ' + data.position.name}
      </div> : null
      }
      { data.verdicts.list.length > 0 ?
        <div className={conditionsClass} data-icon="7">
          { data.verdicts.list.map(o => {
            return (
              <p className={'condition' + (o.accepted ? 'accepted' : 'rejected')}>
                { o.condition }
              </p>
            )
          })}
        </div> : null
      }
   </div>
  )
}

function joinButton(ctrl: TournamentCtrl, t: Tournament) {
  if (!session.isConnected() ||
    t.isFinished ||
    settings.game.supportedVariants.indexOf(t.variant) < 0 ||
    !t.verdicts.accepted) {
    return null
  }

  const action = ctrl.tournament.private ?
    () => passwordForm.open(ctrl) :
    () => ctrl.join()

  return (
    <button key="join" className="action_bar_button" oncreate={helper.ontap(action)}>
      <span className="fa fa-play" />
      {i18n('join')}
    </button>
  )
}

function withdrawButton(ctrl: TournamentCtrl, t: Tournament) {
  if (t.isFinished || settings.game.supportedVariants.indexOf(t.variant) < 0) {
    return null
  }
  return (
    <button key="withdraw" className="action_bar_button" oncreate={helper.ontap(ctrl.withdraw)}>
      <span className="fa fa-flag" />
      {i18n('withdraw')}
    </button>
  )
}

function variantDisplay(data: Tournament) {
  let variant = variantKey(data)
  variant = variant.split(' ')[0]

  if (variant.length > 0) {
    variant = variant.charAt(0).toUpperCase() + variant.substring(1)
  }

  return variant
}

function variantKey(data: Tournament) {
  let variant = data.variant
  if (variant === 'standard') {
    variant = data.perf.name.toLowerCase()
  }
  return variant
}


function getLeaderboardItemEl(e: Event) {
  const target = e.target as HTMLElement
  return (target as HTMLElement).classList.contains('list_item') ? target :
    helper.findParentBySelector(target, '.list_item')
}

function handlePlayerInfoTap(ctrl: TournamentCtrl, e: Event) {
  const el = getLeaderboardItemEl(e)
  const playerId = el.dataset['player']

  if (playerId) ctrl.playerInfoCtrl.open(playerId)
}

function tournamentLeaderboard(ctrl: TournamentCtrl) {
  const data = ctrl.tournament
  const players = ctrl.currentPageResults
  const page = ctrl.page
  const firstPlayer = (players.length > 0) ? players[0].rank : 0
  const lastPlayer = (players.length > 0) ? players[players.length - 1].rank : 0
  const backEnabled = page > 1
  const forwardEnabled = page < data.nbPlayers / 10
  const user = session.get()
  const userName = user ? user.username : ''

  return (
    <div key="leaderboard" className="tournamentLeaderboard">
      { data.nbPlayers > 0 ?
        <p className="tournamentTitle"> {i18n('leaderboard')} ({i18n('nbConnectedPlayers', data.nbPlayers)})</p> : null
      }

      <table
        className={'tournamentStandings' + (ctrl.isLoadingPage ? ' loading' : '')}
        oncreate={helper.ontap(e => handlePlayerInfoTap(ctrl, e!), undefined, undefined, getLeaderboardItemEl)}
      >
        {players.map(p => renderPlayerEntry(userName, p))}
      </table>
      <div className={'navigationButtons' + (players.length < 1 ? ' invisible' : '')}>
        {renderNavButton('W', !ctrl.isLoadingPage && backEnabled, ctrl.first)}
        {renderNavButton('Y', !ctrl.isLoadingPage && backEnabled, ctrl.prev)}
        <span class="pageInfo"> {firstPlayer + '-' + lastPlayer + ' / ' + data.nbPlayers} </span>
        {renderNavButton('X', !ctrl.isLoadingPage && forwardEnabled, ctrl.next)}
        {renderNavButton('V', !ctrl.isLoadingPage && forwardEnabled, ctrl.last)}
        {data.me ?
          <button className={'navigationButton tournament-me' + (ctrl.focusOnMe ? ' activated' : '')}
            data-icon="7"
            oncreate={helper.ontap(ctrl.toggleFocusOnMe)}
          >
            <span>Me</span>
          </button> : null
        }
      </div>
    </div>
  )
}

function renderNavButton(icon: string, isEnabled: boolean, action: () => void) {
  return h('button.navigationButton', {
    'data-icon': icon,
    oncreate: helper.ontap(action),
    disabled: !isEnabled
  })
}

function renderPlayerEntry(userName: string, player: StandingPlayer) {
  const isMe = player.name === userName
  return (
    <tr key={player.name} data-player={player.name} className={'list_item' + (isMe ? ' tournament-me' : '')} >
      <td className="tournamentPlayer">
        <span className="flagRank" data-icon={player.withdraw ? 'b' : ''}> {player.withdraw ? '' : (player.rank + '. ')} </span>
        <span> {player.name + ' (' + player.rating + ') '} {helper.progress(player.ratingDiff)} </span>
      </td>
      <td className="tournamentPoints">
        <span className={player.sheet.fire ? 'on-fire' : 'off-fire'} data-icon="Q">
          {player.score}
        </span>
      </td>
    </tr>
  )
}

function tournamentFeaturedGame(ctrl: TournamentCtrl) {
  const data = ctrl.tournament
  const featured = data.featured
  if (!featured) return null

  const isPortrait = helper.isPortrait()

  featured.player = {user: {username: featured.white.name}, rating: featured.white.rating}
  featured.opponent = {user: {username: featured.black.name}, rating: featured.black.rating}
  featured.clock = {initial: data.clock.limit, increment: data.clock.increment}

  return (
    <div className="tournamentGames">
      <p className="tournamentTitle tournamentFeatured">Featured Game</p>
      <div key={featured.id} className="tournamentMiniBoard">
        {h(miniBoard, {
          bounds: miniBoardSize(isPortrait),
          fen: featured.fen,
          lastMove: featured.lastMove,
          orientation: 'white',
          link: () => router.set('/tournament/' + data.id + '/game/' + featured.id),
          gameObj: featured}
        )}
      </div>
    </div>
  )
}


function miniBoardSize(isPortrait: boolean) {
  const { vh, vw } = helper.viewportDim()
  const side = isPortrait ? vw * 0.66 : vh * 0.66
  const bounds = {
    height: side,
    width: side
  }
  return bounds
}

function tournamentPodium(podium: Array<PodiumPlace>) {
  return (
    <div key="podium" className="podium">
      { renderPlace(podium[1]) }
      { renderPlace(podium[0]) }
      { renderPlace(podium[2]) }
    </div>
  )
}

function renderPlace(data: PodiumPlace) {
  // tournament can exist with only 2 players
  if (!data) return null

  const rank = data.rank
  return (
    <div className={'place' + rank}>
      <div className="trophy"> </div>
      <div className="username" oncreate={helper.ontap(() => router.set('/@/' + data.name))}>
        {data.name}
      </div>
      <div className="rating"> {data.rating} {helper.progress(data.ratingDiff)} </div>
      <table className="stats">
        <tr>
          <td className="statName">
            {i18n('gamesPlayed')}
          </td>
          <td className="statData">
            {data.nb.game}
          </td>
        </tr>
        <tr>
          <td className="statName">
            Win Rate
          </td>
          <td className="statData">
            {((data.nb.win / data.nb.game) * 100).toFixed(0) + '%'}
          </td>
        </tr>
        <tr>
          <td className="statName">
            Berserk Rate
          </td>
          <td className="statData">
            {((data.nb.berserk / data.nb.game) * 100).toFixed(0) + '%'}
          </td>
        </tr>
        <tr>
          <td className="statName">
            Performance
          </td>
          <td className="statData">
            {data.performance}
          </td>
        </tr>
      </table>
    </div>
  )
}
