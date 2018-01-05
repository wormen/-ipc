/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: olegbogdanov86@gmail.com
 ---------------------------------------------
 класс для работы с датами

 */

"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Time = function () {
  function Time() {
    _classCallCheck(this, Time);
  }

  _createClass(Time, [{
    key: "Seconds",


    /**
     * Получаем значение равное кол-ву секунд
     * @param val - кол-во минут
     * @param isUnix
     * @returns {number}
     * @constructor
     */
    value: function Seconds(val) {
      var isUnix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (isUnix) return val;else return val * 1000;
    }

    /**
     * Получаем значение равное кол-ву минут
     * @param val - кол-во минут
     * @param isUnix
     * @returns {number}
     * @constructor
     */

  }, {
    key: "Minute",
    value: function Minute(val) {
      var isUnix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      return val * this.Seconds(60, isUnix);
    }

    /**
     * Получаем значение равное кол-ву часов
     * @param val - кол-во часов
     * @param isUnix
     * @returns {number}
     * @constructor
     */

  }, {
    key: "Hours",
    value: function Hours(val) {
      var isUnix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      return val * this.Minute(60, isUnix);
    }

    /**
     * Получаем значение равное кол-ву дней
     * @param val - кол-во дней
     * @param isUnix
     * @returns {number}
     * @constructor
     */

  }, {
    key: "Days",
    value: function Days(val) {
      var isUnix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      return val * this.Hours(24, isUnix);
    }

    /**
     * Unixtime
     * @returns {Number}
     * @constructor
     */

  }, {
    key: "Unix",
    get: function get() {
      return parseInt(new Date().getTime() / 1000);
    }
  }]);

  return Time;
}();

module.exports = module.exports['default'] = new Time();