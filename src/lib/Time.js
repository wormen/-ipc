/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: olegbogdanov86@gmail.com
 ---------------------------------------------
 класс для работы с датами

 */

"use strict";

class Time {

  /**
   * Получаем значение равное кол-ву секунд
   * @param val - кол-во минут
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Seconds(val, isUnix = false) {
    if (isUnix)
      return val;
    else
      return val * 1000;
  }

  /**
   * Получаем значение равное кол-ву минут
   * @param val - кол-во минут
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Minute(val, isUnix = false) {
    return val * this.Seconds(60, isUnix);
  }

  /**
   * Получаем значение равное кол-ву часов
   * @param val - кол-во часов
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Hours(val, isUnix = false) {
    return val * this.Minute(60, isUnix);
  }

  /**
   * Получаем значение равное кол-ву дней
   * @param val - кол-во дней
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Days(val, isUnix = false) {
    return val * this.Hours(24, isUnix);
  }

  /**
   * Unixtime
   * @returns {Number}
   * @constructor
   */
  get Unix() {
    return parseInt(new Date().getTime() / 1000);
  }
}

module.exports = module.exports['default'] = new Time();