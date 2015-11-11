import layout from '../layout';
import { header } from '../shared/common';
import { renderBoard } from '../round/view/roundView';
import drag from './drag';
import helper from '../helper';
import i18n from '../../i18n';
import menu from './menu';
import continuePopup from './continuePopup';
import settings from '../../settings';
import m from 'mithril';

function sparePieces(ctrl, color, orientation, position) {
  return m('div', {
    className: ['sparePieces', position, 'orientation-' + orientation, color].join(' ')
  }, ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].map(function(role) {
    return m('div.sparePieceWrapper', m('div', {
      className: 'cg-piece ' + color + ' ' + role,
      'data-color': color,
      'data-role': role
    }));
  }));
}

export default function view(ctrl) {
  const color = ctrl.chessground.data.orientation;
  const opposite = color === 'white' ? 'black' : 'white';

  function editorConfig(el, isUpdate, context) {
    if (isUpdate) return;
    const onstart = drag.bind(undefined, ctrl);
    document.addEventListener('touchstart', onstart);
    context.onunload = function() {
      document.removeEventListener('touchstart', onstart);
    };
  }

  function content() {
    if (helper.isPortrait())
      return m('div.editor', {
        className: settings.general.theme.piece(),
        config: editorConfig
      }, [
        sparePieces(ctrl, opposite, color, 'top'),
        renderBoard(ctrl),
        sparePieces(ctrl, color, color, 'bottom'),
        renderActionsBar(ctrl)
      ]);
    else
      return m('div.editor', {
        config: editorConfig
      }, [
        renderBoard(ctrl),
        m('section.table', { key: 'table' }, [
          sparePieces(ctrl, opposite, color, 'top'),
          sparePieces(ctrl, color, color, 'bottom')
        ]),
        renderActionsBar(ctrl)
      ]);
  }

  function overlay() {
    return [
      menu.view(ctrl.menu),
      continuePopup.view(ctrl.continuePopup)
    ];
  }

  return layout.board(
    header.bind(undefined, i18n('boardEditor')),
    content,
    overlay
  );
}

function renderActionsBar(ctrl) {
  return m('section#training_actions', [
    m('button.training_action.fa.fa-ellipsis-h', {
      key: 'editorMenu',
      config: helper.ontouch(ctrl.menu.open)
    }),
    m('button.training_action[data-icon=B]', {
      config: helper.ontouch(ctrl.chessground.toggleOrientation)
    }),
    m('button.training_action[data-icon=U]', {
      config: helper.ontouch(() => {
        ctrl.continuePopup.open(ctrl.computeFen());
      }, () => window.plugins.toast.show(i18n('continueFromHere'), 'short', 'center'))
    }),
    m('button.training_action.fa.fa-share-alt', {
      key: 'sharePosition',
      config: helper.ontouch(
        () => window.plugins.socialsharing.share(ctrl.computeFen()),
        () => window.plugins.toast.show('Share FEN', 'short', 'bottom')
      )
    })
  ]);
}

