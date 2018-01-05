/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

import Time from "./Time";
import {noop} from "./utils";
import {EventEmitter} from 'events';

export default class CheckClient extends EventEmitter {
  constructor(clientID) {
    super();

    this._info = {
      clientID
    };

    this._online = null;
    this._timeout = null;
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

  offline(callback = noop) {
    setTimeout(callback, 10);
  }
}
