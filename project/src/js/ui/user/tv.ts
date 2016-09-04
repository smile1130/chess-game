import * as m from 'mithril';
import router from '../../router';
import helper from '../helper';
import { handleXhrError } from '../../utils';
import { LoadingBoard } from '../shared/common';
import OnlineRound from '../shared/round/OnlineRound';
import roundView from '../shared/round/view/roundView';
import { tv } from './userXhr';

interface Attrs {
  id: string;
}

export default {
  oninit(vnode: Mithril.Vnode<Attrs>) {
    helper.analyticsTrackView('TV');

    const userId = vnode.attrs.id;
    const onRedirect = () => router.set(`/@/${userId}/tv`, true);

    tv(userId)
    .then(data => {
      data.userTV = userId;
      this.round = new OnlineRound(data.game.id, data, false, null, null, userId, onRedirect);
    })
    .catch(handleXhrError);
  },

  oncreate: helper.viewFadeIn,

  onremove() {
    window.plugins.insomnia.allowSleepAgain();
    if (this.round) {
      this.round.unload();
    }
  },

  view() {
    if (this.round) {
      return roundView(this.round);
    } else {
      return m(LoadingBoard);
    }
  }
};
