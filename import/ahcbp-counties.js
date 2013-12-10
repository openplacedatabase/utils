/**
 * This will create properly formatted data from the Atlas of Historical County Boundaries
 * See http://publications.newberry.org/ahcbp/downloads/united_states.html
 * Make sure to convert the shape files into a geojson file before running this script
 * (Note: you will have to zip the provided shapes dir ebfore running togeojson.js)
 */
 
var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    _ = require('underscore')._,
    uuid = require('node-uuid'),
    sourceFile = __dirname+'/../tmp/counties.geojson',
    outputDir = __dirname+'/../output';




fs.readFile(sourceFile, 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }
 
  data = JSON.parse(data);
  
  var groupings = {};
  
  var currentID = data.features[0].properties.ID;
  var currentPlace = newPlace();
  var currentGeojsons = [];
  
  for(x in data.features) {
    var feature = data.features[x];
    
    //if we are finished with this place
    if(feature.properties.ID != currentID) {
      currentID = feature.properties.ID;
      writePlace(currentPlace,currentGeojsons);
      currentPlace = newPlace();
      currentGeojsons = [];
      //process.exit();
    } else {
      var from = parseInt(feature.properties.START_DATE.substr(0,4));
      var to = parseInt(feature.properties.END_DATE.substr(0,4));
      var name = feature.properties.NAME+', '+feature.properties.STATE_TERR+', United States';
      
      if(currentPlace.from == null || currentPlace.from > from) {
        currentPlace.from = from;
      }
      
      if(currentPlace.to == null || currentPlace.to > to) {
        currentPlace.to = to;
      }
      
      if(!_.contains(currentPlace.names,name)) {
        currentPlace.names.push(name);
      }
      
      currentGeojsons.push(feature.geometry);
      
      currentPlace.geojson.push({
        from:from,
        to:to,
        id:''+currentGeojsons.length
      });
      
    }
  } // End for loop
  
  // Output last place
  writePlace(currentPlace,currentGeojsons);
  
});

//aks_aleutianislands [ 1, 2, 3 ]

function writePlace(place, geojsons) {
  
  //generate uuid
  place.id = uuid.v4();
  
  
  
  //get path and filename
  var filepath = path.join(outputDir,place.id.substr(0,2),place.id.substr(2,2),place.id.substr(4));
  
  //console.log(filepath);
  
  //create path
  if(!fs.existsSync(filepath)) {
    mkdirp.sync(filepath);
  }
  
  //save file(s)
  fs.writeFileSync(path.join(filepath,'place.json'),JSON.stringify(place));
  
  for(x in geojsons) {
    fs.writeFileSync(path.join(filepath,(parseInt(x)+1)+'.geojson'),JSON.stringify(geojsons[x]));
  }
  
}

function newPlace() {
  return {
    id:null,
    version:1,
    names:[],
    from:null,
    to:null,
    geojson:[],
    last_updated:Date.now(),
    user_id:0
  };
}
