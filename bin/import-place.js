/**
 * Imports a place from a specified OPD source host 
 * into a specified OPD destination host
 */
 
var async = require('async'),
    opdSDK = require('opd-sdk'),
    argv = require('optimist')
      .demand(['i','du','dp'])
      .describe('i', 'OPD place ID to import')
      .default('sh', 'http://www.openplacedatabase.org')
      .default('dh', 'http://localhost:8080')
      .argv;
    
var sourceClient = opdSDK.createClient({
  host: argv.sh,
  username: argv.su,
  password: argv.sp
});

var destClient = opdSDK.createClient({
  host: argv.dh,
  username: argv.du,
  password: argv.dp
});

async.auto({
  get_place: getPlace,
  save_place: ['get_place', savePlace],
  save_geojsons: ['get_place', saveGeojsons]
}, function(error){
  if(error){
    console.error(error);
  } else {
    console.log('Imported %s', argv.i);
  }
});

function getPlace(autoCallback){
  sourceClient.get(argv.i, function(error, place){
    autoCallback(error, place);
  });
};

function savePlace(autoCallback, results){
  destClient.save(argv.i, results.get_place, function(error){
    autoCallback(error);
  });
};

function saveGeojsons(autoCallback, results){
  async.each(results.get_place.geojsons, function(geo, eachCallback){
    var geoId = argv.i + '/' + geo.id;
    sourceClient.get(geoId, function(error, geojson){
      if(error){
        return eachCallback(error);
      }
      destClient.save(geoId, geojson, function(error){
        eachCallback(error);
      });      
    });
  }, function(error){
    autoCallback(error);
  });
};