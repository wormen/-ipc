function isNull(arg: any): boolean {
  return arg === null;
}

function isNullOrUndefined(arg: any): boolean {
  return arg === null || arg === undefined;
}

function encode(val: any): string {
  return JSON.stringify(val);
}

function decode(val: string | any): object | object[] | string[] | number[] {
  if (isJson(val)) {
    return JSON.parse(val);
  }
  return val;
}

function isJson(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function isObject(arg: any): boolean {
  return arg !== null && typeof arg === 'object';
}

function isFunction(arg: any): boolean {
  return typeof arg === 'function';
}

function isString(arg: any): boolean {
  return typeof arg === 'string';
}

function isNumber(arg: any): boolean {
  return typeof arg === 'number';
}

function noop(...args): void {
}

function AddLineReader(socket) {
  let lines;
  let chunk = '';

  socket.on('data', (data) => {
    lines = data.toString().split(`\n`);
    chunk = lines.pop();

    if (data.toString().includes('event') && data.toString().includes('data')) {
      lines = lines.shift();

      if (isJson(lines)) {
        lines = JSON.parse(lines);
      }

      if (Array.isArray(lines)) {
        lines = lines.pop();
      }

      if (lines.hasOwnProperty('name')) {
        socket.emit(lines.event, lines.name, lines.data);
      } else {
        socket.emit(lines.event, lines.data);
      }
    } else {
      while (lines.length) {
        socket.emit('line', lines.shift());
      }
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
function GenerateHash(length: number = 20): string {
  let n;
  let S = 'x';
  let hash = s => {
    if (typeof (s) === 'number' && s === parseInt(String(s), 10)) {
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

export {
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