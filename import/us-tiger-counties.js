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
      .argv;
      
var sourceDir = argv.source;

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
.filter(function(n){
  return n.indexOf('.geojson') !== -1;
})

// Parse files with JSONStream
.consume(function(error, filename, push, next){
  if(filename === _.nil){
    push(null, _.nil);
    next();
  } else {
    console.log('processing %s', filename);
    var year = filename.split('_')[2].split('.')[0];
    fs.createReadStream(path.join(sourceDir, filename))
      .pipe(jsonStream.parse(['features',true]))
      .on('data', function(feature){
        feature.properties.year = year;
        push(null, feature);
        //next();
      })
      .on('end', function(){
        console.log('done parsing source file %s', filename);
        next();
      });
  }
})

// Create place.jsons and associated .geojsons
/*
.consume(function(error, feature, push, next){
  console.log(feature);
  process.exit();
})
*/
.pull(function(feature){
  console.log(feature);
  process.exit();
});

// Iterate over resulting place.jsons and .geojsons and send to OPD