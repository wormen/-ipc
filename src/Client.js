/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */
import net from 'net';
import dns from 'dns';
import {EventEmitter} from 'events';
import {AddLineReader, encode, getNS, isNullOrUndefined, noop, safeExecute} from './lib/utils';
import Time from './lib/Time';

const defaultOpts = {
  timeout: Time.Minute(2),
  autoPing: true,
  autoPingTimeout: Time.Seconds(1),
  clientID: null
};

class Client extends EventEmitter {
  constructor(namespace, config, options = {}) {
    super();

    this._servers = [];
    this._namespace = namespace;

    this._options = Object.keys(options).length > 0
      ? Object.assign({}, defaultOpts, options)
      : Object.assign({}, defaultOpts);

    this._checkRequiredFields();
    this._checkConfig(config);

    this._reconnectExp = this._options.reconnectExp || 10;
    let maxSleep = this._options.reconnectMaxSleep || Time.Seconds(10);
    this._reconnectBase = Math.pow(maxSleep, 1 / this._reconnectExp);

    this._clientID = this._options.clientID;
    this._sockets = [];
    this._curSock = 0;
    this._reqno = 1;
    this._queue = {};
    this._state = 0;

    this._methods = {};

    this._init();
  }

  Error(e) {
    return ErrLog(e);
  }

  _init() {
    this.on('send', (obj, callback = noop) => {
      if (obj.hasOwnProperty('handle') && obj.hasOwnProperty('data')) {
        this.send(String(obj.handle), obj.data, callback, obj.delay);
      }
    });
  }

  _checkRequiredFields() {
    if (isNullOrUndefined(this._options.clientID) || String(this._options.clientID).length === 0) {
      throw this.Error('Not specified "clientID" field');
    }
  }

  _checkConfig(config) {
    if (config.host && config.port) {
      config = [config];
    }

    if (Array.isArray(config)) {
      for (let {host, port} of config) {
        this._servers.push({
          host: host,
          port: port,
          reconnects: 0
        });
      }
    }
  }

  _autoPing(init = true) {
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

  connect(callback = noop) {
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
        socket.removeListener('error', errback);
        let r = this._servers[index].reconnects;
        this._servers[index].reconnects++;
        let sleep = r < this._reconnectExp - 1 ? Math.floor(Math.pow(this._reconnectBase, r + 2)) : Time.Seconds(10);
        setTimeout(real_connect.bind(this), sleep, index);
      };

      let sendPrivate = (data) => {
        ++this._reqno;
        socket.write(encode([this._reqno, data]) + '\n');
      };

      socket.on('error', errback);

      socket.on('connect', () => {
        this._state = 2;
        socket.setNoDelay(true);
        this._servers[index].reconnects = 0;

        this.emit('connect', {
          host: this._servers[index].host,
          port: this._servers[index].port,
          namespace: this._namespace
        });

        // отправляем служебную о клиенте информацию на сервер
        sendPrivate({
          event: 'clientInfo',
          data: {
            clientID: this._clientID,
            token: this._options.token || null
          }
        });

        socket.removeListener('error', errback);
        socket.on('error', (err) => {
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

        socket.on('handle', (name, data) => {
          super.emit(getNS(['handle', name]), data);
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

          this.emit('disconnect', {
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

  disconnect(callback = noop) {
    this._state = 0;
    for (let i in this._sockets) {
      this._sockets[i].end();
    }

    setTimeout(callback, 100);
  };

  ping(callback = noop) {
    this.send('ping', {
      clientID: this._clientID,
      t: Date.now()
    }, callback);
  };

  send(method, args, callback = noop, delay) {
    if (!this._sockets.length) {
      return setImmediate(this.send.bind(this), method, args, callback);
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

  sendAll(method, args, callback, delay) {
    if (!this._sockets.length) {
      return setImmediate(this.send.bind(this), method, args, callback);
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

  clean() {
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

export default function (namespace, config, options) {
  return new Client(namespace, config, options);
}

function ErrLog(e) {
  if (typeof e === 'string') {
    e = new Error(e);
  }
  console.error(e);
}