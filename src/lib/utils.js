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
  return arg !== null && typeof arg === 'object';
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

function noop() {
}

function AddLineReader(socket) {
  let lines;
  let chunk = '';

  socket.on('data', (data) => {
    chunk += data.toString();
    lines = chunk.split(`\n`);
    chunk = lines.pop();

    while (lines.length) {
      socket.emit('line', lines.shift());
    }
  });
}

function safeExecute(func, data, defaultValue) {
  let result = defaultValue;

  try {
    result = func(data);
  } catch (err) {
  }

  return result;
}

function getNS(arr = []) {
  return arr.join(':')
}

/**
 * Генерируем хэш
 * @param length - длина хэша
 * @constructor
 */
function GenerateHash(length = 20) {
  let n;
  let S = 'x';
  let hash = s => {
    if (typeof (s) === Number && s === parseInt(s, 10)) {
      s = Array(s + 1).join('x');
    }

    return s.replace(/x/g, () => {
      n = Math.round(Math.random() * 61) + 48;
      n = n > 57 ? (n + 7 > 90 ? n + 13 : n + 7) : n;
      return String.fromCharCode(n);
    });
  };

  for (let i = 0; i < length; i++) {
    S = S + 'x';
  }

  return hash(S);
}

module.exports = {
  getNS,
  noop,
  decode,
  encode,
  isObject,
  isString,
  isFunction,
  isNumber,
  isJson,
  isNull,
  AddLineReader,
  isNullOrUndefined,
  safeExecute,
  GenerateHash
};