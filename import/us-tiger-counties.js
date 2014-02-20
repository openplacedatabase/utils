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
    opdSDK = require('opd-sdk'),
    placeLib = require(path.join(__dirname,'..','lib','create.js')),
    argv = require('optimist')
      .demand(['u', 'p', 'source', 'dest'])
      .default('host','http://localhost:8080')
      .describe('source', 'source directory for year geojson files')
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
    
var opdClient = opdSDK.createClient({
  host: argv.host,
  username: argv.u,
  password: argv.p
});
      
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
        geojsons: []
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
  dir.readFiles(destDir, { 
    match: /\.json$/,
    shortName: true
  }, function(error, content, placeFilename, next){
    
    if(error){
      console.error('Could not open file', error);
      next();
    }
    
    var fileId = placeFilename.split('.')[0],
        placeData = JSON.parse(content),
        place = placeLib.newPlace();
    
    // Add the NHGIS citation
    place.addSource("Minnesota Population Center. National Historical Geographic Information System: Version 2.0. Minneapolis, MN: University of Minnesota 2011.");
    
    //
    // Calculate the name year spans
    //
    
    // Sort the names by year
    placeData.names.sort(function(a,b){
      return a.year - b.year;
    });
    
    var newNames = [], lastYear;
    for(var i = 0; i < placeData.names.length - 1; i++){
      
      var newName = placeData.names[i];
      newName.from = newName.year + '-01-01';
      
      // If this is the first name, just save it
      if(newNames.length === 0){
        newNames.push(newName);
      } else {
        
        // If this does not match the previous name
        // update the previous name's year and
        // save the new one
        var prevName = newNames[newNames.length-1];
        if(prevName.name !== newName.name){
          prevName.to = (prevName.year - 1) + '-12-31';
          newNames.push(newName);
        }
      }
      
      lastYear = newName.year;
    }

    // Handle the last name because it's a special case
    var lastName = newNames[newNames.length - 1];
    lastName.to = lastYear + '-12-31';
    
    // Add the names to the place object
    for(var i = 0; i < newNames.length; i++){
      var name = newNames[i];
      place.addName(name.name, name.from, name.to);
    }
    
    //
    // Process geojsons
    // Calculate year spans and merge matching shapes
    //
    
    // Sort the geojsons by year
    placeData.geojsons.sort(function(a,b){
      return a.year - b.year;
    });
    
    var newGeos = [], lastYear;
    async.eachSeries(placeData.geojsons, function(newGeo, eachCallback){
      
      // Load the file
      var geoFile = path.join(destDir, fileId + '.' + newGeo.id + '.geojson');
      fs.readFile(geoFile, function(error, geoBuffer){
        
        var geoString = geoBuffer.toString();
        
        if(error){
          return eachCallback(error);
        }
        
        // Set the from date of the geo
        newGeo.from = newGeo.year + '-01-01';
        newGeo.string = geoString;
      
        // If it's the first geo, just save it
        if(newGeos.length === 0){
          newGeos.push(newGeo);
        }
        
        // If it's not the first, compare shape to previous shape
        else {
          var prevGeo = newGeos[newGeos.length-1];
          
          // If the shapes are different, add the new one
          // If they're the same, just skip the new one
          if(prevGeo.string !== geoString){
            prevGeo.to = (newGeo.year - 1) + '-12-31';
            newGeos.push(newGeo);
          }  
        }
        
        // This is used to update the .to of the last geo
        // when we're done processing all of the geos. This
        // allows us to dynamically determine when our data
        // ends, as well as handle the case where the last
        // geo is skipped/merged because it matches the geo
        // before it.
        lastYear = newGeo.year
        
        eachCallback();
      });
    }, 
    
    // Done opening and processing all .geojson files
    function(error){
      
      // Error opening a .geojson file
      if(error){
        console.error('Error opening geojson files for %s', placeFilename, error);
        next();
      } 

      else {
        
        // Update the .to of the last geo
        var lastGeo = newGeos[newGeos.length-1];
        lastGeo.to = lastYear + '-12-31';
        
        // Add the geojsons to the place (parse geojson string)
        for(var i = 0; i < newGeos.length; i++){
          var geo = newGeos[i];
          place.addGeoJSON(JSON.parse(geo.string), geo.from, geo.to);
        }
        
        // Save place
        place.save(opdClient, function(response){
          for(var id in response){
            if(response[id].error){
              console.error(response[id].error);
            }
          }
          next();
        });
      }
    });
    
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
