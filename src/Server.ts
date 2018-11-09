import * as net from 'net';
import {EventEmitter} from 'events';
import * as stream from 'stream';
import SocketClient from './SocketClient';
import {AddLineReader, getNS, isFunction, isNullOrUndefined, isString, noop, safeExecute} from './lib/utils';

import EVENTS from './_events';

interface IStats {
}

interface IStatsQPS {
}

interface ISendClientOpts {
  clientID?: string | null;
  sendAll?: boolean;
}

interface ISocket extends stream.Duplex {
  paused?: boolean | null | undefined;
}

let statsQPS: IStatsQPS = {};
let stats: IStats = {};
let clients = {};

const statsd = {
  gauge(key: string, value) {
  },
  gaugeDelta() {
  },
  increment(key: string, value) {
  },
  debug: true
};

const sendClientDefault: ISendClientOpts = {clientID: null, sendAll: true};


class Server extends EventEmitter {
  private _namespace: string;
  private _tm = null;
  private _server = null;
  private _methods = {};
  private _host: string = '0.0.0.0';
  private _stats_prefix: string = '';
  private _reqno: number = 0;  // порядковый номер запроса
  private remoteAddress: string = '';

  constructor(namespace: string, public _port: number | string = 8500, instance) {
    super();

    this._namespace = namespace;
    this._stats_prefix = getNS(isNullOrUndefined(instance) ? [namespace] : [namespace, instance]);

    this.init();
  }

  showMetrics(stat?: IStats): void {
    this.emit(EVENTS.METRICS, {stats, statsQPS});

    sendStats();
    if (this._tm) {
      clearTimeout(this._tm)
    }

    this._tm = setTimeout(() => {
      this.showMetrics(stat);
    }, 1e3);
  }

  /**
   * Добавление метода обработки запросов
   * @param {String} name - название метода
   * @param {Function} callback - обработчик запроса
   */
  handle(name: string, callback = noop): void {
    if (!isString(name)) {
      return;
    }

    let stats_key = getNS([this._stats_prefix || '', name]);
    let ns = getNS([this._namespace, name]);

    stats[stats_key] = 0;
    statsQPS[stats_key] = 0;

    this._methods[ns] = (...args) => {
      stats[stats_key]++;
      statsQPS[stats_key]++;

      callback.call(this, ...args);

      // @ts-ignore
      if (arguments[1] && arguments[1].noCallback) {
        stats[stats_key]--;
        stats[this._stats_prefix]--;
      }
    };
  }

  /**
   * Вызов метода
   * @param name - название метода
   * @param args
   * @private
   */
  _onHandle(name: string, ...args): void {
    this._methods[name](...args);
    this.emit(name, ...args);
  }

  sendClient(handleName: string, data: any | any[], opts: ISendClientOpts = sendClientDefault, callback: (...args) => void = noop): void {
    if (!isString(handleName)) {
      throw ErrLog(`Invalid handleName: <${handleName}>`);
    }

    if (isFunction(opts)) {
      throw ErrLog('Invalid send options');
    }

    let _send = (id: number | string, done?: (...args) => void) => {
      ++this._reqno;
      clients[id].send(handleName, data, this._reqno, done);
    };

    if (isString(opts.clientID) && clients.hasOwnProperty(opts.clientID)) {
      opts.sendAll = false;
      _send(opts.clientID, callback);
    }

    if (opts.sendAll === true) {
      for (let id in clients) {
        _send(id);
      }

      callback();
    }
  }

  listenHost(host: string): Server {
    this._host = host;
    return this;
  }

  init(): void {
    stats[this._stats_prefix] = 0;
    statsQPS[this._stats_prefix] = 0;

    this.on(getNS([this._namespace, EVENTS.PING]), (req) => {
      if (clients.hasOwnProperty(req.clientID)) {
        clients[req.clientID].online();
      }
    });

    this._server = net.createServer((socket) => {
      AddLineReader(socket);

      const checkActiveConnection = () => {
        if (stats[this._stats_prefix] >= 1e4) {
          socket.pause();
          (<ISocket>socket).paused = true;
        } else if ((<ISocket>socket).paused) {
          socket.resume();
          (<ISocket>socket).paused = false;
        }
      };

      socket.on(EVENTS.CLIENT_INFO, (data) => {
        let _cl = clients[data.clientID] = new SocketClient(data, socket);

        if (!_cl.isOnline) {
          _cl.on(EVENTS.JOIN, () => {
            this.emit(EVENTS.CLIENT_CONNECTED, {clientID: data.clientID});
          });

          _cl.on(EVENTS.OFFLINE, () => {
            this.emit(EVENTS.CLIENT_DISCONNECTED, clients[data.clientID].getInfo);
          });
        }

        _cl.online();
      });

      socket.on('line', (data) => {
        let request = safeExecute(JSON.parse, data, []);
        if (!request[0]) {
          return false;
        }

        stats[this._stats_prefix]++;
        statsQPS[this._stats_prefix]++;

        let _send = (error, data?: any) => {
          let stats_name = this._stats_prefix + request[1].substring(String(this._namespace).length);

          if (stats_name in stats) {
            stats[stats_name]--;
          }

          stats[this._stats_prefix]--;

          data = safeExecute(JSON.stringify, [request[0], error, data], null);
          if (!data) return false;

          socket.write(data + '\n');
        };

        let response = {
          send: _send
        };

        if (request[1] && isFunction(this._methods[request[1]])) {
          let obj = {
            send() {
            },
            noCallback: true
          };

          this._onHandle(request[1], request[2], (request[3] ? response : obj), this.remoteAddress)
        } else {
          response.send("method not found");
        }

        checkActiveConnection();
      });

      socket.on(EVENTS.ERROR, (err) => {
        err.message = 'client error';
        ErrLog(err);
      });

      socket.on('close', () => {
        socket = null;
      });

    });

    this._server.on(EVENTS.ERROR, (error) => {
      Log(error.code);

      if (!(String(error.code).includes('EADDRINUSE'))) {
        this.init();
      } else {
        throw error;
      }
    });

    this._server.listen(this._port, this._host, () => {
      Log('server start at port', this._port);

      this.handle(EVENTS.PING, (req, res) => {
        res.send(null, 'ping ok');
      });
    });
  }
}


export default function (namespace: string, port: number | string = 8500, instance?: string): Server {
  if (!namespace) {
    throw ErrLog('Please set NAMESPACE for this server.');
  }
  return new Server(namespace, port, instance);
}


function Log(...args) {
  if (process.env.hasOwnProperty('IPC_DEBUG_LEVEL')) {
    console.log(...args);
  }
}

function ErrLog(e) {
  if (isString(e)) {
    e = new Error(e);
  }
  console.error(e);
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
