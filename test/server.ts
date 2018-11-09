/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */

import {Server, EVENTS} from '../';

const ns = 'test';
const server = Server(ns, 3500);
server.listenHost('127.0.0.2');

server.on(`${ns}:ping`, (req, res, ip) => {
  console.log(typeof req, req, ip)

  console.log('IP -->', ip);
  console.log('with client -->', req);
  // res.send(null, Date.now());
});

server.on(EVENTS.CLIENT_CONNECTED, client => {
  console.log('client:connect', client);

  // send from clientID
  server.sendClient('testHandle', {
    t: Date.now(),
    n: 1
  }, {clientID: 'test-id-1'});

  server.sendClient('testHandle', {
    t: Date.now(),
    n: 2
  }, {clientID: 'test-id-2'});

  // send all clients
  server.sendClient('testHandle', {
    t: Date.now(),
    n: 3
  });
});

server.on(EVENTS.CLIENT_DISCONNECTED, client => {
  console.log('client:disconnect', client)
});

server.handle('testHandle', (req, res, ip) => {
  // console.log(typeof req, req)

  // console.log('IP -->', ip);
  // console.log('with client -->', req);
  // res.send(null, Date.now());
});


// server.showMetrics();

server.on(EVENTS.METRICS, ({stats, statsQPS}) => {
  console.log('statsQPS -->', statsQPS);
  // console.log('stats -->', stats);
  console.log('');
});
