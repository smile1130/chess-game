import last from 'lodash/array/last';
import chessground from 'chessground';
import { partialf } from '../../utils';
import data from './data';
import chess from './chess';
import puzzle from './puzzle';
import { getCurrent } from './database';
import sound from '../../sound';
import actions from './actions';

export default function ctrl() {

  var userMove = function(orig, dest) {
    var res = puzzle.tryMove(this.data, [orig, dest]);
    var newProgress = res[0];
    var newLines = res[1];
    var lastMove = last(newProgress);
    var promotion = lastMove ? lastMove[4] : undefined;
    m.startComputation();
    switch (newLines) {
      case 'retry':
        setTimeout(partialf(this.revert, this.data.puzzle.id), 500);
        this.data.comment = 'retry';
        break;
      case 'fail':
        setTimeout(function() {
          if (this.data.mode === 'play') {
            this.chessground.stop();
          } else this.revert(this.data.puzzle.id);
        }.bind(this), 500);
        this.data.comment = 'fail';
        break;
      default:
        this.userFinalizeMove([orig, dest, promotion], newProgress);
        if (newLines === 'win') {
          this.chessground.stop();
        } else setTimeout(partialf(this.playOpponentNextMove, this.data.puzzle.id), 1000);
        break;
    }
    m.endComputation(); // give feedback ASAP, don't wait for delayed action
  }.bind(this);

  var onMove = function(orig, dest, captured) {
    if (captured) sound.capture();
    else sound.move();
  };

  this.revert = function(id) {
    if (id !== this.data.puzzle.id) return;
    this.chessground.set({
      fen: this.data.chess.fen(),
      lastMove: chess.lastMove(this.data.chess),
      turnColor: this.data.puzzle.color,
      check: null,
      movable: {
        dests: this.data.chess.dests()
      }
    });
    m.redraw();
    if (this.data.chess.in_check()) this.chessground.setCheck();
  }.bind(this);

  this.userFinalizeMove = function(move, newProgress) {
    chess.move(this.data.chess, move);
    this.data.comment = 'great';
    this.data.progress = newProgress;
    this.chessground.set({
      fen: this.data.chess.fen(),
      lastMove: move,
      turnColor: this.data.puzzle.opponentColor,
      check: null
    });
    if (this.data.chess.in_check()) this.chessground.setCheck();
  }.bind(this);

  this.playOpponentMove = function(move) {
    onMove(move[0], move[1], this.chessground.data.pieces[move[1]]);
    m.startComputation();
    chess.move(this.data.chess, move);
    this.chessground.set({
      fen: this.data.chess.fen(),
      lastMove: move,
      movable: {
        dests: this.data.chess.dests()
      },
      turnColor: this.data.puzzle.color,
      check: null
    });
    if (this.data.chess.in_check()) this.chessground.setCheck();
    setTimeout(this.chessground.playPremove, this.chessground.data.animation.duration);
    m.endComputation();
  }.bind(this);

  this.playOpponentNextMove = function(id) {
    if (id !== this.data.puzzle.id) return;
    var move = puzzle.getOpponentNextMove(this.data);
    this.playOpponentMove(puzzle.str2move(move));
    this.data.progress.push(move);
  }.bind(this);

  this.playInitialMove = function(id) {
    if (id !== this.data.puzzle.id) return;
    this.playOpponentMove(this.data.puzzle.move);
  }.bind(this);

  this.jump = function(to) {
    chessground.anim(puzzle.jump, this.chessground.data)(this.data, to);
  }.bind(this);

  this.init = function() {
    this.data = data({
      puzzle: getCurrent(),
      mode: 'play'
    });
    if (this.actions) this.actions.close();
    else this.actions = new actions.controller(this);
    // chessground.board.reset(this.chessground.data);
    // chessground.anim(puzzle.reload, this.chessground.data)(this.data, cfg);
    var chessgroundConf = {
      fen: this.data.puzzle.fen,
      orientation: this.data.puzzle.color,
      turnColor: this.data.puzzle.opponentColor,
      movable: {
        free: false,
        color: this.data.mode !== 'view' ? this.data.puzzle.color : null,
        events: {
          after: userMove
        }
      },
      events: {
        move: onMove
      },
      animation: {
        enabled: true,
        duration: 300
      },
      premovable: {
        enabled: true
      }
    };
    if (this.chessground) this.chessground.set(chessgroundConf);
    else this.chessground = new chessground.controller(chessgroundConf);
    if (this.data.mode !== 'view')
      setTimeout(this.playInitialMove.bind(this, this.data.puzzle.id), 1000);
  }.bind(this);

  this.init();
}
