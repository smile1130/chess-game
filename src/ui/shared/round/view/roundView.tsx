import * as h from 'mithril/hyperscript'
import * as range from 'lodash/range'
import redraw from '../../../../utils/redraw'
import socket from '../../../../socket'
import session from '../../../../session'
import * as playerApi from '../../../../lichess/player'
import * as gameApi from '../../../../lichess/game'
import * as perfApi from '../../../../lichess/perfs'
import gameStatusApi from '../../../../lichess/status'
import { Player } from '../../../../lichess/interfaces/game'
import { User } from '../../../../lichess/interfaces/user'
import settings from '../../../../settings'
import * as utils from '../../../../utils'
import i18n from '../../../../i18n'
import layout from '../../../layout'
import * as helper from '../../../helper'
import { backButton, menuButton, loader, headerBtns, miniUser } from '../../../shared/common'
import GameTitle from '../../../shared/GameTitle'
import CountdownTimer from '../../../shared/CountdownTimer'
import Board from '../../../shared/Board'
import popupWidget from '../../../shared/popup'
import Clock from '../clock/clockView'
import ClockCtrl from '../clock/ClockCtrl'
import promotion from '../promotion'
import gameButton from './button'
import { chatView } from '../chat'
import { notesView } from '../notes'
import CrazyPocket from '../crazy/CrazyPocket'
import { view as renderCorrespondenceClock } from '../correspondenceClock/corresClockView'
import { renderTable as renderReplayTable } from './replay'
import OnlineRound from '../OnlineRound'
import { Position, Material } from '../'

export default function view(ctrl: OnlineRound) {
  const isPortrait = helper.isPortrait()

  return layout.board(
    () => renderHeader(ctrl),
    () => renderContent(ctrl, isPortrait),
    () => overlay(ctrl)
  )
}

function overlay(ctrl: OnlineRound) {
  return [
    ctrl.chat ? chatView(ctrl.chat) : null,
    ctrl.notes ? notesView(ctrl.notes) : null,
    promotion.view(ctrl),
    renderGamePopup(ctrl),
    renderSubmitMovePopup(ctrl),
    miniUser(ctrl.data.player.user, ctrl.vm.miniUser.player.data, ctrl.vm.miniUser.player.showing, () => ctrl.closeUserPopup('player')),
    miniUser(ctrl.data.opponent.user, ctrl.vm.miniUser.opponent.data, ctrl.vm.miniUser.opponent.showing, () => ctrl.closeUserPopup('opponent'))
  ]
}

export function renderMaterial(material: Material) {
  return Object.keys(material).map((role: Role) =>
    h('div.tomb', { key: role }, range(material[role])
      .map(_ => h('piece', { className: role }))
    )
  )
}

function renderTitle(ctrl: OnlineRound) {
  const data = ctrl.data
  const tournament = ctrl.data.tournament
  if (ctrl.vm.offlineWatcher || socket.isConnected()) {
    const isCorres = !data.player.spectator && data.game.speed === 'correspondence'
    if (ctrl.data.tv) {
      return h('div.main_header_title.withSub', {
        key: 'tv'
      }, [
        h('h1.header-gameTitle', [h('span.withIcon[data-icon=1]'), 'Lichess TV']),
        h('h2.header-subTitle', tvChannelSelector(ctrl))
      ])
    }
    else if (ctrl.data.userTV) {
      return h('div.main_header_title.withSub', {
        key: 'user-tv'
      }, [
        h('h1.header-gameTitle', [h('span.withIcon[data-icon=1]'), ctrl.data.userTV]),
        h('h2.header-subTitle', tournament ? [
          h('span.fa.fa-trophy'),
          h(CountdownTimer, { seconds: tournament.secondsToFinish || 0 }),
          h('span', ' • ' + tournament.name)
        ] : [
          h(`span.withIcon[data-icon=${utils.gameIcon(ctrl.data.game.perf)}]`),
          gameApi.title(ctrl.data)
        ])
      ])
    }
    else {
      return h(GameTitle, {
        key: 'playing-title',
        data: ctrl.data,
        kidMode: session.isKidMode(),
        subTitle: tournament ? 'tournament' : isCorres ? 'corres' : 'date'
      })
    }
  } else {
    return (
      <div key="reconnecting-title" className="main_header_title reconnecting">
        {loader}
      </div>
    )
  }
}

