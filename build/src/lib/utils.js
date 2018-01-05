'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

function isNull(arg) {
  return arg === null;
}

function isNullOrUndefined(arg) {
  return arg === null || arg === undefined;
}

function encode(val) {
  return JSON.stringify(val);
}

function decode(val) {
  if (isJson(val)) {
    return JSON.parse(val);
  }
  return val;
}

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isObject(arg) {
  return arg !== null && (typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object';
}

function isFunction(arg) {
  return typeof arg === 'function';
}

function isString(arg) {
  return typeof arg === 'string';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function noop() {}

function AddLineReader(socket) {
  var lines = void 0;
  var chunk = '';

  socket.on('data', function (data) {
    chunk += data.toString();
    lines = chunk.split('\n');
    chunk = lines.pop();

    while (lines.length) {
      socket.emit('line', lines.shift());
    }
  });
}

function safeExecute(func, data, defaultValue) {
  var result = defaultValue;

  try {
    result = func(data);
  } catch (err) {}

  return result;
}

function getNS() {
  var arr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  return arr.join(':');
}

/**
 * Генерируем хэш
 * @param length - длина хэша
 * @constructor
 */
function GenerateHash() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 20;

  var n = void 0;
  var S = 'x';
  var hash = function hash(s) {
    if ((typeof s === 'undefined' ? 'undefined' : _typeof(s)) === Number && s === parseInt(s, 10)) {
      s = Array(s + 1).join('x');
    }

    return s.replace(/x/g, function () {
      n = Math.round(Math.random() * 61) + 48;
      n = n > 57 ? n + 7 > 90 ? n + 13 : n + 7 : n;
      return String.fromCharCode(n);
    });
  };

  for (var i = 0; i < length; i++) {
    S = S + 'x';
  }

  return hash(S);
}

module.exports = {
  getNS: getNS,
  noop: noop,
  decode: decode,
  encode: encode,
  isObject: isObject,
  isString: isString,
  isFunction: isFunction,
  isNumber: isNumber,
  isJson: isJson,
  isNull: isNull,
  AddLineReader: AddLineReader,
  isNullOrUndefined: isNullOrUndefined,
  safeExecute: safeExecute,
  GenerateHash: GenerateHash
};