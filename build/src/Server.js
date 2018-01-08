'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

exports.default = function (namespace) {
  var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8500;
  var instance = arguments[2];

  if (!namespace) {
    ErrLog('Please set NAMESPACE for this server.');
    return false;
  }

  return new Server(namespace, port, instance);
};

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _events = require('events');

var _SocketClient = require('./SocketClient');

var _SocketClient2 = _interopRequireDefault(_SocketClient);

var _utils = require('./lib/utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Copyright © Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Developer: Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                Contacts: https://github.com/wormen
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ---------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

var statsd = {
  gauge: function gauge() {},
  gaugeDelta: function gaugeDelta() {},
  increment: function increment() {},

  debug: true
};
var statsQPS = {};
var stats = {};
var clients = {};

var Server = function (_EventEmitter) {
  _inherits(Server, _EventEmitter);

  function Server(namespace, port, instance) {
    _classCallCheck(this, Server);

    var _this = _possibleConstructorReturn(this, (Server.__proto__ || Object.getPrototypeOf(Server)).call(this));

    _this._tm = null;

    _this._server = null;
    _this._namespace = namespace;
    _this._methods = {};
    _this._host = '0.0.0.0';
    _this._port = port || 8500;
    _this._stats_prefix = (0, _utils.getNS)((0, _utils.isNullOrUndefined)(instance) ? [namespace] : [namespace, instance]);

    _this._reqno = 0; // порядковый номер запроса

    _this.init();
    return _this;
  }

  _createClass(Server, [{
    key: 'initMetrics',
    value: function initMetrics(stat) {
      var _this2 = this;

      delete statsQPS.undefined;
      delete stats.undefined;

      _get(Server.prototype.__proto__ || Object.getPrototypeOf(Server.prototype), 'emit', this).call(this, 'metrics', { stats: stats, statsQPS: statsQPS });

      sendStats();
      if (this._tm) {
        clearTimeout(this._tm);
      }

      this._tm = setTimeout(function () {
        _this2.initMetrics(stat);
      }, 1e3);
    }

    /**
     * Добавление метода обработки запросов
     * @param {String} name - название метода
     * @param {Function} callback - обработчик запроса
     */

  }, {
    key: 'handle',
    value: function handle(name) {
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _utils.noop;

      if (!(0, _utils.isString)(name)) {
        return;
      }

      var self = this;
      var stats_key = (0, _utils.getNS)([this._stats_prefix, name]);
      var ns = (0, _utils.getNS)([this._namespace, name]);

      stats[stats_key] = 0;
      statsQPS[stats_key] = 0;

      this._methods[ns] = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        stats[stats_key]++;
        statsQPS[stats_key]++;

        callback.call.apply(callback, [self].concat(args));

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

  }, {
    key: '_onHandle',
    value: function _onHandle(name) {
      var _methods, _get2;

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      (_methods = this._methods)[name].apply(_methods, args);
      (_get2 = _get(Server.prototype.__proto__ || Object.getPrototypeOf(Server.prototype), 'emit', this)).call.apply(_get2, [this, name].concat(args));
    }
  }, {
    key: 'sendClient',
    value: function sendClient(handleName) {
      var _this3 = this;

      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { clientID: null, sendAll: true };

      if (!(0, _utils.isString)(handleName)) {
        return;
      }

      var _send = function _send(id) {
        ++_this3._reqno;
        clients[id].send(handleName, data, _this3._reqno);
      };

      if ((0, _utils.isString)(opts.clientID) && clients.hasOwnProperty(opts.clientID)) {
        opts.sendAll = false;
        _send(opts.clientID);
      }

      if (opts.sendAll === true) {
        for (var id in clients) {
          _send(id);
        }
      }
    }
  }, {
    key: 'init',
    value: function init() {
      var _this4 = this;

      var self = this;
      stats[this._stats_prefix] = 0;
      statsQPS[this._stats_prefix] = 0;

      _get(Server.prototype.__proto__ || Object.getPrototypeOf(Server.prototype), 'on', this).call(this, (0, _utils.getNS)([this._namespace, 'ping']), function (req) {
        if (clients.hasOwnProperty(req.clientID)) {
          clients[req.clientID].online();
        }
      });

      this._server = _net2.default.createServer(function (socket) {
        (0, _utils.AddLineReader)(socket);

        socket.on('clientInfo', function (data) {
          var _cl = clients[data.clientID] = new _SocketClient2.default(data, socket);

          if (!_cl.isOnline) {
            _cl.on('join', function () {
              _get(Server.prototype.__proto__ || Object.getPrototypeOf(Server.prototype), 'emit', _this4).call(_this4, 'client:connect', { clientID: data.clientID });
            });

            _cl.on('offline', function () {
              _get(Server.prototype.__proto__ || Object.getPrototypeOf(Server.prototype), 'emit', _this4).call(_this4, 'client:disconnect', clients[data.clientID].getInfo);
            });
          }

          _cl.online();
        });

        socket.on('line', function (data) {
          var request = (0, _utils.safeExecute)(JSON.parse, data, []);
          if (!request[0]) return false;

          stats[self.stats_prefix]++;
          statsQPS[self.stats_prefix]++;

          var response = {
            send: function send(error, data) {
              var stats_name = self._stats_prefix + request[1].substring(String(this._namespace).length);

              if (stats_name in stats) {
                stats[stats_name]--;
              }

              stats[self._stats_prefix]--;

              data = (0, _utils.safeExecute)(JSON.stringify, [request[0], error, data], null);
              if (!data) return false;

              socket.write(data + '\n');
            }
          };

          if (request[1] && (0, _utils.isFunction)(self._methods[request[1]])) {
            var obj = {
              send: function send() {},

              noCallback: true
            };

            self._onHandle(request[1], request[2], request[3] ? response : obj, this.remoteAddress);
          } else {
            response.send("method not found");
          }

          checkActiveConnection();
        });

        socket.on('error', function (err) {
          ErrLog('client error', err);
        });

        socket.on('close', function () {
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

      this._server.on('error', function (error) {
        Log(error.code);

        if (!String(error.code).includes('EADDRINUSE')) {
          _this4.init();
        } else {
          throw error;
        }
      });

      this._server.listen(this._port, this._host, function () {
        Log('server start at port', _this4._port);

        _this4.handle('ping', function (req, res) {
          res.send(null, 'ping ok');
        });
      });
    }
  }]);

  return Server;
}(_events.EventEmitter);

function Log() {
  var _console;

  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  (_console = console).log.apply(_console, ['[IPC-SERVER]'].concat(args));
}

function ErrLog(e) {
  if (typeof e === 'string') {
    e = new Error(e);
  }
  console.error('[IPC-SERVER]', e);
}

function sendStats() {
  Object.keys(stats).map(function (key, i) {
    statsd.gauge(key, stats[key]);
  });

  Object.keys(statsQPS).map(function (key, i) {
    if (statsQPS[key]) {
      statsd.increment(key + '.qps', statsQPS[key]);
    }
    statsQPS[key] = 0;
  });
}