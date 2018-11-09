/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

import {Client, EVENTS} from '../';

const client = Client('test', [
  {host: '127.0.0.2', port: 3500}
], {
  clientID: 'test-id-1',
  reconnectMaxSleep: 1e3
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

  // client.send('testHandle', val, (err, result) => {
  //   if (err) {
  //     return console.error(err);
  //   }
  //   console.log(result); //'test from server'
  // }, timeout);
});


const testHandle = () => {
};

client.on(EVENTS.CONNECT, val => {
  console.log(`${EVENTS.CONNECT} -->`, val);

  for (let i = 0; i < 5e5; i++) {
    let obj = {i, t: Date.now()};
    // client.send('testHandle', obj, testHandle, 0);

    client.emit(EVENTS.SEND, {
      handle: 'testHandle',
      data: obj
    })
  }
});

client.on(EVENTS.DISCONNECTED, val => {
  console.log(`${EVENTS.DISCONNECTED} -->`, val);
});

client.on('handle:testHandle', val => {
  console.log('handle:testHandle', val);
});

