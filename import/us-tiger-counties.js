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
.consume(function(error, filename, outerPush, outerNext){
  if(filename === _.nil){
    outerPush(null, _.nil);
    outerNext();
  } else {
    console.log('processing %s', filename);
    getFeatures(filename)
      .consume(function(error, feature, innerPush, innerNext){
        if(feature === _.nil){
          innerPush(null, _.nil);
          innerNext();
          outerPush(null, filename);
          outerNext();
        } else {
          innerPush(null, feature);
          innerNext();
        }
      })
      .each(function(feature){
        //console.log(feature.properties.GISJOIN);
      });
  }
})

.each(function(filename){
  //console.log('Done with %s', filename);
});


/*
.each(function(filename){
  getFeatures(filename)
    .pull(function(feature){
      console.log(feature.properties.GISJOIN);
      process.exit();
    });
});
*/

/*
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
        console.log('pushing feature');
        push(null, feature);
        next();
      })
      .on('end', function(){
        console.log('done parsing source file %s', filename);
        next();
      });
  }
})
*/

// Create place.jsons and associated .geojsons
// GISJOIN feature property is the key
/*
.consume(function(error, feature, push, next){
  console.log(feature);
  process.exit();
})
*/
/*
.pull(function(feature){
  console.log(feature);
  process.exit();
});
*/

// Iterate over resulting place.jsons and .geojsons and send to OPD


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
 * This only ever sent one data event
 *

function getFeatures(filename){

  console.log('processing %s', filename);
  
  var year = filename.split('_')[2].split('.')[0],
      queue = [],
      finished = false,
      
      featureStream = fs.createReadStream(path.join(sourceDir, filename))
        .pipe(jsonStream.parse(['features',true]))
        .on('data', function(feature){
          feature.properties.year = year;
          console.log('collecting feature %s', feature.properties.GISJOIN);
          queue.push(feature);
          featureStream.pause();
        })
        .on('end', function(){
          console.log('done parsing source file %s', filename);
          finished = true;
        });
        
  setTimeout(function(){
    //featureStream.pause();
  }, 1000);
  
  return _(function(push, next){    
    console.log('calling generator');
    if(queue.length){
      console.log('queue length %d', queue.length);
    }
    var callNext = queue.length ? true : false;
    for(var i = 0; i < queue.length; i++){
      push(null, queue[i]);
    }
    queue = [];
    if(finished){
      push(null, _.nil);
      next();
    } else {
      console.log('resume stream');
      featureStream.resume();
      if(callNext) {
        console.log('calling next');
        next();
      }
    }
  });
};
*/