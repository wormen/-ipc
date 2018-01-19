/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

import Time from "./lib/Time";
import {encode, noop} from "./lib/utils";
import {EventEmitter} from 'events';

export default class CheckClient extends EventEmitter {
  constructor(opts, socket) {
    super();

    this._info = {
      clientID: opts.clientID,
      token: opts.token
    };

    this._online = null;
    this._timeout = null;

    this._reqno = 1;

    const _sendSocket = (data, done) => {
      socket.write(encode([this._reqno, data]) + `\n`, done);
    };

    super.on('send', ({handleName, data}, done) => {
      _sendSocket({event: 'handle', name: handleName, data}, done);
    });
  }

  get getInfo() {
    return Object.assign({}, this._info, {online: this._online});
  }

  online() {
    if (!this._online) {
      if (this._info.hasOwnProperty('connect')) {
        ++this._info.connect;
      } else {
        this._info.connect = 1;
      }

      delete this._info.offlineIn;
      super.emit('join');
    }

    this._online = true;

    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    this._timeout = setTimeout(() => {
      this._info.offlineIn = Time.Unix;
      this._online = false;
      super.emit('offline', this.offline);
    }, Time.Seconds(5));
  }

  get isOnline() {
    return Boolean(this._online);
  }

  offline(callback = noop) {
    setTimeout(callback, 10);
  }

  /**
   * Хэндлер для отправки данных на клиент
   * @param {String} handleName - название метода
   * @param {Object} data
   * @param {Number} reqno
   * @param {Function} done
   */
  send(handleName, data = {}, reqno, done = noop) {
    this._reqno = reqno;
    super.emit('send', {handleName, data}, done);
  }
}
