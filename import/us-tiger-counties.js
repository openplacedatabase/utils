/**
 * Download county GIS files from https://data2.nhgis.org/main.
 * 1. Select the "County (by State)" Geographic level in the upper left filters.
 * 2. Use the "GIS boundary files" tab below to browse through and select files by year (use the latest TIGER/Line basis available).
 * 3. Unzip and convert to geojson with bin/us-county-geojson.sh
 */
 
var async = require('async'),
    fs = require('fs'),
    dir = require('node-dir'),
    jsonStream = require('JSONStream'),
    path = require('path'),
    uuid = require('node-uuid'),
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
  extract: ['filenames', extractFeatures],
  
  // Save to OPD API
  save: ['extract', savePlaces]

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
      year = parseInt(feature.properties.year),
      geometry = feature.geometry,
      obj, geonum;
      
  fs.readFile(filename, function(error, data){
    // File doesn't exist
    if(error){
      geonum = 1;
      obj = {
        names: [],
        geojsons: [],
        sources: ["Minnesota Population Center. National Historical Geographic Information System: Version 2.0. Minneapolis, MN: University of Minnesota 2011."]
      };
    } 
    
    // File already exists
    else {
      obj = JSON.parse(data);
      geonum = Object.keys(obj.geojsons).length + 1;
    }
     
    // Update the object
    obj.names.push({
      year: year,
      name: getName(feature)
    });
    obj.geojsons.push({
      year: year,
      id: geonum
    });
    
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
 * Send all resulting place and geojson files to the OPD API
 */
function savePlaces(autoCallback){
  // Get a list of all .json files in the dest directory
  dir.readFiles(destDir, { match: /\.json$/ }, function(error, content, filename, next){
    
    var fileId = filename.split('.')[0],
        place = JSON.parse(content);
    
    // Set the version
    place.version = 1;
    
    // Generate a UUID
    place.id = uuid.v4();
    
    //
    // Calculate the name year spans
    //
    
    // Sort the names by year
    place.names.sort(function(a,b){
      return a.year - b.year;
    });
    
    // Process all but the last one
    for(var i = 0; i < place.names.length - 1; i++){
      var currentName = place.names[i],
          nextName = place.names[i + 1];
      currentName.from = currentName.year + '-01-01';
      currentName.to = (nextName.year - 1) + '-12-31';
      delete currentName.year;
    }
    
    // Handle the last name; it's a special case
    var lastName = place.names[place.names.length - 1];
    lastName.from = lastName.year + '-01-01';
    lastName.to = lastName.year + '-12-31';
    delete lastName.year;
    
    //
    // Calculate the geojson year spans
    //
    
    var geoIds = [];
    
    // Sort the geojsons by year
    place.geojsons.sort(function(a,b){
      return a.year - b.year;
    });
    
    // Process all but the last one
    for(var i = 0; i < place.geojsons.length - 1; i++){
      var currentGeo = place.geojsons[i],
          nextGeo = place.geojsons[i + 1];
      geoIds.push(currentGeo.id);
      currentGeo.from = currentGeo.year + '-01-01';
      currentGeo.to = (nextGeo.year - 1) + '-12-31';
      delete currentGeo.year;
    }
    
    // Handle the last geojson; it's a special case
    var lastGeo = place.geojsons[place.geojsons.length - 1];
    geoIds.push(lastGeo.id);
    lastGeo.from = lastGeo.year + '-01-01';
    lastGeo.to = lastGeo.year + '-12-31';
    delete lastGeo.year;
    
    // Merge matching geojson
    // We have to load them all in memory to compare
    var geos = [];
    async.eachSeries(geoIds, function(geoId, eachCallback){
      fs.readFile(fileId + '.' + geoId + '.geojson', function(error, data){
        if(error) {
          eachCallback(error);
        } else {
          
        }
      });
    }, function(error){
    
    });
    
    // Send the place to the server
    
    // Send the geojsons to the server
    
  }, function(error, files){
    autoCallback(error);
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
