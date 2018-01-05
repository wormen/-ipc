/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

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
  AddLineReader,
  isNullOrUndefined,
  safeExecute
};