/**
 * This will create properly formatted data from the Ordnance survey
 * See http://www.ordnancesurvey.co.uk/business-and-government/products/boundary-line.html
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs EPSG:27700 -t_srs WGS84 -a_srs WGS84 counties.geojson county_region.shp
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
  if(count%10 == 0) {
    console.log('Processed ',count);
  }
  
  var currentPlace = utils.newPlace();
  
  currentPlace.names.push(utils.newName(feature.properties.NAME+', England', '2013-09-01'));
  currentPlace.geojsons.push(utils.newGeoJSON(feature.geometry, '2013-09-01'));
  currentPlace.attributions.push('Contains Ordnance Survey data © Crown copyright and database right 2013');
  
  utils.writePlace(outputDir, currentPlace);
  
});