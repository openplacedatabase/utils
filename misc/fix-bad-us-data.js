var fs = require('fs'),
    async = require('async'),
    _ = require('underscore')._,
    area = require('geojson-area').geometry,
    opdSDK = require('opd-sdk');
    
var client = opdSDK.createClient({
  username: 'justin',
  password: '4uRZFAn&Kjy7F*6M'
});    

var ids = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'bad-us-ids.json')));

async.each(ids, function(id, eachCallback){

  // Remove "place:" prefix
  id = id.replace('place:', '');
  
  // Get geo
  client.get(id, function(error, geojson){
    
    if(error) {
      console.error(error);
      return eachCallback();
    }
    
    // Delete polys of length 4 with small area
    var changes = false;
    _.each(geojson.coordinates, function(polygon){
      _.filter(polygon, function(ring){
        if(ring.length > 4){
          return true;
        } else {
          changes = true;
          return false;
        }
      });
    });
    
    if(changes){
      client.save(id, geojson, function(error){
        if(error){
          console.error('Unable to save %s', id, error);
        }
        eachCallback();
      });
    } else {
      eachCallback();
    }
    
  });

}, function(){
  console.log('done');
});