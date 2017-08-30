var socketInstance;

var strongSocketDefaults = {
  params: {
    sri: 'overrideMe',
    mobile: 1
  },
  options: {
    name: 'unnamed',
    pingMaxLag: 8000, // time to wait for pong before reseting the connection
    pingDelay: 2000, // time between pong and ping
    autoReconnectDelay: 2000,
    ignoreUnknownMessages: true,
    sendOnOpen: null, // message to send on socket open
    registeredEvents: []
  }
};

function StrongSocket(clientId, socketEndPoint, url, version, settings) {
  this.settings = deepmerge(strongSocketDefaults, settings);
  this.settings.params.sri = clientId;
  this.socketEndPoint = socketEndPoint;
  this.url = url;
  this.version = version;
  this.options = this.settings.options;
  this.ws = null;
  this.pingSchedule = null;
  this.connectSchedule = null;
  this.ackableMessages = [];
  this.lastPingTime = Date.now();
  this.pongCount = 0;
  this.currentLag = 0;
  this.averageLag = 0;
  this.autoReconnect = true;
  this.tryAnotherUrl = false;

  this.debug('Debug is enabled');
  this.connect();
}

StrongSocket.prototype = {

  connect: function() {
    var self = this;

    // be sure any previous ws instance is closed
    clearTimeout(self.pingSchedule);
    clearTimeout(self.connectSchedule);
    if (self.ws) self.ws.close();

    self.autoReconnect = true;
    var fullUrl = self.socketEndPoint + self.url + '?' + serializeQueryParameters(self.settings.params);
    self.debug('connection attempt to ' + fullUrl, true);

    self.ws = new WebSocket(fullUrl);
    self.ws.onerror = function(e) {
      self.onError(e);
    };
    self.ws.onclose = function() {
      self.debug('connection closed');
      postMessage({ topic: 'disconnected' });
      if (self.autoReconnect) {
        self.debug('Will autoreconnect in ' + self.options.autoReconnectDelay);
        self.scheduleConnect(self.options.autoReconnectDelay);
      }
    };
    self.ws.onopen = function() {
      self.debug('connected to ' + fullUrl, true);
      postMessage({ topic: 'onOpen' });
      if (self.options.sendOnOpen) self.options.sendOnOpen.forEach(function(x) { self.send(x.t, x.d, x.o); });
      self.onSuccess();
      self.pingNow();
      var resend = self.ackableMessages;
      self.ackableMessages = [];
      resend.forEach(function(x) { self.send(x.t, x.d); });
    };
    self.ws.onmessage = function(e) {
      var msg = JSON.parse(e.data);
      var mData = msg.d || [];

      if (msg.t === 'n') self.pong();
      else self.debug(e.data);

      if (msg.t === 'b') mData.forEach(function(x) { self.handle(x); });
      else self.handle(msg);
    };
    self.scheduleConnect(self.options.pingMaxLag);
  },

  isOpen: function() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  },

  setVersion: function(version) {
    this.version = version;
    this.connect();
  },

  send: function(t, d, o) {
    var self = this;
    var data = d || {},
    options = o || {};
    if (options.withLag) {
      d.l = Math.round(self.averageLag);
    }
    if (options.millis !== undefined) {
      d.s = Math.floor(options.millis * 0.1).toString(36);
    }
    if (options.ackable) {
      self.ackableMessages.push({
        t: t,
        d: d
      });
    }
    var message = JSON.stringify({
      t: t,
      d: data
    });
    self.debug('send ' + message);
    try {
      self.ws.send(message);
    } catch (e) {
      self.debug(e);
    }
  },

  sendAckable: function(t, d) {
    this.send(t, d, { ackable: true });
  },

  scheduleConnect: function(delay) {
    var self = this;
    // self.debug('schedule connect ' + delay);
    clearTimeout(self.pingSchedule);
    clearTimeout(self.connectSchedule);
    self.connectSchedule = setTimeout(function() {
      postMessage({ topic: 'disconnected' });
      self.tryAnotherUrl = true;
      self.connect();
    }, delay);
  },

  schedulePing: function(delay) {
    var self = this;
    clearTimeout(self.pingSchedule);
    self.pingSchedule = setTimeout(function() {
      self.pingNow();
    }, delay);
  },

  pingNow: function() {
    var self = this;
    clearTimeout(self.pingSchedule);
    clearTimeout(self.connectSchedule);
    try {
      self.ws.send(self.pingData());
      self.lastPingTime = Date.now();
    } catch (e) {
      self.debug(e, true);
    }
    self.scheduleConnect(self.options.pingMaxLag);
  },

  pong: function() {
    var self = this;
    clearTimeout(self.connectSchedule);
    self.schedulePing(self.options.pingDelay);

    self.pongCount++;
    self.currentLag = Math.min(Date.now() - self.lastPingTime, 10000);

    // Average first 4 pings, then switch to decaying average.
    var mix = self.pongCount > 4 ? 0.1 : (1 / self.pongCount);
    self.averageLag += mix * (self.currentLag - self.averageLag);
  },

  pingData: function() {
    var self = this;
    var data = {
      t: 'p'
    };
    if (self.version !== undefined) data.v = self.version
    if (self.pongCount % 8 === 2) data.l = Math.round(0.1 * self.averageLag);
    return JSON.stringify(data);
  },

  handle: function(msg) {
    var self = this;
    if (msg.v) {
      if (msg.v <= self.version) {
        self.debug('already has event ' + msg.v);
        return;
      }
      if (msg.v > self.version + 1) {
        self.debug('event gap detected from ' + self.version + ' to ' + msg.v);
      }
      self.version = msg.v;
    }
    switch (msg.t || false) {
      case false:
        break;
      case 'ack':
        self.ackableMessages = [];
        break;
      default:
        if (self.options.registeredEvents.indexOf(msg.t) !== -1) {
          postMessage({ topic: 'handle', payload: msg });
        }
    }
  },

  debug: function(msg, always) {
    if ((always || this.options.debug) && console && console.debug) {
      console.debug('[' + this.options.name + ' ' + this.settings.params.sri + ']', msg);
    }
  },

  appDisconnect: function() {
    this.disconnect();
  },

  // close websocket only when all queued messages are sent
  // accepts a callback to notify when the websocket is properly closed
  disconnect: function(onDisconnected) {
    clearTimeout(this.pingSchedule);
    clearTimeout(this.connectSchedule);
    this.autoReconnect = false;

    if (this.ws) {
      // if all messages are not sent before closed just retry until so
      if (this.ws.readyState === WebSocket.OPEN && this.ws.bufferedAmount > 0) {
        this.debug('Queued messages are waiting to being sent, retrying to close...', true);
        setTimeout(this.disconnect.bind(this, onDisconnected), 2);
      } else {
        this.ws.onerror = function() {};
        this.ws.onclose = function() {};
        this.ws.onopen = function() {};
        this.ws.onmessage = function() {};
        this.ws.close();
        this.ws = null;
        this.debug('Disconnect', true);
        if (onDisconnected) setTimeout(onDisconnected, 0);
      }
    } else if (onDisconnected) {
      setTimeout(onDisconnected, 0);
    }
  },

  onError: function(e) {
    var self = this;
    postMessage({ topic: 'onError' });
    postMessage({ topic: 'disconnected' });
    self.options.debug = true;
    self.debug('error: ' + JSON.stringify(e));
    self.tryAnotherUrl = true;
    clearTimeout(self.pingSchedule);
  },

  onSuccess: function() {
    postMessage({ topic: 'connected' });
  },

  pingInterval: function() {
    return this.options.pingDelay + this.averageLag;
  }
};

