import * as helper from '../../helper'

import AnalyseCtrl from '../AnalyseCtrl'


export default function renderActionsBar(ctrl: AnalyseCtrl) {

  return (
    <section className="actions_bar analyse_actions_bar">
      <button key="analyseMenu"
        className={'action_bar_button fa ' + (ctrl.retroGlowing ? 'fa-play glow' : 'fa-ellipsis-v')}
        oncreate={helper.ontap(ctrl.study ? ctrl.study.actionMenu.open : ctrl.menu.open)}
      />
      {ctrl.study || ctrl.ceval.allowed ?
        <button className="action_bar_button fa fa-gear" key="analyseSettings"
          oncreate={helper.ontap(ctrl.settings.open)}
        /> : null
      }
      {ctrl.study && ctrl.study.chat ?
        <button className="action_bar_button fa fa-comments withChip" key="chat"
          oncreate={helper.ontap(ctrl.study.chat.open)}
        >
          { ctrl.study.chat.nbUnread > 0 ?
          <span className="chip">
            { ctrl.study.chat.nbUnread <= 99 ? ctrl.study.chat.nbUnread : 99 }
          </span> : null
          }
        </button> : null
      }
      <button className={'action_bar_button fa fa-' + (ctrl.settings.s.smallBoard ? 'compress' : 'expand')} key="expand-compress"
        oncreate={helper.ontap(
          ctrl.settings.toggleBoardSize,
          () => window.plugins.toast.show('Expand/compress board', 'short', 'bottom')
        )}
      />
      <button key="backward" className="action_bar_button fa fa-backward"
        oncreate={helper.ontap(ctrl.stoprewind, undefined, ctrl.rewind)}
      />
      <button key="forward" className="action_bar_button fa fa-forward"
        disabled={!!ctrl.retro}
        oncreate={helper.ontap(ctrl.stopff, undefined, ctrl.fastforward)}
      />
      { ctrl.study ?
        <button key="forward" className="action_bar_button fa fa-bars"
          oncreate={helper.ontap(ctrl.study.sideMenu.open)}
        /> : null
      }
    </section>
  )
}
