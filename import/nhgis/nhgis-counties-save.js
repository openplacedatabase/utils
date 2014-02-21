var async = require('async'),
    fs = require('fs'),
    dir = require('node-dir'),
    path = require('path'),
    jsts = require('jsts'),
    area = require('geojson-area').geometry,
    opdSDK = require('opd-sdk'),
    placeLib = require(path.join(__dirname,'..','..','lib','create.js')),
    argv = require('optimist')
      .demand(['u', 'p', 'source'])
      .default('host','http://localhost:8080')
      .describe('source', 'source directory for OPD files')
      .argv;

var sourceDir = argv.source,
    saved = 0,
    opdClient = opdSDK.createClient({
      host: argv.host,
      username: argv.u,
      password: argv.p
    });

// Get a list of all .json files in the dest directory
dir.readFiles(sourceDir, { 
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
  for(var i = 0; i < placeData.names.length; i++){
    
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
        prevName.to = (newName.year - 1) + '-12-31';
        newNames.push(newName);
      }
    }
    
    lastYear = newName.year;
  }

  // Handle the last name because it's a special case
  var lastName = newNames[newNames.length - 1];
  if(newNames.length === 0 || !lastName){
    console.error('bad name in %s', placeFilename);
  }
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
    var geoFile = path.join(sourceDir, fileId + '.' + newGeo.id + '.geojson');
    fs.readFile(geoFile, function(error, geoBuffer){
      
      var geoString = geoBuffer.toString();
      
      if(error){
        return eachCallback(error);
      }
      
      // Set the from date of the geo
      newGeo.from = newGeo.year + '-01-01';
      newGeo.geometry = JSON.parse(geoString);
    
      // If it's the first geo, just save it
      if(newGeos.length === 0){
        newGeos.push(newGeo);
      }
      
      // If it's not the first, compare shape to previous shape
      else {
        var prevGeo = newGeos[newGeos.length-1],
            similarity = calcSimilarity(newGeo.geometry, prevGeo.geometry);
        
        // If the shapes are different, add the new one
        // If they're the same, just skip the new one
        if(similarity < .9999){
          console.log('sim', similarity);
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
        place.addGeoJSON(geo.geometry, geo.from, geo.to);
      }
      
      // Save place
      place.save(opdClient, function(response){
        for(var id in response){
          if(response[id].error){
            console.error(response[id].error);
          }
        }
        saved++;
        if(saved % 100 == 0){
          console.log('Saved %d', saved);
        }
        next();
      });
    }
  });
  
}, function(error, files){
  if(error){
    console.error('Error reading .json place files', error);
  }
  console.log('Finished sending files to the API');
});

/**
 * Calculate similarity of two polygons by doing diff and
 * returning the percentage that the diff is of the original
 */
function calcSimilarity(poly1, poly2){
  
  var a1 = area(poly1),
      a2 = area(poly2);
      
  if(a1 === null || !a2) {
    return Number.MAX_VALUE;
  } else {
    return a1 / a2;
  }
  /*
  try {
    // Calculate the difference
    var reader = new jsts.io.GeoJSONReader()
    var a = reader.read(JSON.stringify(poly1))
    var b = reader.read(JSON.stringify(poly2))
    var diff = a.difference(b);
    var parser = new jsts.io.GeoJSONParser()
    diff = parser.write(diff)

    var aDiff = area.geometry(diff),
        aOrig = area.geometry(poly1);
    
    // Area returns null for invalid inputs
    // Avoid divide by 0 errors
    if(aDiff === null || !aOrig) {
      return Number.MAX_VALUE;
    } else {
      return aDiff / aOrig;
    }
  } catch(e) {
    console.error(e);
    return Number.MAX_VALUE;
  }
  */
}