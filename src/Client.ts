import * as net from 'net';
import * as dns from 'dns';
import {EventEmitter} from 'events';
import {AddLineReader, encode, getNS, isNullOrUndefined, noop, safeExecute, isObject, isString} from './lib/utils';
import Time from './lib/Time';

import EVENTS from './_events';

interface IOptions {
  timeout?: number;
  autoPing?: boolean;
  autoPingTimeout?: number;
  clientID: string | null;
  reconnectExp?: number;
  reconnectMaxSleep?: number;
  token?: string | null;
}

interface IHosts {
  host: string;
  port: number | string;
}

const defaultOpts: IOptions = {
  timeout: Time.Minute(2),
  autoPing: true,
  autoPingTimeout: Time.Seconds(1),
  clientID: null
};

class Client extends EventEmitter {
  private _servers: any[] = [];
  private _sockets: any[] = [];
  private _namespace;
  private _options: IOptions;
  private _reconnectExp;
  private _reconnectBase;
  private _clientID: string;
  private _curSock: number = 0;
  private _reqno: number = 1;
  private _queue = {};
  private _state: number = 0;
  private _methods: object = {};

  constructor(namespace: string, hosts: IHosts[], options?: IOptions) {
    super();

    this._namespace = namespace;

    if (isObject(options) && Object.keys(options).length > 0) {
      this._options = Object.assign({}, defaultOpts, options);
    } else {
      this._options = Object.assign({}, defaultOpts);
    }

    this._checkRequiredFields();
    this._checkHosts(hosts);

    this._reconnectExp = this._options.reconnectExp || 10;
    let maxSleep = this._options.reconnectMaxSleep || Time.Seconds(10);
    this._reconnectBase = Math.pow(maxSleep, 1 / this._reconnectExp);

    this._clientID = this._options.clientID;

    this._init();
  }

  Error(e) {
    return ErrLog(e);
  }

  _init(): void {
    this.on(EVENTS.SEND, (obj, callback = noop) => {
      if (obj.hasOwnProperty(EVENTS.HANDLE) && obj.hasOwnProperty('data')) {
        this.send(String(obj.handle), obj.data, callback, obj.delay);
      }
    });
  }

  _checkRequiredFields(): void {
    if (isNullOrUndefined(this._options.clientID) || String(this._options.clientID).length === 0) {
      throw this.Error('Not specified "clientID" field');
    }
  }

  _checkHosts(hosts: IHosts[]): void {
    if (Array.isArray(hosts)) {
      for (let {host, port} of hosts) {
        this._servers.push({
          host: host,
          port: port,
          reconnects: 0
        });
      }
    }
  }

  _autoPing(init: boolean = true): void {
    if (this._options.autoPing && init) {
      let _tp = null;
      let _ps = () => {
        if (_tp) {
          clearTimeout(_tp);
        }

        this.ping();
        _tp = setTimeout(_ps, this._options.autoPingTimeout);
      };

      _ps();
    }
  }

