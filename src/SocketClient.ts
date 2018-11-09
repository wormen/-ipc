import Time from './lib/Time';
import {encode, noop} from './lib/utils';
import {EventEmitter} from 'events';
import Timeout = NodeJS.Timeout;

import EVENTS from './_events';

export default class CheckClient extends EventEmitter {
  private _info = null;
  private _online = null;
  private _reqno: number = 1;
  private _timeout: Timeout | null = null;

  constructor(opts, socket) {
    super();

    this._info = {
      clientID: opts.clientID,
      token: opts.token
    };

    const _sendSocket = (data, done) => {
      socket.write(encode([this._reqno, data]) + `\n`, done);
    };

    this.on(EVENTS.SEND, ({handleName, data}, done) => {
      _sendSocket({event: EVENTS.HANDLE, name: handleName, data}, done);
    });
  }

  get getInfo() {
    return Object.assign({}, this._info, {online: this._online});
  }

  online(): void {
    if (!this._online) {
      if (this._info.hasOwnProperty(EVENTS.CONNECT)) {
        ++this._info.connect;
      } else {
        this._info.connect = 1;
      }

      delete this._info.offlineIn;
      this.emit(EVENTS.JOIN);
    }

    this._online = true;

    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    this._timeout = setTimeout(() => {
      this._info.offlineIn = Time.Unix;
      this._online = false;
      this.emit(EVENTS.OFFLINE, this.offline);
    }, Time.Seconds(5));
  }

  get isOnline(): boolean {
    return Boolean(this._online);
  }

  offline(callback: (...args) => void = noop): void {
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
    this.emit(EVENTS.SEND, {handleName, data}, done);
  }
}
