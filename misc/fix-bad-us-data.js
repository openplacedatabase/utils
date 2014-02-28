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
    var newCoordinates = [];
    for(var i = 0; i < geojson.coordinates.length; i++){
      var newPolygon = [];
      for(var j = 0; j < geojson.coordinates[i].length; j++){
        if(geojson.coordinates[i][j].length > 4){
          newPolygon.push(geojson.coordinates[i][j]);
        } else {
          changes = true;
        }
      }
      if(newPolygon.length > 0){
        newCoordinates.push(newPolygon);
      }
    }
    
    if(changes){
      geojson.coordinates = newCoordinates;
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