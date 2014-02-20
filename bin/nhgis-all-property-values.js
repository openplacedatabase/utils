/**
 * Analyze an NHGIS .geojson feature collection for county
 * borders of a given year. Collect and save all values
 * of all properties.
 */
 
var _ = require('underscore')._,
    high = require('highland'),
    fs = require('fs'),
    jsonStream = require('JSONStream'),
    argv = require('optimist')
      .demand('f')
      .describe('f', 'source directory for year geojson files')
      .argv;
      
var filename = argv.f,
    properties = {};

// Extract features
getFeatures(filename).consume(function(error, feature, push, next){
  
  // We're done processing all features
  if(feature === high.nil){
    for(var p in properties){
      properties[p] = _.uniq(properties[p]);
    }
    console.log(JSON.stringify(properties, null, 2));
  }
  
  // Save properties
  else {
    for(var p in feature.properties){
      if(_.isUndefined(properties[p])){
        properties[p] = [];
      }
      properties[p].push(feature.properties[p]);
    }
    next();
  }
}).resume();

/**
 * Given a filename, extract and stream all features
 */
function getFeatures(filename){
  
  var finished = false,
      queue = [],
      _push = function(error, x){ queue.push(x); },
      _next = function(){},      
      featureStream = fs.createReadStream(filename)
        .pipe(jsonStream.parse(['features',true]))
        .on('data', function(feature){
          featureStream.pause();
          _push(null, feature);
          _next();
        })
        .on('end', function(){
          _push(null, high.nil);
          _next();
        });
  
  return high(function(push, next){    
    _push = push;
    _next = next;
    for(var i = 0; i < queue.length; i++){
      push(null, queue[i]);
    }
    queue = [];
    featureStream.resume();
  });
};