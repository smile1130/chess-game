import i18n from '../../i18n';
import settings from '../../settings';
import formWidgets from '../shared/form';
import { renderEndedGameStatus } from '../shared/offlineRound';
import popupWidget from '../shared/popup';
import backbutton from '../../backbutton';
import m from 'mithril';

const colors = [
  ['white', 'white'],
  ['black', 'black'],
  ['randomColor', 'random']
];

export function opponentSelector() {
  return (
    <div className="select_input">
      {formWidgets.renderSelect('opponent', 'opponent', settings.ai.availableOpponents, settings.ai.opponent)}
    </div>
  );
}

export function sideSelector() {
  return (
    <div className="select_input">
      {formWidgets.renderSelect('side', 'color', colors, settings.ai.color)}
    </div>
  );
}

function renderAlways() {
  return [
    m('div.action', [
      sideSelector(),
      opponentSelector()
    ])
  ];
}

export default {

  controller: function(root) {
    let isOpen = false;

    function open() {
      backbutton.stack.push(close);
      isOpen = true;
    }

    function close(fromBB) {
      if (fromBB !== 'backbutton' && isOpen) backbutton.stack.pop();
      isOpen = false;
    }

    return {
      open: open,
      close: close,
      isOpen: function() {
        return isOpen;
      },
      sharePGN: function() {
        window.plugins.socialsharing.share(root.replay.pgn());
      },
      root: root
    };
  },

  view: function(ctrl) {
    return popupWidget(
      'offline_actions',
      () => <div><span className="fa fa-cogs" />{i18n('playOfflineComputer')}</div>,
      function() {
        return [
          renderEndedGameStatus(ctrl)
        ].concat(
          renderAlways(ctrl)
        );
      },
      ctrl.isOpen(),
      ctrl.close
    );
  }
};
