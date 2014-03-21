/**
 * Collapses/merges geojsons of a given place if
 * the shapes are essentially the same
 *
 * WARNING: this script assumes that all geojson
 * date ranges are contiguous. If this is run on
 * a place with non-contiguous date ranges, it
 * will remove the gaps if the area of the geojson
 * before and after the gap are the same.
 */
 
var async = require('async'),
    opdSDK = require('opd-sdk'),
    area = require('geojson-area').geometry,
    argv = require('optimist')
      .demand(['i','u','p'])
      .describe('i', 'OPD place ID to process')
      .default('h', 'http://localhost:8080')
      .argv;

var client = opdSDK.createClient({
  host: argv.h,
  username: argv.u,
  password: argv.p
});

console.log('start', Date.now());

async.auto({
  get_place: getPlace,
  merge_geojsons: ['get_place', mergeGeoJSONs],
  save_place: ['merge_geojsons', savePlace],
  delete_geojsons: ['merge_geojsons', deleteGeoJSONs]
}, function(error){
  if(error){
    console.error(error);
  } else {
    console.log('Merged geojsons for %s', argv.i);
  }
});

function getPlace(autoCallback){
  client.get(argv.i, function(error, place){
    autoCallback(error, place);
  });
};

function savePlace(autoCallback, results){
  var place = results.get_place;
  place.geojsons = results.merge_geojsons.newGeos;
  client.save(argv.i, place, function(error){
    autoCallback(error);
  });
};

function deleteGeoJSONs(autoCallback, results){
  async.each(results.merge_geojsons.deleted, function(geoId, eachCallback){
    client.delete(argv.i + '/' + geoId, function(error){
      eachCallback(error);
    });
  }, function(error){
    autoCallback(error);
  });
}

function mergeGeoJSONs(autoCallback, results){
  // For each geojson, if this geojson matches the
  // area of the previous geojson, merge them
  var newGeos = [], deletedGeoIds = [], prevGeo, prevArea;
  async.eachSeries(results.get_place.geojsons, function(geo, eachCallback){
    
    // Get this geojson
    client.get(argv.i + '/' + geo.id, function(error, geojson){
      if(error){
        return eachCallback(error);
      }
      
      // If this is the first one, just add it
      if(!prevGeo){
        prevGeo = geo;
        prevArea = area(geojson);
        newGeos.push(geo);
      }
      
      // For all but the first, compare areas and merge when necessary
      else {
        var newArea = area(geojson),
            adiff = newArea / prevArea;
        
        // Merge if the area is very similar.
        // Allow for the new area to be smaller
        // or large than the previous area.
        if(adiff > .999 && adiff < 1.001){
          prevGeo.to = geo.to;
          deletedGeoIds.push(geo.id);
        } 
        
        // Save geojson
        else {
          prevGeo = geo;
          prevArea = area(geojson);
          newGeos.push(geo);
        }
      }
      
      eachCallback();
    });
  }, function(error){
    autoCallback(error, {
      newGeos: newGeos,
      deleted: deletedGeoIds
    });
  });
};