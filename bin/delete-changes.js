/**
 * Get OPD changes within an interval and delete them
 */
var opdSDK = require('opd-sdk'),
    async = require('async'),
    argv = require('optimist')
      .demand(['f', 't', 'u', 'p'])
      .describe('f', 'from - starting timestamp')
      .describe('t', 'to - ending timestamp')
      .describe('u', 'username')
      .describe('p', 'password')
      .describe('host', 'host')
      .default('host', 'http://localhost:8080')
      .argv;
      
var client = opdSDK.createClient({
  host: argv.host,
  username: argv.u,
  password: argv.p
});

var counter = 0;

var cargo = async.cargo(worker, 10);
cargo.drain = function(){
  console.log('Deleted %d items', counter);
};

client.getChanges(argv.f, argv.t, function(error, data){
  console.log('Deleting %d changes', data.length);
  
  for(var i = 0; i < data.length; i++){
    cargo.push(data[i].id);
  }
});

function worker(ids, callback){
  client.deleteMulti(ids, function(response){
    for(var i in response){
      if(response[i].error){
        console.log(i, response[i].error);
      }
    }
    counter += ids.length;
    callback();
  });
};