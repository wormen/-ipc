'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = function (namespace, config, options) {
  return new Client(namespace, config, options);
};

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _dns = require('dns');

var _dns2 = _interopRequireDefault(_dns);

var _events = require('events');

var _utils = require('./lib/utils');

var _Time = require('./lib/Time');

var _Time2 = _interopRequireDefault(_Time);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Copyright © Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Developer: Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Contacts: https://github.com/wormen
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ---------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


var defaultOpts = {
  timeout: _Time2.default.Minute(2),
  autoPing: true,
  autoPingTimeout: _Time2.default.Seconds(1)
};

var Client = function (_EventEmitter) {
  _inherits(Client, _EventEmitter);

  function Client(namespace, config) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, Client);

    var _this = _possibleConstructorReturn(this, (Client.__proto__ || Object.getPrototypeOf(Client)).call(this));

    _this._servers = [];
    _this._namespace = namespace;

    _this._options = Object.keys(options).length > 0 ? Object.assign({}, defaultOpts, options) : Object.assign({}, defaultOpts);

    _this._checkConfig(config);

    _this._reconnectExp = _this._options.reconnectExp || 10;
    var maxSleep = _this._options.reconnectMaxSleep || _Time2.default.Seconds(10);
    _this._reconnectBase = Math.pow(maxSleep, 1 / _this._reconnectExp);

    _this._clientID = _this._options.clientID || (0, _utils.GenerateHash)();
    _this._sockets = [];
    _this._curSock = 0;
    _this._reqno = 1;
    _this._queue = {};
    _this._state = 0;

    _this._init();
    return _this;
  }

  _createClass(Client, [{
    key: 'Error',
    value: function Error(e) {
      return ErrLog(e);
    }
  }, {
    key: '_init',
    value: function _init() {
      var _this2 = this;

      this.on('send', function (obj) {
        var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _utils.noop;

        if (obj.hasOwnProperty('handle') && obj.hasOwnProperty('data')) {
          _this2.send(String(obj.handle), obj.data, callback, obj.delay);
        }
      });
    }
  }, {
    key: '_checkConfig',
    value: function _checkConfig(config) {
      if (config.host && config.port) {
        config = [config];
      }

      if (Array.isArray(config)) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = config[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _ref = _step.value;
            var host = _ref.host;
            var port = _ref.port;

            this._servers.push({
              host: host,
              port: port,
              reconnects: 0
            });
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    }
  }, {
    key: '_autoPing',
    value: function _autoPing() {
      var _this3 = this;

      var init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      if (this._options.autoPing && init) {
        var _tp = null;
        var _ps = function _ps() {
          if (_tp) {
            clearTimeout(_tp);
          }

          _this3.ping();
          _tp = setTimeout(_ps, _this3._options.autoPingTimeout);
        };

        _ps();
      }
    }
  }, {
    key: 'connect',
    value: function connect() {
      var _this4 = this;

      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _utils.noop;

      var self = this;
      var connectCount = 0;
      var errs = [];

      var isConnect = function isConnect() {
        connectCount++;
        if (connectCount === 1) {
          callback(errs.length ? errs : null);
        }
      };

      var real_connect = function real_connect(index) {
        _this4._state = 1;
        var socket = new _net2.default.Socket();
        var queue = _this4._queue;

        var errback = function errback(err) {
          socket.removeListener('error', errback);
          var r = _this4._servers[index].reconnects;
          _this4._servers[index].reconnects++;
          var sleep = r < _this4._reconnectExp - 1 ? Math.floor(Math.pow(_this4._reconnectBase, r + 2)) : _Time2.default.Seconds(10);
          setTimeout(real_connect.bind(_this4), sleep, index);
        };

        socket.on('error', errback);

        socket.on('connect', function () {
          _this4._state = 2;
          socket.setNoDelay(true);
          _this4._servers[index].reconnects = 0;

          _this4.emit('connect', {
            host: _this4._servers[index].host,
            port: _this4._servers[index].port,
            namespace: _this4._namespace
          });

          socket.removeListener('error', errback);
          socket.on('error', function (err) {
            Object.keys(queue).map(function (key, i) {
              setImmediate(queue[key].fn, err, null);
              delete queue[key];
            });
          });

          (0, _utils.AddLineReader)(socket);
          socket.on('line', function (data) {
            var json = (0, _utils.safeExecute)(JSON.parse, data, []);
            if (json[0] && queue[json[0]]) {
              queue[json[0]].fn(json[1], json[2]);
              delete queue[json[0]];
            }
          });

          if (_this4._sockets[index]) {
            _this4._sockets[index].destroy();
          }

          _this4._sockets[index] = socket;
          _this4._servers[index].connect = true;

          _this4._autoPing(connectCount === 0);

          isConnect();
        });

        socket.on('close', function () {
          if (_this4._state === 2) {
            var _host = [_this4._servers[index].host, _this4._servers[index].port].join(':');

            ErrLog(['Server', _host, 'disconnected! Trying to automatically to reconnect'].join(' '));

            _this4.emit('disconnect', {
              host: _this4._servers[index].host,
              port: _this4._servers[index].port
            });

            Object.keys(queue).map(function (key, i) {
              setImmediate(queue[key].fn, ErrLog('Server disconnected'), null);
              delete queue[key];
            });

            var r = _this4._servers[index].reconnects;
            _this4._servers[index].reconnects++;
            var sleep = r < _this4._reconnectExp - 1 ? Math.floor(Math.pow(_this4._reconnectBase, r + 2)) : _Time2.default.Seconds(10);
            setTimeout(real_connect.bind(_this4), sleep, index);
          }
          _this4._state = 0;
        });

        socket.connect({ port: _this4._servers[index].port, host: _this4._servers[index].host });
      };

      this._servers.forEach(function (server, i) {
        if (!_net2.default.isIP(server.host)) {
          _dns2.default.resolve(server.host, function (err, ips) {
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
          if (_this4._servers.length === i + 1 && errs.length === _this4._servers.length) {
            callback(errs);
          }
        }
      });
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _utils.noop;

      this._state = 0;
      for (var i in this._sockets) {
        this._sockets[i].end();
      }

      setTimeout(callback, 100);
    }
  }, {
    key: 'ping',
    value: function ping() {
      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _utils.noop;

      this.send('ping', {
        clientID: this._clientID,
        t: Date.now()
      }, callback);
    }
  }, {
    key: 'send',
    value: function send(method, args) {
      var callback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _utils.noop;
      var delay = arguments[3];

      if (!this._sockets.length) {
        return setImmediate(this.send.bind(this), method, args, callback);
      }

      var data = void 0;
      if (method) {
        data = (0, _utils.safeExecute)(JSON.stringify, [this._reqno, (0, _utils.getNS)([this._namespace, method]), args, callback ? true : false], null);
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
  }, {
    key: 'sendAll',
    value: function sendAll(method, args, callback, delay) {
      if (!this._sockets.length) {
        return setImmediate(this.send.bind(this), method, args, callback);
      }

      var data = void 0;
      for (var i in this._sockets) {
        if (method) {
          data = (0, _utils.safeExecute)(JSON.stringify, [this._reqno, (0, _utils.getNS)([this._namespace, method]), args, callback ? true : false], null);
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
  }, {
    key: 'clean',
    value: function clean() {
      for (var i in this._queue) {
        var job = this._queue[i];
        if (job.ts < Date.now()) {
          setImmediate(job.fn, ErrLog('Timeout'), null);
          delete this._queue[i];
        }
      }
      setTimeout(this.clean.bind(this), 100);
    }
  }]);

  return Client;
}(_events.EventEmitter);

function ErrLog(e) {
  if (typeof e === 'string') {
    e = new Error(e);
  }
  console.error('[IPC-CLIENT]', e);
}