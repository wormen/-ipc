## Install
```bash
npm i -S ipc-socket
```

## Use server
```js
const {Server} = require('ipc-socket');
                                        
const namespase = 'test';
const server = Server(namespase, 3500);
    
server.handle('testHandle', (req, res) => {
    console.log(req); // view request from customer
    res.send(null, Date.now()); // sending response to the client
});
    
// listen handle
server.on(`${namespase}:ping`, (req, res) => {
  console.log(typeof req, req)
  // res.send(null, Date.now());
});
    
// show metrics
server.initMetrics();

server.on('metrics', ({stats, statsQPS}) => {
  console.log('statsQPS -->', statsQPS);
  // console.log('stats -->', stats);
});
  
// clients detect online/offline
server.on('client:connect', client => {
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
  
server.on('client:disconnect', client => {
  console.log('client:disconnect', client)
});
```
    
## Use client
```js
const {Client} = require('ipc-socket');
                                           
const client = Client('test', [
  {host: '127.0.0.1', port: 3500}
], {
  reconnectMaxSleep: 1000
});
  
client.connect((err) => {
  if (err) {
    throw err;
  }
});
    
client.on('connect', obj => {
  console.log('connect info -->', obj);
  
  let obj = {i, t: Date.now()};
  let timeout = 500; //ms
  
  // send with delay
  client.send('testHandle', obj, (err, result) => {
      if (err) {
        return console.error(err);
      }
      console.log(result); //'test from server'
  }, timeout);
    
  client.send('testHandle', obj);
});
      
// listen client handle
client.on('handle:testHandle', val => {
  console.log('handle:testHandle', val);
});
```
