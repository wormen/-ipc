"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } }; /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Copyright © Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Developer: Oleg Bogdanov
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Contacts: https://github.com/wormen
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ---------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             */

var _Time = require("./lib/Time");

var _Time2 = _interopRequireDefault(_Time);

var _utils = require("./lib/utils");

var _events = require("events");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CheckClient = function (_EventEmitter) {
  _inherits(CheckClient, _EventEmitter);

  function CheckClient(opts, socket) {
    _classCallCheck(this, CheckClient);

    var _this = _possibleConstructorReturn(this, (CheckClient.__proto__ || Object.getPrototypeOf(CheckClient)).call(this));

    _this._info = {
      clientID: opts.clientID,
      token: opts.token
    };

    _this._online = null;
    _this._timeout = null;

    _this._reqno = 1;

    var _sendSocket = function _sendSocket(data, done) {
      socket.write((0, _utils.encode)([_this._reqno, data]) + "\n", done);
    };

    _get(CheckClient.prototype.__proto__ || Object.getPrototypeOf(CheckClient.prototype), "on", _this).call(_this, 'send', function (_ref, done) {
      var handleName = _ref.handleName,
          data = _ref.data;

      _sendSocket({ event: 'handle', name: handleName, data: data }, done);
    });
    return _this;
  }

  _createClass(CheckClient, [{
    key: "online",
    value: function online() {
      var _this2 = this;

      if (!this._online) {
        if (this._info.hasOwnProperty('connect')) {
          ++this._info.connect;
        } else {
          this._info.connect = 1;
        }

        delete this._info.offlineIn;
        _get(CheckClient.prototype.__proto__ || Object.getPrototypeOf(CheckClient.prototype), "emit", this).call(this, 'join');
      }

      this._online = true;

      if (this._timeout) {
        clearTimeout(this._timeout);
      }

      this._timeout = setTimeout(function () {
        _this2._info.offlineIn = _Time2.default.Unix;
        _this2._online = false;
        _get(CheckClient.prototype.__proto__ || Object.getPrototypeOf(CheckClient.prototype), "emit", _this2).call(_this2, 'offline', _this2.offline);
      }, _Time2.default.Seconds(5));
    }
  }, {
    key: "offline",
    value: function offline() {
      var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _utils.noop;

      setTimeout(callback, 10);
    }

    /**
     * Хэндлер для отправки данных на клиент
     * @param {String} handleName - название метода
     * @param {Object} data
     * @param {Number} reqno
     * @param {Function} done
     */

  }, {
    key: "send",
    value: function send(handleName) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var reqno = arguments[2];
      var done = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _utils.noop;

      this._reqno = reqno;
      _get(CheckClient.prototype.__proto__ || Object.getPrototypeOf(CheckClient.prototype), "emit", this).call(this, 'send', { handleName: handleName, data: data }, done);
    }
  }, {
    key: "getInfo",
    get: function get() {
      return Object.assign({}, this._info, { online: this._online });
    }
  }, {
    key: "isOnline",
    get: function get() {
      return Boolean(this._online);
    }
  }]);

  return CheckClient;
}(_events.EventEmitter);

exports.default = CheckClient;