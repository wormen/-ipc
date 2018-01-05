/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */
const {Server} = require('../build');

const ns = 'test';
const server = Server(ns, 3500);
// const server2 = Server('test2', 3501);

// server.on(`${ns}:ping`, (req, res, ip) => {
//   console.log(typeof req, req, ip)
//
//   // console.log('IP -->', ip);
//   // console.log('with client -->', req);
//   // res.send(null, Date.now());
// });

server.on('client:connect', client => {
  console.log('client:connect', client)
});

server.on('client:disconnect', client => {
  console.log('client:disconnect', client)
});

server.handle('testHandle', (req, res, ip) => {
  // console.log(typeof req, req)

  // console.log('IP -->', ip);
  // console.log('with client -->', req);
  // res.send(null, Date.now());
});


// server.initMetrics();
//
// server.on('metrics', ({stats, statsQPS}) => {
//   console.log('statsQPS -->', statsQPS);
//   // console.log('stats -->', stats);
// });
