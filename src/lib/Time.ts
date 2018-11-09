/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: olegbogdanov86@gmail.com
 ---------------------------------------------
 */

class Time {

  /**
   * Получаем значение равное кол-ву секунд
   * @param val - кол-во минут
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Seconds(val: number, isUnix: boolean = false): number {
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
  Minute(val: number, isUnix: boolean = false): number {
    return val * this.Seconds(60, isUnix);
  }

  /**
   * Получаем значение равное кол-ву часов
   * @param val - кол-во часов
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Hours(val: number, isUnix: boolean = false): number {
    return val * this.Minute(60, isUnix);
  }

  /**
   * Получаем значение равное кол-ву дней
   * @param val - кол-во дней
   * @param isUnix
   * @returns {number}
   * @constructor
   */
  Days(val: number, isUnix: boolean = false): number {
    return val * this.Hours(24, isUnix);
  }

  /**
   * Unixtime
   * @returns {Number}
   * @constructor
   */
  get Unix(): number {
    return parseInt(String(new Date().getTime() / 1000));
  }
}

export default new Time();