  connect(callback: (...args) => void = noop): void {
    let self = this;
    let connectCount = 0;
    let errs = [];

    const isConnect = () => {
      connectCount++;
      if (connectCount === 1) {
        callback(errs.length ? errs : null);
      }
    };

    let real_connect = (index) => {
      this._state = 1;
      let socket = new net.Socket();
      let queue = this._queue;

      let errback = (err) => {
        socket.removeListener(EVENTS.ERROR, errback);
        let r = this._servers[index].reconnects;
        this._servers[index].reconnects++;
        let sleep = r < this._reconnectExp - 1 ? Math.floor(Math.pow(this._reconnectBase, r + 2)) : Time.Seconds(10);
        setTimeout(real_connect.bind(this), sleep, index);
      };

      let sendPrivate = (data) => {
        ++this._reqno;
        socket.write(encode([this._reqno, data]) + '\n');
      };

      socket.on(EVENTS.ERROR, errback);

      socket.on(EVENTS.CONNECT, () => {
        this._state = 2;
        socket.setNoDelay(true);
        this._servers[index].reconnects = 0;

        this.emit(EVENTS.CONNECT, {
          host: this._servers[index].host,
          port: this._servers[index].port,
          namespace: this._namespace
        });

        // отправляем служебную о клиенте информацию на сервер
        sendPrivate({
          event: EVENTS.CLIENT_INFO,
          data: {
            clientID: this._clientID,
            token: this._options.token || null
          }
        });

        socket.removeListener(EVENTS.ERROR, errback);
        socket.on(EVENTS.ERROR, (err) => {
          Object.keys(queue).map((key, i) => {
            setImmediate(queue[key].fn, err, null);
            delete queue[key];
          });
        });

        AddLineReader(socket);
        socket.on('line', (data) => {
          let json = safeExecute(JSON.parse, data, []);
          if (json[0] && queue[json[0]]) {
            queue[json[0]].fn(json[1], json[2]);
            delete queue[json[0]];
          }
        });

        socket.on(EVENTS.HANDLE, (name, data) => {
          this.emit(getNS([EVENTS.HANDLE, name]), data);
        });

        if (this._sockets[index]) {
          this._sockets[index].destroy();
        }

        this._sockets[index] = socket;
        this._servers[index].connect = true;

        this._autoPing(connectCount === 0);

        isConnect();
      });

      socket.on('close', () => {
        if (this._state === 2) {
          let _host = [
            this._servers[index].host,
            this._servers[index].port
          ].join(':');

          ErrLog(['Server', _host, 'disconnected! Trying to automatically to reconnect'].join(' '));

          this.emit(EVENTS.DISCONNECTED, {
            host: this._servers[index].host,
            port: this._servers[index].port
          });

          Object.keys(queue).map((key, i) => {
            setImmediate(queue[key].fn, ErrLog('Server disconnected'), null);
            delete queue[key];
          });

          let r = this._servers[index].reconnects;
          this._servers[index].reconnects++;
          let sleep = r < this._reconnectExp - 1 ? Math.floor(Math.pow(this._reconnectBase, r + 2)) : Time.Seconds(10);
          setTimeout(real_connect.bind(this), sleep, index);
        }
        this._state = 0;
      });

      socket.connect({port: this._servers[index].port, host: this._servers[index].host});
    };

    this._servers.forEach((server, i) => {
      if (!net.isIP(server.host)) {
        dns.resolve(server.host, function (err, ips) {
          if (!err) {
            server.host = ips[0];
            real_connect(i);
          } else {
            errs.push(err);
            server.resolve = true;
          }

          if (self._servers.length === i + 1 && errs.length === self._servers.length) {
            callback(errs);
          }
        }.bind(server));
      } else {
        real_connect(i);
        if (this._servers.length === i + 1 && errs.length === this._servers.length) {
          callback(errs);
        }
      }
    });
  }

  disconnect(callback: () => void = noop): void {
    this._state = 0;
    for (let i in this._sockets) {
      this._sockets[i].end();
    }

    setTimeout(callback, 100);
  };

  ping(callback: (...args) => void = noop): void {
    this.send(EVENTS.PING, {
      clientID: this._clientID,
      t: Date.now()
    }, callback);
  };

  send(method: string | null, args: any | any[], callback: (...args) => void = noop, delay?: number): void {
    if (!this._sockets.length) {
      setImmediate(this.send.bind(this), method, args, callback);
      return;
    }

    let data;
    if (method) {
      data = safeExecute(JSON.stringify, [
        this._reqno,
        getNS([this._namespace, method]),
        args, (callback ? true : false)
      ], null);
    }

    if (data) {
      if (!this._sockets[this._curSock]) {
        this._curSock = 0;
      }

      if (callback) {
        this._queue[this._reqno] = {
          fn: callback,
          ts: Date.now() + (delay || this._options.timeout)
        };
      }

      this._sockets[this._curSock].write(data + '\n');
      this._reqno++;
      this._curSock++;
    }
  }

  sendAll(method: string | null, args: any | any[], callback: (...args) => void = noop, delay?: number): void {
    if (!this._sockets.length) {
      setImmediate(this.send.bind(this), method, args, callback);
      return;
    }

    let data;
    for (let i in this._sockets) {
      if (method) {
        data = safeExecute(JSON.stringify, [
          this._reqno,
          getNS([this._namespace, method]),
          args,
          (callback ? true : false)
        ], null);
      }

      if (data) {
        if (callback) {
          this._queue[this._reqno] = {
            fn: callback,
            ts: Date.now() + (delay || this._options.timeout)
          };
        }

        this._sockets[i].write(data + '\n');
        this._reqno++;
      }
    }
  }

  clean(): void {
    for (let i in this._queue) {
      let job = this._queue[i];
      if (job.ts < Date.now()) {
        setImmediate(job.fn, ErrLog('Timeout'), null);
        delete this._queue[i];
      }
    }
    setTimeout(this.clean.bind(this), 100);
  }
}

export default function (namespace: string, hosts: IHosts[], options?: IOptions) {
  return new Client(namespace, hosts, options);
}

function ErrLog(e) {
  if (isString(e)) {
    e = new Error(e);
  }
  console.error(e);
}