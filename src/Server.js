/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

import net from 'net';
import {EventEmitter} from 'events';
import SocketClient from './SocketClient';
import {AddLineReader, getNS, isFunction, isNullOrUndefined, isString, noop, safeExecute} from './lib/utils';

const statsd = {
  gauge() {
  },
  gaugeDelta() {
  },
  increment() {
  },
  debug: true
};
let statsQPS = {};
let stats = {};
let clients = {};

class Server extends EventEmitter {
  constructor(namespace, port, instance) {
    super();

    this._tm = null;

    this._server = null;
    this._namespace = namespace;
    this._methods = {};
    this._host = '0.0.0.0';
    this._port = port || 8500;
    this._stats_prefix = getNS(isNullOrUndefined(instance) ? [namespace] : [namespace, instance]);

    this._reqno = 0; // порядковый номер запроса

    this.init();
  }

  initMetrics(stat) {
    delete statsQPS.undefined;
    delete stats.undefined;

    super.emit('metrics', {stats, statsQPS});

    sendStats();
    if (this._tm) {
      clearTimeout(this._tm)
    }

    this._tm = setTimeout(() => {
      this.initMetrics(stat);
    }, 1e3);
  }

  /**
   * Добавление метода обработки запросов
   * @param {String} name - название метода
   * @param {Function} callback - обработчик запроса
   */
  handle(name, callback = noop) {
    if (!isString(name)) {
      return;
    }

    let self = this;
    let stats_key = getNS([this._stats_prefix, name]);
    let ns = getNS([this._namespace, name]);

    stats[stats_key] = 0;
    statsQPS[stats_key] = 0;

    this._methods[ns] = function (...args) {
      stats[stats_key]++;
      statsQPS[stats_key]++;

      callback.call(self, ...args);

      if (arguments[1].noCallback) {
        stats[stats_key]--;
        stats[self._stats_prefix]--;
      }
    };
  }

  /**
   * Вызов метода
   * @param name - название метода
   * @param args
   * @private
   */
  _onHandle(name, ...args) {
    this._methods[name](...args);
    super.emit(name, ...args);
  }

  sendClient(handleName, data = {}, opts = {clientID: null, sendAll: true}) {
    if (!isString(handleName)) {
      return;
    }

    let _send = (id) => {
      ++this._reqno;
      clients[id].send(handleName, data, this._reqno);
    };

    if (isString(opts.clientID) && clients.hasOwnProperty(opts.clientID)) {
      opts.sendAll = false;
      _send(opts.clientID);
    }

    if (opts.sendAll === true) {
      for (let id in clients) {
        _send(id);
      }
    }
  }

  init() {
    let self = this;
    stats[this._stats_prefix] = 0;
    statsQPS[this._stats_prefix] = 0;

    super.on(getNS([this._namespace, 'ping']), (req) => {
      if (clients.hasOwnProperty(req.clientID)) {
        clients[req.clientID].online();
      }
    });

    this._server = net.createServer((socket) => {
      AddLineReader(socket);

      socket.on('clientInfo', (data) => {
        let _cl = clients[data.clientID] = new SocketClient(data, socket);

        if (!_cl.isOnline) {
          _cl.on('join', () => {
            super.emit('client:connect', {clientID: data.clientID});
          });

          _cl.on('offline', () => {
            super.emit('client:disconnect', clients[data.clientID].getInfo);
          });
        }

        _cl.online();
      });

      socket.on('line', function (data) {
        let request = safeExecute(JSON.parse, data, []);
        if (!request[0]) return false;

        stats[self.stats_prefix]++;
        statsQPS[self.stats_prefix]++;

        let response = {
          send(error, data) {
            let stats_name = self._stats_prefix + request[1].substring(String(this._namespace).length);

            if (stats_name in stats) {
              stats[stats_name]--;
            }

            stats[self._stats_prefix]--;

            data = safeExecute(JSON.stringify, [request[0], error, data], null);
            if (!data) return false;

            socket.write(data + '\n');
          }
        };

        if (request[1] && isFunction(self._methods[request[1]])) {
          let obj = {
            send() {
            },
            noCallback: true
          };

          self._onHandle(request[1], request[2], (request[3] ? response : obj), this.remoteAddress)
        } else {
          response.send("method not found");
        }

        checkActiveConnection();
      });

      socket.on('error', (err) => {
        ErrLog('client error', err);
      });

      socket.on('close', () => {
        socket = null;
      });

      function checkActiveConnection() {
        if (stats[self._stats_prefix] >= 1e4) {
          socket.pause();
          socket.paused = true;
        } else if (socket.paused) {
          socket.resume();
          socket.paused = false;
        }
      }
    });

    this._server.on('error', (error) => {
      Log(error.code);

      if (!(String(error.code).includes('EADDRINUSE'))) {
        this.init();
      } else {
        throw error;
      }
    });

    this._server.listen(this._port, this._host, () => {
      Log('server start at port', this._port);

      this.handle('ping', (req, res) => {
        res.send(null, 'ping ok');
      });
    });
  }
}


export default function (namespace, port = 8500, instance) {
  if (!namespace) {
    ErrLog('Please set NAMESPACE for this server.');
    return false;
  }

  return new Server(namespace, port, instance);
}


function Log(...args) {
  console.log('[IPC-SERVER]', ...args);
}

function ErrLog(e) {
  if (typeof e === 'string') {
    e = new Error(e);
  }
  console.error('[IPC-SERVER]', e);
}

function sendStats() {
  Object.keys(stats).map((key, i) => {
    statsd.gauge(key, stats[key]);
  });

  Object.keys(statsQPS).map((key, i) => {
    if (statsQPS[key]) {
      statsd.increment(`${key}.qps`, statsQPS[key]);
    }
    statsQPS[key] = 0;
  });
}
