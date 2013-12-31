/**
 * This will create properly formatted data from the Atlas of Historical County Boundaries
 * See http://publications.newberry.org/ahcbp/downloads/united_states.html
 * Make sure to convert the shape files into a geojson file before running this script
 * (Note: you will have to zip the provided shapes dir ebfore running togeojson.js)
 */
 
var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    JSONStream = require('JSONStream'),
    _ = require('underscore')._,
    uuid = require('node-uuid'),
    argv = require('optimist').argv;
    
if(argv._.length !== 2) {
  console.log('Usage: node ahcbp-counties.js fromfile todir');
}
    
var sourceFile = argv._[0];
//add dirname of path doesn't start with /
if(sourceFile.substr(0,1) != '/') {
  var sourceFile = path.join(process.cwd(),sourceFile);
}

var outputDir  = argv._[1];
//add dirname of path doesn't start with /
if(outputDir.substr(0,1) != '/') {
  var outputDir = path.join(process.cwd(),outputDir);
}


var jsonPipe = fs.createReadStream(sourceFile);

var parser = JSONStream.parse(['features',true]);

var count = 0;
var currentID = null;
var currentPlace = newPlace();
var currentGeojsons = [];


jsonPipe.pipe(parser).on('data', function(data) {
  var feature = data;
  
  //take care of first place
  if(currentID == null) currentID = feature.properties.ID;
  
  //if we are finished with this place, write it
  if(feature.properties.ID != currentID) {    
    count++;
    if(count%10 == 0) {
      console.log('Processed ',count);
    }
    currentID = feature.properties.ID;
    writePlace(currentPlace,currentGeojsons);
    currentPlace = newPlace();
    currentGeojsons = [];
  }
  
  var startDate = feature.properties.START_DATE;
  var from = startDate.substr(0,4)+'-'+startDate.substr(5,2)+'-'+startDate.substr(8,2);
  var endDate = feature.properties.END_DATE
  var to = endDate.substr(0,4)+'-'+endDate.substr(5,2)+'-'+endDate.substr(8,2);
  var name = feature.properties.NAME+', United States';
  
  //if to == 2000-12-31, set to 9999-12-31
  if(to == '2000-12-31') to = '9999-12-31';
  
  if(currentPlace.from == null || Date.parse(currentPlace.from) > Date.parse(from)) {
    currentPlace.from = from;
  }
  
  if(currentPlace.to == null || Date.parse(currentPlace.to) < Date.parse(to)) {
    currentPlace.to = to;
  }
  
  if(!_.contains(currentPlace.names,name)) {
    currentPlace.names.unshift(name);
  }
  
  currentGeojsons.push(feature.geometry);
  
  currentPlace.geojson.push({
    from:from,
    to:to,
    id:''+currentGeojsons.length
  });
     
}).on('end', function() {
  //write last place
  writePlace(currentPlace,currentGeojsons);
  console.log('Import Complete');
});

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
