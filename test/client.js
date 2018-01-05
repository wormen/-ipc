/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

const {Client} = require('../build');

const client = Client('test', [
  {host: '127.0.0.1', port: 3500}
], {
  reconnectMaxSleep: 1000
});

const client2 = Client('test2', [
  {host: '127.0.0.1', port: 3500}
], {
  reconnectMaxSleep: 1000
});


let timeout = 500; //ms
client.connect((err) => {
  if (err) {
    throw err;
  }

  let val = {
    t1: Date.now(),
    t2: Date.now()
  };

  client.send('testHandle', val, (err, result) => {
    if (err) {
      return console.error(err);
    }
    console.log(result); //'test from server'
  }, timeout);

});

client.on('connect', val => {
  console.log('connect -->', val);
});

client2.connect((err) => {
  if (err) {
    throw err;
  }
});

client2.on('connect', val => {
  console.log('connect 2 -->', val);
});

for (let i = 0; i < 5e4; i++) {
  let obj = {i, t: Date.now()};
  // console.log(obj);
  client.send('testHandle', obj, () => {
  }, 0);

  // client.emit('send', {
  //   handle: 'testHandle',
  //   data: obj
  // })
}