function renderHeader(ctrl: OnlineRound) {

  let children
  if (!ctrl.data.tv && !ctrl.data.userTV && ctrl.data.player.spectator) {
    children = [
      backButton(renderTitle(ctrl))
    ]
  } else {
    children = [
      menuButton(),
      renderTitle(ctrl)
    ]
  }
  children.push(headerBtns())

  return h('nav', {
    className: socket.isConnected() ? '' : 'reconnecting'
  }, children)
}

function renderContent(ctrl: OnlineRound, isPortrait: boolean) {
  const material = ctrl.chessground.getMaterialDiff()
  const player = renderPlayTable(ctrl, ctrl.data.player, material[ctrl.data.player.color], 'player', isPortrait)
  const opponent = renderPlayTable(ctrl, ctrl.data.opponent, material[ctrl.data.opponent.color], 'opponent', isPortrait)
  const bounds = helper.getBoardBounds(helper.viewportDim(), isPortrait)

  const board = h(Board, {
    variant: ctrl.data.game.variant.key,
    chessground: ctrl.chessground,
    bounds
  })

  const orientationKey = isPortrait ? 'o-portrait' : 'o-landscape'

  if (isPortrait) {
    return h.fragment({ key: orientationKey }, [
      opponent,
      board,
      player,
      renderGameActionsBar(ctrl)
    ])
  } else {
    return h.fragment({ key: orientationKey }, [
      board,
      <section className="table">
        <section className="playersTable">
          {opponent}
          {renderReplayTable(ctrl)}
          {player}
        </section>
        {renderGameActionsBar(ctrl)}
      </section>
    ])
  }
}

function renderExpiration(ctrl: OnlineRound, position: Position, myTurn: boolean) {
  const d = ctrl.data.expiration
  if (!d) return null
  const timeLeft = Math.max(0, d.movedAt - Date.now() + d.millisToMove)

  return h('div.round-expiration', {
    className: position
  }, h(CountdownTimer, {
      seconds: Math.round(timeLeft / 1000),
      emergTime: myTurn ? 8 : undefined,
      textWrap: (t: string) => `<strong>${t}</strong> seconds to play the first move`,
      showOnlySecs: true
    })
  )
}

function getChecksCount(ctrl: OnlineRound, color: Color) {
  const player = color === ctrl.data.player.color ? ctrl.data.opponent : ctrl.data.player
  return player.checks
}

function renderSubmitMovePopup(ctrl: OnlineRound) {
  if (ctrl.vm.moveToSubmit || ctrl.vm.dropToSubmit) {
    return (
      <div className="overlay_popup_wrapper submitMovePopup">
      <div className="overlay_popup">
      {gameButton.submitMove(ctrl)}
      </div>
      </div>
    )
  }

  return null
}

function userInfos(user: User, player: Player, playerName: string, position: Position) {
  let title: string
  if (user) {
    let onlineStatus = user.online ? 'connected to lichess' : 'offline'
    let onGameStatus = player.onGame ? 'currently on this game' : 'currently not on this game'
    let engine = position === 'opponent' && user.engine ? i18n('thisPlayerUsesChessComputerAssistance') + '; ' : ''
    let booster = position === 'opponent' && user.booster ? i18n('thisPlayerArtificiallyIncreasesTheirRating') + '; ' : ''
    title = `${playerName}: ${engine}${booster}${onlineStatus}; ${onGameStatus}`
  } else
    title = playerName
  window.plugins.toast.show(title, 'short', 'center')
}

function renderClock(ctrl: ClockCtrl, color: Color, isBerserk: boolean, runningColor?: Color) {
  return h(Clock, {
    ctrl,
    color,
    runningColor,
    isBerserk
  })
}

