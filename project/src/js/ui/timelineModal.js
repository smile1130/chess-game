import helper from './helper';
import i18n from '../i18n';
import backbutton from '../backbutton';
import timeline from '../lichess/timeline';
import { gameIcon } from '../utils';
import m from 'mithril';

const timelineModal = {};

timelineModal.isOpen = false;

timelineModal.open = function() {
  helper.analyticsTrackView('Online Friends');
  backbutton.stack.push(timelineModal.close);
  timeline.setLastReadTimestamp();
  timelineModal.isOpen = true;
};

timelineModal.close = function(fromBB) {
  if (fromBB !== 'backbutton' && timelineModal.isOpen) backbutton.stack.pop();
  timelineModal.isOpen = false;
};

const animateClose = helper.slidesOutRight(timelineModal.close, 'timelineModal');

timelineModal.view = function() {
  if (!timelineModal.isOpen) return null;

  return m('div.modal#timelineModal', { config: helper.slidesInLeft }, [
    m('header', [
      m('button.modal_close[data-icon=L]', {
        config: helper.ontouch(animateClose)
      }),
      m('h2', i18n('timeline'))
    ]),
    m('div.modal_content', {}, [
      m('div.timelineEntries.native_scroller', timeline.get().map(renderGameEnd))
    ])
  ]);

};

function renderGameEnd(entry) {
  const icon = gameIcon(entry.data.perf);
  const result = entry.data.win ? 'Victory' : 'Defeat';
  const fromNow = window.moment(entry.date).fromNow();

  return (
    <div className="list_item timelineEntry" key={entry.date} data-icon={icon}
      config={helper.ontouch(() => {
        animateClose().then(() =>
          m.route('/game/' + entry.data.playerId)
        );
      })}
    >
      <strong>{result}</strong> vs. <strong>{entry.data.opponent}</strong>
      <small><em>&nbsp;{fromNow}</em></small>
    </div>
  );
}

export default timelineModal;
