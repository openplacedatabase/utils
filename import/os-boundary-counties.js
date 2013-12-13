/**
 * This will create properly formatted data from the Ordnance survey
 * See http://www.ordnancesurvey.co.uk/business-and-government/products/boundary-line.html
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs tmp/os-boundary/county_region.prj -t_srs EPSG:4326 -a_srs EPSG:4326 tmp/uk-counties.geojson tmp/os-boundary/county_region.shp
 */
 
var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    JSONStream = require('JSONStream'),
    _ = require('underscore')._,
    uuid = require('node-uuid'),
    argv = require('optimist').argv;
    
if(argv._.length !== 2) {
  console.log('Usage: node import/<script> fromfile todir');
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


jsonPipe.pipe(parser).on('data', function(data) {
  var feature = data;
  
  count++;
  if(count%10 == 0) {
    console.log('Processed ',count);
  }
  
  var currentPlace = newPlace();
  
  currentPlace.from = '2013-09-01';
  currentPlace.to = '9999-12-31';
  currentPlace.names = [
    feature.properties.NAME+', England'
  ];
  
  currentPlace.geojson.push({
    from:currentPlace.from,
    to:currentPlace.to,
    id:'1'
  });
  
  var currentGeojsons = [feature.geometry];
  
  writePlace(currentPlace,currentGeojsons);
  
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