function renderAntagonistInfo(ctrl: OnlineRound, player: Player, material: Material, position: Position, isPortrait: boolean, isCrazy: boolean) {
  const user = player.user
  const playerName = playerApi.playerName(player, !isPortrait)
  const togglePopup = user ? () => ctrl.openUserPopup(position, user.id) : utils.noop
  const vConf = user ?
    helper.ontap(togglePopup, () => userInfos(user, player, playerName, position)) :
    helper.ontap(utils.noop, () => window.plugins.toast.show(playerName, 'short', 'center'))

  const checksNb = getChecksCount(ctrl, player.color)

  const runningColor = ctrl.isClockRunning() ? ctrl.data.game.player : undefined

  const tournamentRank = ctrl.data.tournament && ctrl.data.tournament.ranks ?
    '#' + ctrl.data.tournament.ranks[player.color] + ' ' : null

  const isZen = settings.game.zenMode() && !ctrl.data.player.spectator &&
    !(gameStatusApi.finished(ctrl.data) || gameStatusApi.aborted(ctrl.data))

  return (
    <div className={'antagonistInfos' + (isCrazy ? ' crazy' : '') + (isZen ? ' zen' : '')} oncreate={vConf}>
      <h2 className="antagonistUser">
        { user && user.patron ?
          <span className={'patron status ' + (player.onGame ? 'ongame' : 'offgame')} data-icon="" />
          :
          <span className={'fa fa-circle status ' + (player.onGame ? 'ongame' : 'offgame')} /> }
        {tournamentRank}
        {playerName}
        { isCrazy && position === 'opponent' && user && (user.engine || user.booster) ?
          <span className="warning" data-icon="j"></span> : null
        }
      </h2>
      { !isCrazy ?
      <div className="ratingAndMaterial">
        { position === 'opponent' && user && (user.engine || user.booster) ?
          <span className="warning" data-icon="j"></span> : null
        }
        {user && isPortrait ?
          <h3 className="rating">
            {player.rating}
            {player.provisional ? '?' : ''}
            {helper.renderRatingDiff(player)}
          </h3> : null
        }
        {checksNb !== undefined ?
          <div className="checkCount">+{checksNb}</div> : null
        }
        {ctrl.data.game.variant.key === 'horde' ? null : renderMaterial(material)}
      </div> : null
      }
      {isCrazy && ctrl.clock ?
        renderClock(ctrl.clock, player.color, ctrl.vm.goneBerserk[player.color], runningColor) :
        isCrazy && ctrl.correspondenceClock ?
          renderCorrespondenceClock(
            ctrl.correspondenceClock, player.color, ctrl.data.game.player
          ) : null
      }
    </div>
  )
}

function renderPlayTable(ctrl: OnlineRound, player: Player, material: Material, position: Position, isPortrait: boolean) {
  const runningColor = ctrl.isClockRunning() ? ctrl.data.game.player : undefined
  const step = ctrl.plyStep(ctrl.vm.ply)
  const isCrazy = !!step.crazy
  const playable = gameApi.playable(ctrl.data)
  const myTurn = gameApi.isPlayerTurn(ctrl.data)

  return (
    <section className={'playTable' + (isCrazy ? ' crazy' : '')}>
      {renderAntagonistInfo(ctrl, player, material, position, isPortrait, isCrazy)}
      { !!step.crazy ?
        h(CrazyPocket, {
          ctrl,
          crazyData: step.crazy,
          color: player.color,
          position
        }) : null
      }
      { !isCrazy && ctrl.clock ?
        renderClock(ctrl.clock, player.color, ctrl.vm.goneBerserk[player.color], runningColor) :
        !isCrazy && ctrl.correspondenceClock ?
          renderCorrespondenceClock(
            ctrl.correspondenceClock, player.color, ctrl.data.game.player
          ) : null
      }
      { playable && (myTurn && position === 'player' || !myTurn && position === 'opponent') ?
        renderExpiration(ctrl, position, myTurn) : null
      }
    </section>
  )
}

