import { getLichessVariant, getInitialFen } from '../../lichess/variant';
import { playerFromFen, plyFromFen } from '../../utils/fen';
import { oppositeColor } from '../../utils';
import { AnalysisData } from './interfaces';

const emptyPocket = {
  queen: 0,
  rook: 0,
  knight: 0,
  bishop: 0,
  pawn: 0
}

export function makeDefaultData(fen: string, variantKey: VariantKey): AnalysisData {
  const player = playerFromFen(fen);
  const ply = plyFromFen(fen);
  const variant = getLichessVariant(variantKey);

  const initialFen = fen || getInitialFen(variantKey);

  return {
    game: {
      fen: fen || initialFen,
      id: 'synthetic',
      initialFen: fen || initialFen,
      player,
      source: 'offline',
      status: {
        id: 10,
        name: 'created'
      },
      turns: 0,
      variant
    },
    opponent: {
      id: oppositeColor(player),
      color: oppositeColor(player)
    },
    player: {
      color: player,
      id: player
    },
    pref: {
      animationDuration: 300,
      destination: true,
      highlight: true
    },
    steps: [
      {
        fen: initialFen,
        ply,
        san: null,
        uci: null,
        check: false,
        pgnMoves: [],
        crazy: variantKey === 'crazyhouse' ? {
          pockets: [emptyPocket, emptyPocket]
        } : undefined
      }
    ]
  };
}
