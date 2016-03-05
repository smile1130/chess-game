export function makeData(from) {

  const data = from;

  if (data.game.moves) data.game.moves = data.game.moves.split(' ');
  else data.game.moves = [];

  if (!data.game.moveTimes) data.game.moveTimes = [];

  return data;
}

export function makeDefaultData(fen) {
  return {
    game: {
      fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      id: 'synthetic',
      initialFen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      opening: null,
      player: 'white',
      status: {
        id: 10,
        name: 'created'
      },
      turns: 0,
      variant: {
        key: 'standard',
        name: 'Standard',
        short: 'Std',
        title: 'Standard rules of chess (FIDE)'
      }
    },
    opponent: {
      color: 'black'
    },
    orientation: 'white',
    path: 0,
    player: {
      color: 'white',
      id: null
    },
    pref: {
      animationDuration: 300,
      destination: true,
      highlight: true
    },
    steps: [
      {
        fen: fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        ply: 0,
        san: null,
        uci: null
      }
    ],
    userAnalysis: true
  };
}
