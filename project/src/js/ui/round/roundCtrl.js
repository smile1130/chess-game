import { throttle } from 'lodash/function';
import data from './data';
import utils from '../../utils';
import sound from '../../sound';
import gameApi from '../../lichess/game';
import ground from './ground';
import promotion from './promotion';
import chat from './chat';
import clockCtrl from './clock/clockCtrl';
import i18n from '../../i18n';
import gameStatus from '../../lichess/status';
import correspondenceClockCtrl from './correspondenceClock/correspondenceCtrl';
import menu from '../menu';
import session from '../../session';
import socket from '../../socket';
import socketHandler from './socketHandler';
import signals from '../../signals';
import atomic from './atomic';
import backbutton from '../../backbutton';
import helper from '../helper';
import xhr from './roundXhr';

export default function controller(cfg, onFeatured) {

  helper.analyticsTrackView('Round');

  this.data = data(cfg);

  this.firstPly = function() {
    return this.data.steps[0].ply;
  }.bind(this);

  this.lastPly = function() {
    return this.data.steps[this.data.steps.length - 1].ply;
  }.bind(this);

  this.plyStep = function(ply) {
    return this.data.steps[ply - this.firstPly()];
  }.bind(this);

  this.vm = {
    connectedWS: true,
    flip: false,
    showingActions: false,
    ply: this.lastPly()
  };

  socket.createGame(
    this.data.url.socket,
    this.data.player.version,
    socketHandler(this, onFeatured),
    this.data.url.round
  );

  this.showActions = function() {
    menu.close();
    backbutton.stack.push(this.hideActions);
    this.vm.showingActions = true;
  }.bind(this);

  this.hideActions = function(fromBB) {
    if (fromBB !== 'backbutton' && this.vm.showingActions) backbutton.stack.pop();
    this.vm.showingActions = false;
  }.bind(this);

  this.flip = function() {
    if (this.data.tv) {
      if (m.route.param('flip')) m.route('/tv');
      else m.route('/tv?flip=1');
      return;
    } else if (this.data.player.spectator) {
      m.route('/game/' + this.data.game.id + '/' +
        utils.oppositeColor(this.data.player.color));
      return;
    }
    this.vm.flip = !this.vm.flip;
    this.chessground.set({
      orientation: this.vm.flip ? this.data.opponent.color : this.data.player.color
    });
  }.bind(this);

  this.replaying = function() {
    return this.vm.ply !== this.lastPly();
  }.bind(this);

  this.jump = function(ply) {
    if (ply < this.firstPly() || ply > this.lastPly()) return;
    this.vm.ply = ply;
    var s = this.plyStep(ply);
    var config = {
      fen: s.fen,
      lastMove: s.uci ? [s.uci.substr(0, 2), s.uci.substr(2, 2)] : null,
      check: s.check,
      turnColor: this.vm.ply % 2 === 0 ? 'white' : 'black'
    };
    if (this.replaying()) this.chessground.stop();
    else config.movable = {
      color: gameApi.isPlayerPlaying(this.data) ? this.data.player.color : null,
      dests: gameApi.parsePossibleMoves(this.data.possibleMoves)
    };
    this.chessground.set(config);
  }.bind(this);

  this.jumpNext = function() {
    this.jump(this.vm.ply + 1);
  }.bind(this);

  this.jumpPrev = function() {
    this.jump(this.vm.ply - 1);
  }.bind(this);

  this.jumpFirst = function() {
    this.jump(this.firstPly());
  }.bind(this);

  this.jumpLast = function() {
    this.jump(this.lastPly());
  }.bind(this);

  this.setTitle = function() {
    if (this.data.tv)
      this.title = 'Lichess TV';
    else if (gameStatus.finished(this.data))
      this.title = i18n('gameOver');
    else if (gameStatus.aborted(this.data))
      this.title = i18n('gameAborted');
    else if (gameApi.isPlayerTurn(this.data))
      this.title = i18n('yourTurn');
    else if (gameApi.isOpponentTurn(this.data))
      this.title = i18n('waitingForOpponent');
    else
      this.title = 'lichess.org';
  };
  this.setTitle();

  this.sendMove = function(orig, dest, prom) {
    var move = {
      from: orig,
      to: dest
    };
    if (prom) move.promotion = prom;
    if (this.clock && socket.getAverageLag() !== undefined)
      move.lag = Math.round(socket.getAverageLag());
    socket.send('move', move, { ackable: true });
  };

  var userMove = function(orig, dest, meta) {
    if (!promotion.start(this, orig, dest, meta.premove)) this.sendMove(orig, dest);
    if (this.data.game.speed === 'correspondence' && session.isConnected())
      session.refresh();
  }.bind(this);

  var onMove = function(orig, dest, capturedPiece) {
    if (capturedPiece) {
      if (this.data.game.variant.key === 'atomic') {
        atomic.capture(this, dest);
        sound.explosion();
      }
      else sound.capture();
    } else sound.move();
  }.bind(this);

  this.apiMove = function(o) {
    m.startComputation();
    let d = this.data;
    d.game.turns = o.ply;
    d.game.player = o.ply % 2 === 0 ? 'white' : 'black';
    const playedColor = o.ply % 2 === 0 ? 'black' : 'white';
    if (o.status) d.game.status = o.status;
    d[d.player.color === 'white' ? 'player' : 'opponent'].offeringDraw = o.wDraw;
    d[d.player.color === 'black' ? 'player' : 'opponent'].offeringDraw = o.bDraw;
    d.possibleMoves = d.player.color === d.game.player ? o.dests : null;
    this.setTitle();

    if (!this.replaying()) {
      this.vm.ply++;
      this.chessground.apiMove(o.uci.substr(0, 2), o.uci.substr(2, 2));

      if (o.enpassant) {
        let p = o.enpassant;
        let pieces = {};
        pieces[p.key] = null;
        this.chessground.setPieces(pieces);
        if (d.game.variant.key === 'atomic') atomic.enpassant(this, p.key, p.color);
        sound.capture();
      }

      if (o.promotion) ground.promote(this.chessground, o.promotion.key, o.promotion.pieceClass);

      if (o.castle && !this.chessground.data.autoCastle) {
        let c = o.castle;
        let pieces = {};
        pieces[c.king[0]] = null;
        pieces[c.rook[0]] = null;
        pieces[c.king[1]] = {
          role: 'king',
          color: c.color
        };
        pieces[c.rook[1]] = {
          role: 'rook',
          color: c.color
        };
        this.chessground.setPieces(pieces);
      }

      this.chessground.set({
        turnColor: d.game.player,
        movable: {
          dests: gameApi.isPlayerPlaying(d) ? gameApi.parsePossibleMoves(d.possibleMoves) : {}
        },
        check: o.check
      });

      if (playedColor !== d.player.color) {
        // atrocious hack to prevent race condition
        // with explosions and premoves
        // https://github.com/ornicar/lila/issues/343
        if (d.game.variant.key === 'atomic') setTimeout(this.chessground.playPremove, 100);
        else this.chessground.playPremove();
      }
    }

    if (o.clock) {
      let c = o.clock;
      if (this.clock) this.clock.update(c.white, c.black);
      else if (this.correspondenceClock) this.correspondenceClock.update(c.white, c.black);
    }

    d.game.threefold = !!o.threefold;
    d.steps.push({
      ply: this.lastPly() + 1,
      fen: o.fen,
      san: o.san,
      uci: o.uci,
      check: o.check
    });
    gameApi.setOnGame(d, playedColor, true);
    m.endComputation();
  }.bind(this);

  this.chessground = ground.make(this.data, cfg.game.fen, userMove, onMove);

  this.clock = this.data.clock ? new clockCtrl(
    this.data.clock,
    this.data.player.spectator ? function() {} : throttle(function() {
      socket.send('outoftime');
    }, 500),
    this.data.player.spectator ? null : this.data.player.color
  ) : false;

  this.isClockRunning = function() {
    return this.data.clock && gameApi.playable(this.data) &&
      ((this.data.game.turns - this.data.game.startedAtTurn) > 1 || this.data.clock.running);
  }.bind(this);

  this.clockTick = function() {
    if (this.isClockRunning()) this.clock.tick(this.data.game.player);
  }.bind(this);

  var makeCorrespondenceClock = function() {
    if (this.data.correspondence && !this.correspondenceClock)
      this.correspondenceClock = new correspondenceClockCtrl(
        this,
        this.data.correspondence,
        () => socket.send('outoftime')
      );
  }.bind(this);
  makeCorrespondenceClock();

  var correspondenceClockTick = function() {
    if (this.correspondenceClock && gameApi.playable(this.data))
      this.correspondenceClock.tick(this.data.game.player);
  }.bind(this);

  var clockIntervId;
  if (this.clock) clockIntervId = setInterval(this.clockTick, 100);
  else clockIntervId = setInterval(correspondenceClockTick, 1000);

  this.chat = (this.data.opponent.ai || this.data.player.spectator) ?
    null : new chat.controller(this);

  this.reload = function(rCfg) {
    if (stepsHash(rCfg.steps) !== stepsHash(this.data.steps))
      this.vm.ply = rCfg.steps[rCfg.steps.length - 1].ply;
    if (this.chat) this.chat.onReload(rCfg.chat);
    if (this.data.tv) rCfg.tv = true;
    this.data = data(rCfg);
    makeCorrespondenceClock();
    this.setTitle();
    if (!this.replaying()) ground.reload(this.chessground, this.data, rCfg.game.fen, this.vm.flip);
  }.bind(this);

  window.plugins.insomnia.keepAwake();

  var onConnected = function() {
    var wasOff = !this.vm.connectedWS;
    this.vm.connectedWS = true;
    if (wasOff) m.redraw();
  }.bind(this);

  var onDisconnected = function() {
    var wasOn = this.vm.connectedWS;
    this.vm.connectedWS = false;
    if (wasOn) setTimeout(function() {
      m.redraw();
    }, 2000);
  }.bind(this);

  var onResume = function() {
    xhr.reload(this).then(this.reload);
  }.bind(this);

  signals.socket.connected.add(onConnected);
  signals.socket.disconnected.add(onDisconnected);
  document.addEventListener('resume', onResume);

  this.onunload = function() {
    socket.destroy();
    if (clockIntervId) clearInterval(clockIntervId);
    if (this.chat) this.chat.onunload();
    if (this.clock) this.clock.onunload();
    signals.socket.connected.remove(onConnected);
    signals.socket.disconnected.remove(onDisconnected);
    document.removeEventListener('resume', onResume);
    window.plugins.insomnia.allowSleepAgain();
  };
}

function stepsHash(steps) {
  var h = '';
  for (var i in steps) {
    h += steps[i].san;
  }
  return h;
}
