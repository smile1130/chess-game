import { connectingHeader, viewOnlyBoardContent } from './shared/common';
import layout from './layout';
import helper from './helper';
import { handleXhrError } from '../utils';
import * as xhr from '../xhr';
import settings from '../settings';
import roundCtrl from './round/roundCtrl';
import roundView from './round/view/roundView';
import m from 'mithril';

export default {
  oninit(vnode) {
    helper.analyticsTrackView('TV');

    function onChannelChange() {
      m.route.set('/tv');
    }

    function onFeatured(o) {
      xhr.game(o.id, o.color)
      .run(data => {
        // m.redraw.strategy('all');
        if (this.round) this.round.onunload();
        data.tv = settings.tv.channel();
        this.round = new roundCtrl(vnode, data, onFeatured, onChannelChange);
      })
      .catch(handleXhrError);
    }

    xhr.featured(settings.tv.channel(), vnode.attrs.flip)
    .run(data => {
      data.tv = settings.tv.channel();
      this.round = new roundCtrl(vnode, data, onFeatured, onChannelChange);
    })
    .catch(error => {
      handleXhrError(error);
      m.route.set('/');
    });
  },

  view() {

    if (this.round) return roundView(this.round);

    const header = connectingHeader.bind(undefined, 'Lichess TV');

    return layout.board(header, viewOnlyBoardContent);
  }
};
