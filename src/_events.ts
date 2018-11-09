/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

enum EVENTS {
  ERROR = 'error',
  SEND = 'send',
  JOIN = 'join',
  HANDLE = 'handle',
  PING = 'ping',
  CLIENT_INFO = 'clientInfo',
  CLIENT_CONNECTED = 'client:connect',
  CLIENT_DISCONNECTED = 'client:disconnect',
  CONNECT = 'connect',
  DISCONNECTED = 'disconnect',
  OFFLINE = 'offline',
  METRICS = 'metrics'
}

export default EVENTS;