function tvChannelSelector(ctrl: OnlineRound) {
  const channels = perfApi.perfTypes.filter(e => e[0] !== 'correspondence').map(e => [e[1], e[0]])
  channels.unshift(['Top rated', 'best'])
  channels.push(['Computer', 'computer'])
  const channel = settings.tv.channel()
  const icon = utils.gameIcon(channel)

  return (
    h('div.select_input.main_header-selector.round-tvChannelSelector', [
      h('label', {
        'for': 'channel_selector'
      }, h(`i[data-icon=${icon}]`)),
      h('select#channel_selector', {
        value: channel,
        onchange(e: Event) {
          const val = (e.target as HTMLSelectElement).value
          settings.tv.channel(val)
          ctrl.onTVChannelChange && ctrl.onTVChannelChange()
          setTimeout(redraw, 10)
        }
      }, channels.map(v =>
        h('option', {
          key: v[1], value: v[1]
        }, v[0])
      ))
    ])
  )
}

function renderGameRunningActions(ctrl: OnlineRound) {
  if (ctrl.data.player.spectator) {
    let controls = [
      gameButton.bookmark(ctrl),
      gameButton.shareLink(ctrl),
      ctrl.data.tv && ctrl.data.player.user ? gameButton.userTVLink(ctrl.data.player.user) : null,
      ctrl.data.tv && ctrl.data.opponent.user ? gameButton.userTVLink(ctrl.data.opponent.user) : null
    ]

    return <div className="game_controls">{controls}</div>
  }

  const answerButtons = [
    gameButton.cancelDrawOffer(ctrl),
    gameButton.answerOpponentDrawOffer(ctrl),
    gameButton.cancelTakebackProposition(ctrl),
    gameButton.answerOpponentTakebackProposition(ctrl)
  ]

  const gameControls = gameButton.forceResign(ctrl) || [
    gameButton.standard(ctrl, gameApi.takebackable, 'i', 'proposeATakeback', 'takeback-yes'),
    gameButton.standard(ctrl, ctrl.canOfferDraw, '2', 'offerDraw', 'draw-yes', ctrl.offerDraw),
    gameButton.threefoldClaimDraw(ctrl),
    gameButton.resign(ctrl),
    gameButton.resignConfirmation(ctrl),
    gameButton.goBerserk(ctrl)
  ]

  return (
    <div className="game_controls">
      {gameButton.analysisBoard(ctrl)}
      {gameButton.shareLink(ctrl)}
      {gameButton.moretime(ctrl)}
      {gameButton.standard(ctrl, gameApi.abortable, 'L', 'abortGame', 'abort')}
      {gameControls}
      {answerButtons ? <div className="answers">{answerButtons}</div> : null}
    </div>
  )
}

