import i18n from '../../i18n';
import settings from '../../settings';
import * as chessground from 'chessground-mobile';
import BoardBrush, { Shape } from './BoardBrush';

export interface Attrs {
  data: GameData
  chessgroundCtrl: Chessground.Controller
  bounds: BoardBounds
  isPortrait: boolean
  wrapperClasses?: string
  customPieceTheme?: string
  shapes?: Shape[]
  alert?: string
}

interface State {
  boardOnCreate(vnode: Mithril.ChildNode): void
  boardOnRemove(): void
  boardTheme: string
  pieceTheme: string
}

const Board: Mithril.Component<Attrs, State> = {
  oninit(vnode) {

    const { chessgroundCtrl, bounds } = vnode.attrs;

    chessgroundCtrl.setBounds(bounds);

    function boardOnCreate({ dom }: Mithril.ChildNode) {
      if (chessgroundCtrl) {
        chessground.render(dom, chessgroundCtrl);
      }
    }

    function boardOnRemove() {
      if (chessgroundCtrl) chessgroundCtrl.unload();
    }

    vnode.state = {
      pieceTheme: settings.general.theme.piece(),
      boardTheme: settings.general.theme.board(),
      boardOnCreate,
      boardOnRemove
    };
  },

  view(vnode) {
    const { data, chessgroundCtrl, bounds, wrapperClasses, customPieceTheme, shapes, alert } = vnode.attrs;

    const boardClass = [
      'display_board',
      this.boardTheme,
      customPieceTheme || this.pieceTheme,
      data.game.variant.key
    ].join(' ');

    let wrapperClass = 'game_board_wrapper';

    if (wrapperClasses) {
      wrapperClass += ' ';
      wrapperClass += wrapperClasses;
    }

    const wrapperStyle = bounds ? {
      height: bounds.height + 'px',
      width: bounds.width + 'px'
    } : {};

    // fix nasty race condition bug when going from analysis to otb
    // TODO test that again
    if (!chessgroundCtrl) return null;

    return (
      <section className={wrapperClass} style={wrapperStyle}>
        <div className={boardClass}
          oncreate={this.boardOnCreate}
          onremove={this.boardOnRemove}
        />
        { chessgroundCtrl.data.premovable.current || chessgroundCtrl.data.predroppable.current.key ?
          <div className="board_alert">
            {i18n('premoveEnabledClickAnywhereToCancel')}
          </div> : alert ?
          <div className="board_alert">
            {alert}
          </div> : null
        }
        {
          !!shapes ?
            BoardBrush(
              bounds,
              chessgroundCtrl.data.orientation,
              shapes,
              this.pieceTheme
            ) : null
        }
      </section>
    );
  }
}

export default Board
