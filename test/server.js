/**
 Copyright © Oleg Bogdanov
 Developer: Oleg Bogdanov
 Contacts: https://github.com/wormen
 ---------------------------------------------
 */
const {Server} = require('../build');
const server = Server('test', 3500);
const server2 = Server('test2', 3501);

server.handle('testHandle', (req, res, ip) => {
  // console.log(typeof req, req)

  // console.log('IP -->', ip);
  // console.log('with client -->', req);
  // res.send(null, Date.now());
});


server.initMetrics();

server.on('metrics', ({stats, statsQPS}) => {
  console.log('statsQPS -->', statsQPS);
  // console.log('stats -->', stats);
});
