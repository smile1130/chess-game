import * as h from 'mithril/hyperscript'
import * as menu from '../menu'
import router from '../../router'
import * as utils from '../../utils'
import { emptyFen } from '../../utils/fen'
import { hasOfflineGames } from '../../utils/offlineGames'
import settings from '../../settings'
import layout from '../layout'
import * as helper from '../helper'
import gamesMenu from '../gamesMenu'
import newGameForm from '../newGameForm'
import session from '../../session'
import challengesApi from '../../lichess/challenges'
import friendsApi from '../../lichess/friends'
import i18n from '../../i18n'
import popupWidget from './popup'
import { getLanguageNativeName } from '../../utils/langs'
import friendsPopup from '../friendsPopup'
import spinner from '../../spinner'
import countries from '../../utils/countries'
import ViewOnlyBoard from './ViewOnlyBoard'
import { backArrow } from './icons'
import { BaseUser, User } from '../../lichess/interfaces/user'

export const LoadingBoard = {
  view() {
    return layout.board(
      connectingHeader(),
      viewOnlyBoardContent(emptyFen, 'white')
    )
  }
}

export function menuButton() {
  return (
    <button key="main-menu" className="fa fa-navicon main_header_button menu_button" oncreate={helper.ontap(menu.mainMenuCtrl.toggle)}>
    </button>
  )
}

export function backButton(title?: Mithril.BaseNode | string): Mithril.Children {
  return h('div.back_button', { key: 'default-history-backbutton' }, [
    h('button', { oncreate: helper.ontap(router.backHistory) }, backArrow),
    title !== undefined ? typeof title === 'string' ? h('div.main_header_title', title) : title : null
  ])
}

export function friendsButton() {
  const nbFriends = friendsApi.count()
  const longAction = () => window.plugins.toast.show(i18n('onlineFriends'), 'short', 'top')

  return (
    <button className="main_header_button friends_button" key="friends" data-icon="f"
      oncreate={helper.ontap(friendsPopup.open, longAction)}
    >
    {nbFriends > 0 ?
      <span className="chip nb_friends">{nbFriends}</span> : null
    }
    </button>
  )
}

let boardTheme: string
export function onBoardThemeChange(theme: string) {
  boardTheme = theme
}
function gamesButton() {
  let key: string, action: () => void
  const nbChallenges = challengesApi.all().length
  const nbIncomingChallenges = challengesApi.incoming().length
  const withOfflineGames = !utils.hasNetwork() && hasOfflineGames()
  boardTheme = boardTheme || settings.general.theme.board()
  if (session.nowPlaying().length || nbChallenges || withOfflineGames) {
    key = 'games-menu'
    action = gamesMenu.open
  } else {
    key = 'new-game-form'
    action = newGameForm.open
  }
  const myTurns = session.myTurnGames().length
  const className = [
    'main_header_button',
    'game_menu_button',
    boardTheme,
    nbIncomingChallenges ? 'new_challenge' : '',
    !utils.hasNetwork() && !hasOfflineGames() ? 'invisible' : ''
  ].join(' ')
  const longAction = () => window.plugins.toast.show(i18n('nbGamesInPlay', session.nowPlaying().length), 'short', 'top')

  return (
    <button key={key} className={className} oncreate={helper.ontap(action, longAction)}>
      {!nbIncomingChallenges && myTurns ?
        <span className="chip nb_playing">{myTurns}</span> : null
      }
      {nbIncomingChallenges ?
        <span className="chip nb_challenges">{nbChallenges}</span> : null
      }
    </button>
  )
}

export function headerBtns() {
  if (utils.hasNetwork() && session.isConnected() && friendsApi.count()) {
    return (
      <div key="buttons" className="buttons">
        {friendsButton()}
        {gamesButton()}
      </div>
    )
  } else if (utils.hasNetwork() && session.isConnected()) {
    return (
      <div key="buttons" className="buttons">
        {gamesButton()}
      </div>
    )
  } else if (utils.hasNetwork() && session.isConnected() && friendsApi.count()) {
    return (
      <div key="buttons" className="buttons">
        {friendsButton()}
        {gamesButton()}
      </div>
    )
  }
  else {
    return (
      <div key="buttons" className="buttons">
        {gamesButton()}
      </div>
    )
  }
}

// TODO refactor this
export function header(title: Mithril.BaseNode | string | null, leftButton?: Mithril.Children): Mithril.Children {
  return h('nav', [
    leftButton ? leftButton : menuButton(),
    typeof title === 'string' ?
      h('div.main_header_title', {
        key: title
      }, title) : title,
    headerBtns()
  ])
}

