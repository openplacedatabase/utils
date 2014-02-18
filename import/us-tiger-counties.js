/**
 * Download county GIS files from https://data2.nhgis.org/main.
 * 1. Select the "County (by State)" Geographic level in the upper left filters.
 * 2. Use the "GIS boundary files" tab below to browse through and select files by year (use the latest TIGER/Line basis available).
 * 3. Unzip and convert to geojson with bin/us-county-geojson.sh
 */
 
var _ = require('highland'),
    fs = require('fs'),
    jsonStream = require('JSONStream'),
    path = require('path'),
    argv = require('optimist')
      .demand('source')
      .describe('source', 'source directory for year geojson files')
      .demand('dest')
      .describe('dest', 'destination directory for saving temp OPD files')
      .argv;
      
var sourceDir = argv.source,
    destDir = argv.dest;

// Read all files in the directory
_(function(push, next){
  fs.readdir(sourceDir, function(error, files){
    if(error){
      push(error);
    } else {
      for(var i = 0; i < files.length; i++){
        push(null, files[i]);
      }
      push(null, _.nil);
    }
  });
})

// Only keep files that end on .geojson
.filter(function(filename){
  return filename.indexOf('.geojson') !== -1;
})

// Extract features
.flatMap(getFeatures)

// Save features
.consume(function(error, feature, push, next){
  
  // We're done saving all features
  if(feature === _.nil){
    push(null, _.nil);  
  }
  
  // Save a feature
  else {
    
    var filename = path.join(destDir, feature.properties.GISJOIN + '.json'),
        year = feature.properties.year,
        geometry = feature.geometry,
        obj, geonum;
        
    fs.readFile(filename, function(error, data){
      // File doesn't exist
      if(error){
        geonum = 1;
        obj = {
          names: {},
          geojsons: {},
          sources: ["Minnesota Population Center. National Historical Geographic Information System: Version 2.0. Minneapolis, MN: University of Minnesota 2011."]
        };
      } 
      
      // File already exists
      else {
        obj = JSON.parse(data);
        geonum = Object.keys(obj.geojsons).length + 1;
      }
       
      // Update the object
      obj.names[year] = getName(feature);
      obj.geojsons[year] = geonum;
      
      // Save the .json
      saveObject(filename, obj, function(error){
        if(error){
          push(error);
          next();
        } else {
          
          // Save the .geojson
          var geoFilename = path.join(destDir, feature.properties.GISJOIN + '.' + geonum + '.geojson');
          saveObject(geoFilename, geometry, function(error){
            if(error){
              push(error);
            }
            next();
          });
        }
      });
    }); 
  }

})

// Iterate over resulting place.jsons and .geojsons and send to OPD
.consume(function(error, x, push, next){
  
  // We're done saving features so let's send all of
  // the resulting OPD files to the server
  if(x === _.nil){
    console.log('TODO: send files to server');
  } 
  
  // We shouldn't get here
  else {
    push(new Error('OPD -> server consume: we should not get a non nil object'));
    next();
  }
})

// Thunk
.resume();

/**
 * Given a filename, extract and stream all features
 */
function getFeatures(filename){
  
  var year = filename.split('_')[2].split('.')[0],
      finished = false,
      queue = [],
      _push,
      _next,      
      featureStream = fs.createReadStream(path.join(sourceDir, filename))
        .pipe(jsonStream.parse(['features',true]))
        .on('data', function(feature){
          featureStream.pause();
          feature.properties.year = year;
          _push(null, feature);
          _next();
        })
        .on('end', function(){
          _push(null, _.nil);
          _next();
        });
  
  return _(function(push, next){    
    _push = push;
    _next = next;
    featureStream.resume();
  });
};

/**
 * Given a feature, extract the proper name
 * by mapping the year to a schema
 */
function getName(feature){
  var props = feature.properties,
      year = props.year,
      name;
  switch(year){
    default:
      name = year + ' - ' + props.GISJOIN;
  }
  return name;
};

/**
 * Stringify and save the JSON object
 */
function saveObject(filename, obj, cb){
  fs.writeFile(filename, JSON.stringify(obj), cb);
};
