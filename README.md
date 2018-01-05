## Install
```
npm i -S @ipc/socket
```

## Use server
    const {Server} = require('@ipc/socket');
    const server = Server('testNamespase', 3500);
        
    server.handle('testHandle', (req, res) => {
        console.log(req); // view request from customer
        res.send(null, Date.now()); // sending response to the client
    });
      
    // show metrics
    server.initMetrics();
    
    server.on('metrics', ({stats, statsQPS}) => {
      console.log('statsQPS -->', statsQPS);
      // console.log('stats -->', stats);
    });
    
## Use client
    const {Client} = require('@ipc/socket');
                                           
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
