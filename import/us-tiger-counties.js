/**
 * Download county GIS files from https://data2.nhgis.org/main.
 * 1. Select the "County (by State)" Geographic level in the upper left filters.
 * 2. Use the "GIS boundary files" tab below to browse through and select files by year (use the latest TIGER/Line basis available).
 * 3. Unzip and convert to geojson with bin/us-county-geojson.sh
 */
 
var async = require('async'),
    fs = require('fs'),
    jsonStream = require('JSONStream'),
    path = require('path'),
    argv = require('optimist')
      .demand('source')
      .describe('source', 'source directory for year geojson files')
      .demand('dest')
      .describe('dest', 'destination directory for saving temp OPD files')
      .describe('fc', 'concurrency of saving features to disk')
      .default('fc', 5)
      .describe('ac', 'concurrency of saving features to OPD api')
      .default('ac', 10)
      .argv;

var sourceDir = argv.source,
    destDir = argv.dest,
    fileConcurrency = argv.fc,
    apiConcurrency = argv.ac;
      
async.auto({

  // Get a list of filenames that contain features
  filenames: listFiles,
  
  // Extract and save features from the files
  extract: ['filenames', extractFeatures]

}, function(error, results){
  if(error){
    console.error(error);
  }
  console.log('Finished');
});    

/**
 * Get a list of .geojson files that we will
 * extract GeoJSON features from
 */
function listFiles(autoCallback, data){
  fs.readdir(sourceDir, function(error, files){
    if(error){
      autoCallback(error);
    } 
    else {
      var filtered = [];
      for(var i = 0; i < files.length; i++){
        if(files[i].indexOf('.geojson') !== -1) {
          filtered.push(files[i]);
        }
      }
      autoCallback(null, filtered);
    }
  });
};

/**
 * Load a .geojson, extract the features, and save
 * in an intermeddiate OPD format
 */
function extractFeatures(autoCallback, data){
  async.eachSeries(data.filenames, function(filename, eachCallback){
  
    var year = filename.split('_')[2].split('.')[0];
    var featureStream = fs.createReadStream(path.join(sourceDir, filename))
          .pipe(jsonStream.parse(['features',true]));
    var queue = async.queue(saveFeature, fileConcurrency);
    
    queue.drain = function(){
      featureStream.resume();
    };
    
    featureStream.on('data', function(feature){
      featureStream.pause();
      feature.properties.year = year;
      queue.push(feature);
    }).on('end', function(){
      // We're done processing this file
      eachCallback();
    });
  
  }, function(){
    // We're done processing all files
    autoCallback();
  });
};

/**
 * Save a feature by creating/updating the place.json
 * and the .geojson
 */
function saveFeature(feature, queueCallback){

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
        console.error('Error saving %s', filename, error);
      } else {
        
        // Save the .geojson
        var geoFilename = path.join(destDir, feature.properties.GISJOIN + '.' + geonum + '.geojson');
        saveObject(geoFilename, geometry, function(error){
          if(error){
            console.error('Error saving %s', geoFilename, error);
          }
          queueCallback();
        });
      }
    });
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