function create(payload) {
  // don't always recreate default socket on page change
  // we don't want to do it for other sockets bc/ we want to register other
  // handlers on create
  if (socketInstance && payload.opts.options.name === 'default' &&
    socketInstance.options.name === 'default'
  ) {
    return;
  }

  if (socketInstance) {
    socketInstance.disconnect(function() {
      socketInstance = new StrongSocket(
        payload.clientId,
        payload.socketEndPoint,
        payload.url,
        payload.version,
        payload.opts
      );
    });
  } else {
    socketInstance = new StrongSocket(
      payload.clientId,
      payload.socketEndPoint,
      payload.url,
      payload.version,
      payload.opts
    );
  }
}

function doSend(payload) {
  var t = payload[0];
  var d = payload[1];
  var o = payload[2];
  if (socketInstance) socketInstance.send(t, d, o);
  else console.info('socket instance is null, could not send socket msg: ', payload);
}

self.onmessage = function(msg) {
  switch (msg.data.topic) {
    case 'create':
      create(msg.data.payload);
      break;
    case 'send':
      doSend(msg.data.payload);
      break;
    case 'ask':
      var event = msg.data.payload.listenTo;
      if (socketInstance &&
        socketInstance.options.registeredEvents.indexOf(event) === -1) {
        socketInstance.options.registeredEvents.push(event);
      }
      doSend(msg.data.payload.msg);
      break;
    case 'connect':
      if (socketInstance) socketInstance.connect();
      break;
    case 'disconnect':
      if (socketInstance) socketInstance.appDisconnect();
      break;
    case 'destroy':
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      break;
    case 'setVersion':
      if (socketInstance) {
        socketInstance.setVersion(msg.data.payload);
      }
      break;
    case 'averageLag':
      if (socketInstance) postMessage({ topic: 'averageLag', payload: socketInstance.averageLag });
      else postMessage({ topic: 'averageLag', payload: null });
      break;
    case 'currentLag':
      if (socketInstance) postMessage({ topic: 'currentLag', payload: socketInstance.currentLag });
      else postMessage({ topic: 'currentLag', payload: null });
      break;
    default:
      throw new Error('socker worker message not supported: ' + msg.data.topic);
  }
};


// taken from https://github.com/KyleAMathews/deepmerge/blob/master/index.js
function deepmerge(target, src) {
    var array = Array.isArray(src);
    var dst = array && [] || {};

    if (array) {
        target = target || [];
        dst = dst.concat(target);
        src.forEach(function(e, i) {
            if (typeof dst[i] === 'undefined') {
                dst[i] = e;
            } else if (typeof e === 'object') {
                dst[i] = deepmerge(target[i], e);
            } else {
                if (target.indexOf(e) === -1) {
                    dst.push(e);
                }
            }
        });
    } else {
        if (target && typeof target === 'object') {
            Object.keys(target).forEach(function (key) {
                dst[key] = target[key];
            });
        }
        Object.keys(src).forEach(function (key) {
            if (typeof src[key] !== 'object' || !src[key]) {
                dst[key] = src[key];
            }
            else {
                if (!target[key]) {
                    dst[key] = src[key];
                } else {
                    dst[key] = deepmerge(target[key], src[key]);
                }
            }
        });
    }

    return dst;
}

function serializeQueryParameters(obj) {
  var str = '';
  for (var key in obj) {
    if (str !== '') {
      str += '&';
    }
    str += encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  }
  return str;
}
