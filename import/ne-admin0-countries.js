/**
 * This will create properly formatted data from the Natural Earth Admin 0 Countries file
 * See http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs WGS84 -t_srs WGS84 -a_srs WGS84 countries.geojson ne_10m_admin_0_countries.shp
 */
 
var fs = require('fs'),
    path = require('path'),
    JSONStream = require('JSONStream'),
    argv = require('optimist').argv,
    utils = require('./lib/utils.js');
    
if(argv._.length !== 2) {
  console.log('Usage: node import/<script> from.geojson to-dir');
  process.exit();
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


var count = 0;

var jsonPipe = fs.createReadStream(sourceFile);
var parser = JSONStream.parse(['features',true]);

jsonPipe.pipe(parser).on('data', function(feature) {
  
  count++;
  if(count%100 == 0) {
    console.log('Processed ',count);
  }
  
  var currentPlace = utils.newPlace();
  
  var name = feature.properties.NAME;
  
  currentPlace.names.push(utils.newName(name));
  currentPlace.geojsons.push(utils.newGeoJSON(feature.geometry));
  currentPlace.sources.push('Initially imported from Natural Earth.');
  
  utils.writePlace(outputDir, currentPlace);
  
});