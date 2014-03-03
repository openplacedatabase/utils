var turf = require('turf'),
    async = require('async'),
    opdSDK = require('opd-sdk'),
    argv = require('optimist')
      .demand(['u','p'])
      .argv;

var client = opdSDK.createClient({
  username: argv.u,
  password: argv.p
});

console.log(Date.now());

client.get('e2485b50-2ae9-4a3f-bc18-c24d457565de', function(error, place){
  if(error) {
    console.error(error);
    process.exit();
  }
  async.eachSeries(place.geojsons, function(geo, eachCallback){
    if(geo.id < 81 || geo.id > 92){
      return eachCallback();
    }
    var geoId = 'e2485b50-2ae9-4a3f-bc18-c24d457565de/' + geo.id;
    client.get(geoId, function(error, geojson){
      collapseMultiPolygon(geojson, function(error, collapsed){
        if(error) {
          console.error('Error collapsing %s', geoId);
          console.error(error);
          return eachCallback();
        }
        client.save(geoId, collapsed, function(error){
          if(error){
            console.error('Error saving %s', geoId);
            console.error(error);
          } else {
            console.log('Saved %s', geoId);
          }
          eachCallback();
        });
      });
    });
  }, function(error){
    console.log('We are done!');
    console.log(Date.now());
  });
});

function collapseMultiPolygon(multiPolygon, collapsedCallback){
  var newPoly;
  async.each(multiPolygon.coordinates, function(polygon, eachCallback){
    if(!newPoly){
      newPoly = createPolygonFeature(polygon);
      return eachCallback();
    } else {
      try {
        turf.union(newPoly, createPolygonFeature(polygon), function(error, unionedPolygon){
          if(!error){
            newPoly = unionedPolygon;
          }
          eachCallback(error);
        });
      } catch(error) {
        eachCallback(error);
      } 
    }
  }, function(error){
    if(error) {
      collapsedCallback(error);
    } else if(newPoly) {
      collapsedCallback(null, newPoly.geometry);
    } else {
      collapsedCallback(new Error('I dont know what happened'));
    }
  });
}

function createPolygonFeature(coords){
  return {
    type: 'Feature',
    properties: {},
    geometry: createPolygon(coords)
  };
};

function createPolygon(coords){
  return {
    type: 'Polygon',
    coordinates: coords
  };
};