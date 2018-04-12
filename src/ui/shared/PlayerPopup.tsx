import router from '../../router'
import * as utils from '../../utils'
import countries from '../../utils/countries'
import { getLanguageNativeName } from '../../utils/langs'
import session from '../../session'
import spinner from '../../spinner'
import { playerName } from '../../lichess/player'
import { Player } from '../../lichess/interfaces/game'
import { Score } from '../../lichess/interfaces/user'
import * as helper from '../helper'

import popupWidget from './popup'
import { userStatus } from './common'

interface Attrs {
  readonly player: Player
  readonly opponent: Player
  readonly mini: any
  readonly isOpen: boolean
  readonly close: () => void
  readonly score?: Score
}

export default {

  view({ attrs }) {
    const { player, mini, isOpen, close, opponent, score } = attrs
    const user = player.user
    const oppUser = opponent.user

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
        const showYourScore = sessionUserId && mini.crosstable && mini.crosstable.nbGames > 0
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
            { sessionUserId !== undefined && showYourScore ?
              <div className="score_wrapper">
                Your score: <span className="score">{`${mini.crosstable.users[sessionUserId]} - ${mini.crosstable.users[user.id]}`}</span>
              </div> : null
            }
            { !showYourScore && oppUser && score && score.nbGames > 0 ?
              <div className="score_wrapper">
                Lifetime score <em>vs</em> {playerName(opponent)}:
                <br/>
                <span className="score">{score.users[user.id]}</span> - <span className="score">{score.users[oppUser.id]}</span>
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
} as Mithril.Component<Attrs, {}>