function renderGameEndedActions(ctrl: OnlineRound) {
  const result = gameApi.result(ctrl.data)
  const winner = gameApi.getPlayer(ctrl.data, ctrl.data.game.winner)
  const status = gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key) +
    (winner ? '. ' + i18n(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
  const resultDom = gameStatusApi.aborted(ctrl.data) ? [] : [
    h('strong', result), h('br')
  ]
  resultDom.push(h('em.resultStatus', status))
  let buttons: Mithril.Children
  const tournamentId = ctrl.data.game.tournamentId
  if (tournamentId) {
    if (ctrl.data.player.spectator) {
      buttons = [
        gameButton.returnToTournament(ctrl),
        gameButton.bookmark(ctrl),
        gameButton.shareLink(ctrl),
        gameButton.sharePGN(ctrl),
        gameButton.analysisBoard(ctrl)
      ]
    }
    else {
      buttons = [
        gameButton.returnToTournament(ctrl),
        gameButton.withdrawFromTournament(ctrl, tournamentId),
        gameButton.bookmark(ctrl),
        gameButton.shareLink(ctrl),
        gameButton.sharePGN(ctrl),
        gameButton.analysisBoard(ctrl)
      ]
    }
  }
  else {
    if (ctrl.data.player.spectator) {
      buttons = [
        gameButton.bookmark(ctrl),
        gameButton.shareLink(ctrl),
        ctrl.data.tv && ctrl.data.player.user ? gameButton.userTVLink(ctrl.data.player.user) : null,
        ctrl.data.tv && ctrl.data.opponent.user ? gameButton.userTVLink(ctrl.data.opponent.user) : null,
        gameButton.sharePGN(ctrl),
        gameButton.analysisBoard(ctrl)
      ]
    }
    else {
      buttons = [
        gameButton.bookmark(ctrl),
        gameButton.shareLink(ctrl),
        gameButton.sharePGN(ctrl),
        gameButton.newOpponent(ctrl),
        gameButton.answerOpponentRematch(ctrl),
        gameButton.cancelRematch(ctrl),
        gameButton.rematch(ctrl),
        gameButton.analysisBoard(ctrl)
      ]
    }
  }
  return (
    <div className="game_controls">
      <div className="control buttons">{buttons}</div>
    </div>
  )
}

function renderPopupTitle(ctrl: OnlineRound) {
  return [
    h('span.withIcon', {
      'data-icon': utils.gameIcon(ctrl.data.game.perf)
    }),
    gameApi.title(ctrl.data)
  ]
}

function renderStatus(ctrl: OnlineRound) {
  const result = gameApi.result(ctrl.data)
  const winner = gameApi.getPlayer(ctrl.data, ctrl.data.game.winner)
  const status = gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key) +
    (winner ? '. ' + i18n(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
  return (gameStatusApi.aborted(ctrl.data) ? [] : [
    h('strong', result), h('br')
  ]).concat([h('em.resultStatus', status)])
}

function renderGamePopup(ctrl: OnlineRound) {
  const header = ctrl.data.tv ?
    () => renderPopupTitle(ctrl) :
    !gameApi.playable(ctrl.data) ?
      () => renderStatus(ctrl) : undefined

  return popupWidget(
    'player_controls',
    header,
    gameApi.playable(ctrl.data) ?
      () => renderGameRunningActions(ctrl) : () => renderGameEndedActions(ctrl),
    ctrl.vm.showingActions,
    ctrl.hideActions
  )
}

function renderGameActionsBar(ctrl: OnlineRound) {
  const answerRequired = ctrl.data.opponent.proposingTakeback ||
    ctrl.data.opponent.offeringDraw ||
    gameApi.forceResignable(ctrl.data) ||
    ctrl.data.opponent.offeringRematch

  const gmClass = (ctrl.data.opponent.proposingTakeback ? [
    'fa',
    'fa-mail-reply'
  ] : [
    'fa',
    'fa-ellipsis-h'
  ]).concat([
    'action_bar_button',
    answerRequired ? 'glow' : ''
  ]).join(' ')

  const gmDataIcon = ctrl.data.opponent.offeringDraw ? '2' : null
  const gmButton = gmDataIcon ?
    <button className={gmClass} data-icon={gmDataIcon} key="gameMenu" oncreate={helper.ontap(ctrl.showActions)} /> :
    <button className={gmClass} key="gameMenu" oncreate={helper.ontap(ctrl.showActions)} />

  const chatClass = [
    'action_bar_button',
    ctrl.chat && ctrl.chat.unread ? 'glow' : ''
  ].join(' ')

  return (
    <section className="actions_bar">
      {gmButton}
      {ctrl.chat ?
      <button className={chatClass} data-icon="c" key="chat"
        oncreate={helper.ontap(ctrl.chat.open)} /> : null
      }
      {ctrl.notes ? gameButton.notes(ctrl) : null}
      {gameButton.flipBoard(ctrl)}
      {gameApi.playable(ctrl.data) ? null : gameButton.analysisBoardIconOnly(ctrl)}
      {gameButton.backward(ctrl)}
      {gameButton.forward(ctrl)}
    </section>
  )
}