export function dropShadowHeader(title: Mithril.BaseNode | string | null, leftButton?: Mithril.Children): Mithril.Children {
  return [
    h('nav', [
      leftButton ? leftButton : menuButton(),
      title ? <div className="main_header_title" key="title">{title}</div> : null,
      headerBtns()
    ]),
    h('div.main_header_drop_shadow')
  ]
}

export const loader = (
  <div className="loader_circles">
    {[1, 2, 3].map(i => <div className={'circle_' + i} />)}
  </div>
)

export function connectingHeader(title?: string) {
  return (
    <nav>
      {menuButton()}
      <div key="connecting-title" className={'main_header_title reconnecting' + (title ? 'withTitle' : '')}>
        {title ? <span>{title}</span> : null}
        {loader}
      </div>
      {headerBtns()}
    </nav>
  )
}

export function loadingBackbutton(title?: string) {
  return (
    <nav>
      {backButton()}
      <div key="connecting-backbutton" className={'main_header_title reconnecting' + (title ? 'withTitle' : '')}>
        {title ? <span>{title}</span> : null}
        {loader}
      </div>
      {headerBtns()}
    </nav>
  )
}

export function viewOnlyBoardContent(fen: string, orientation: Color, lastMove?: string, variant?: VariantKey, wrapperClass?: string, customPieceTheme?: string) {
  const isPortrait = helper.isPortrait()
  const { vw, vh } = helper.viewportDim()
  const orientKey = 'viewonlyboard' + (isPortrait ? 'portrait' : 'landscape')
  const bounds = isPortrait ? { width: vw, height: vw } : { width: vh - 50, height: vh - 50 }
  const className = 'board_wrapper' + (wrapperClass ? ' ' + wrapperClass : '')
  const board = (
    <section className={className}>
      {h(ViewOnlyBoard, {bounds, fen, lastMove, orientation, variant, customPieceTheme})}
    </section>
  )
  if (isPortrait) {
    return h.fragment({ key: orientKey }, [
      <section className="playTable">&nbsp;</section>,
      board,
      <section className="playTable">&nbsp;</section>,
      <section className="actions_bar">&nbsp;</section>
    ])
  } else {
    return h.fragment({ key: orientKey}, [
      board,
      <section className="table" />
    ])
  }
}

export function empty(): Mithril.Children {
  return []
}

export function userStatus(user: BaseUser) {
  const status = user.online ? 'online' : 'offline'
  return (
    <div className="user">
      {user.patron ?
        <span className={'patron userStatus ' + status} data-icon="" /> :
        <span className={'fa fa-circle userStatus ' + status} />
      }
      {user.title ? <span className="userTitle">{user.title}&nbsp;</span> : null}
      {user.username}
    </div>
  )
}

export function miniUser(user: User | undefined, mini: any, isOpen: boolean, close: () => void) {
  if (user) {

    const status = userStatus(user)

    function content() {
      if (!mini || !user) {
        return (
          <div key="loading" className="miniUser">
            {spinner.getVdom()}
          </div>
        )
      }
      const curSess = session.get()
      const sessionUserId = curSess && curSess.id
      return (
        <div key="loaded" className="miniUser">
        <div className="title">
        <div className="username" oncreate={helper.ontap(() => router.set(`/@/${user.username}`))}>
        {status}
        </div>
        { user.profile && user.profile.country ?
          <p className="country">
          <img className="flag" src={utils.lichessAssetSrc('images/flags/' + user.profile.country + '.png')} />
          {countries[user.profile.country]}
          </p> : user.language ?
          <p className="language">
          <span className="fa fa-comment-o" />
          {getLanguageNativeName(user.language)}
          </p> : null
        }
        </div>
        { mini.perfs ?
          <div className="mini_perfs">
          {Object.keys(mini.perfs).map((p: PerfKey) => {
            const perf = mini.perfs[p]
            return (
              <div className="perf">
              <span data-icon={utils.gameIcon(p)} />
              {perf.games > 0 ? perf.rating + (perf.prov ? '?' : '') : '-'}
              </div>
            )
          })}
          </div> : null
        }
        { sessionUserId && mini.crosstable && mini.crosstable.nbGames > 0 ?
          <div className="yourScore">
          Your score: <span className="score">{`${mini.crosstable.users[sessionUserId]} - ${mini.crosstable.users[user.id]}`}</span>
          </div> : null
        }
        </div>
      )
    }

    return popupWidget(
      'miniUserInfos',
      undefined,
      content,
      isOpen,
      close
    )
  }

  return null
}

