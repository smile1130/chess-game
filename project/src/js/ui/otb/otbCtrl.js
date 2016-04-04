import promotion from '../shared/offlineRound/promotion';
import ground from '../shared/offlineRound/ground';
import makeData from '../shared/offlineRound/data';
import replayCtrl from '../shared/offlineRound/replayCtrl';
import { setResult } from '../shared/offlineRound';
import sound from '../../sound';
import atomic from '../round/atomic';
import storage from '../../storage';
import actions from './actions';
import newGameMenu from './newOtbGame';
import helper from '../helper';
import settings from '../../settings';
import { askWorker, oppositeColor } from '../../utils';
import { setCurrentOTBGame, getCurrentOTBGame } from '../../utils/offlineGames';
import socket from '../../socket';
import m from 'mithril';

export const storageFenKey = 'otb.setupFen';

export default function controller() {

  helper.analyticsTrackView('On The Board');
  socket.createDefault();

  const chessWorker = new Worker('vendor/scalachessjs.js');

  const save = function() {
    setCurrentOTBGame({
      data: this.data,
      situations: this.replay.situations,
      ply: this.replay.ply
    });
  }.bind(this);

  const onPromotion = function(orig, dest, role) {
    this.replay.addMove(orig, dest, role);
  }.bind(this);

  const userMove = function(orig, dest) {
    if (!promotion.start(this, orig, dest, onPromotion)) {
      this.replay.addMove(orig, dest);
    }
  }.bind(this);

  const onMove = function(orig, dest, capturedPiece) {
    if (capturedPiece) {
      if (this.data.game.variant.key === 'atomic') {
        atomic.capture(this.chessground, dest);
        sound.explosion();
      }
      else sound.capture();
    } else sound.move();
  }.bind(this);

  this.onReplayAdded = function() {
    save();
    m.redraw();
    const sit = this.replay.situation();
    if (sit.status && sit.status.id >= 30) setTimeout(function() {
      setResult(this);
      this.chessground.stop();
      this.actions.open();
      save();
      m.redraw();
    }.bind(this), 1000);
  }.bind(this);

  this.actions = new actions.controller(this);
  this.newGameMenu = new newGameMenu.controller(this);

  this.init = function(data, situations, ply) {
    this.actions.close();
    this.newGameMenu.close();
    this.data = data || makeData({
      pref: {
        centerPiece: true
      }
    });
    if (!this.chessground)
      this.chessground = ground.make(this.data, this.data.game.fen, userMove, onMove);
    else ground.reload(this.chessground, this.data, this.data.game.fen);
    if (!this.replay) this.replay = new replayCtrl(this, situations, ply, chessWorker);
    else this.replay.init(situations, ply);
    this.replay.apply();
    m.redraw();
  }.bind(this);

  this.startNewGame = function() {
    askWorker(chessWorker, {
      topic: 'init',
      payload: {
        variant: settings.otb.variant()
      }
    }).then(data => {
      console.log(data);
      this.init(makeData({
        variant: data.variant,
        fen: data.setup.fen,
        color: oppositeColor(this.data.player.color),
        pref: {
          centerPiece: true
        }
      }));
    });
  }.bind(this);

  this.jump = function(ply) {
    this.chessground.cancelMove();
    if (this.replay.ply === ply || ply < 0 || ply >= this.replay.situations.length) return;
    this.replay.ply = ply;
    this.replay.apply();
  }.bind(this);

  this.forward = function() {
    this.jump(this.replay.ply + 1);
  }.bind(this);

  this.backward = function() {
    this.jump(this.replay.ply - 1);
  }.bind(this);

  this.firstPly = () => 0;

  const setupFen = storage.get(storageFenKey);
  const saved = getCurrentOTBGame();
  if (setupFen) {
    this.init(makeData({
      fen: setupFen,
      color: 'white',
      pref: {
        centerPiece: true
      }
    }));
    storage.remove(storageFenKey);
  } else if (saved) {
    this.init(saved.data, saved.situations, saved.ply);
  }
  else this.init();

  window.plugins.insomnia.keepAwake();

  this.onunload = function() {
    window.plugins.insomnia.allowSleepAgain();
    if (this.chessground) {
      this.chessground.onunload();
    }
    if (this.replay) {
      this.replay.onunload();
    }
  };
}
