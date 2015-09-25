import last from 'lodash/array/last';
import chessground from 'chessground';
import { partialf } from '../../utils';
import data from './data';
import chess from './chess';
import puzzle from './puzzle';
import sound from '../../sound';
import settings from '../../settings';
import menu from './menu';
import * as xhr from './xhr';
import m from 'mithril';
import helper from '../helper';
import socket from '../../socket';

export default function ctrl() {

  helper.analyticsTrackView('Puzzle');
  socket.createDefault();

  this.data = null;

  this.menu = menu.controller(this);

  var attempt = function(winFlag) {
    xhr.attempt(this.data.puzzle.id, this.data.startedAt, winFlag)
      .then(function(cfg) {
        cfg.progress = this.data.progress;
        this.reload(cfg);
      }.bind(this));
  }.bind(this);

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
            attempt(false);
          } else this.revert(this.data.puzzle.id);
        }.bind(this), 500);
        this.data.comment = 'fail';
        break;
      default:
        this.userFinalizeMove([orig, dest, promotion], newProgress);
        if (newLines === 'win') {
          setTimeout(function() {
            this.chessground.stop();
            attempt(true);
          }.bind(this), 300);
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
    if (puzzle.getCurrentLines(this.data) == 'win')
      setTimeout(() => attempt(true), 300);
  }.bind(this);

  this.playInitialMove = function(id) {
    if (id !== this.data.puzzle.id) return;
    this.playOpponentMove(this.data.puzzle.initialMove);
    this.data.startedAt = new Date();
  }.bind(this);

  this.giveUp = function() {
    attempt(false);
  }.bind(this);

  this.jump = function(to) {
    const history = this.data.replay.history;
    const step = this.data.replay.step;
    if (!(step !== to && to >= 0 && to < history.length)) return;
    chessground.anim(puzzle.jump, this.chessground.data)(this.data, to);
  }.bind(this);

  this.jumpPrev = function() {
    this.jump(this.data.replay.step - 1);
  }.bind(this);

  this.jumpNext = function() {
    this.jump(this.data.replay.step + 1);
  }.bind(this);

  this.initiate = function() {
    if (this.data.mode !== 'view')
      setTimeout(this.playInitialMove.bind(this, this.data.puzzle.id), 1000);
  }.bind(this);

  this.reload = function(cfg) {
    this.data = data(cfg);
    chessground.board.reset(this.chessground.data);
    chessground.anim(puzzle.reload, this.chessground.data)(this.data, cfg);
    this.initiate();
  }.bind(this);

  this.init = function(cfg) {
    this.data = data(cfg);
    var chessgroundConf = {
      fen: this.data.puzzle.fen,
      orientation: this.data.puzzle.color,
      turnColor: this.data.puzzle.opponentColor,
      movable: {
        free: false,
        color: this.data.mode !== 'view' ? this.data.puzzle.color : null,
        showDests: settings.general.pieceDestinations(),
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
      },
      draggable: {
        distance: 3,
        squareTarget: true
      }
    };
    if (this.chessground) this.chessground.set(chessgroundConf);
    else this.chessground = new chessground.controller(chessgroundConf);
    this.initiate();
  }.bind(this);

  this.newPuzzle = function() {
    xhr.newPuzzle().then(this.init);
  }.bind(this);

  this.retry = function() {
    xhr.retry(this.data.puzzle.id).then(this.reload);
  }.bind(this);

  this.setDifficulty = function(id) {
    xhr.setDifficulty(id);
  };

  this.newPuzzle();

  window.plugins.insomnia.keepAwake();

  this.onunload = function() {
    socket.destroy();
    window.plugins.insomnia.allowSleepAgain();
  };

}
