/**
 * This will create properly formatted data from the Ordnance survey
 * See http://www.ordnancesurvey.co.uk/business-and-government/products/boundary-line.html
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs EPSG:27700 -t_srs WGS84 -a_srs WGS84 parishes.geojson parish_region.shp
 */
 
var fs = require('fs'),
    path = require('path'),
    JSONStream = require('JSONStream'),
    argv = require('optimist').argv,
    utils = require('./lib/utils.js');
    
if(argv._.length !== 2) {
  console.log('Usage: node import/<script> fromfile todir');
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
  
  if(!feature.properties.NAME) return;
  
  var name1 = feature.properties.NAME+', '+toTitleCase(feature.properties.FILE_NAME.split('_')[0])+', England';
  var name2 = feature.properties.NAME+', '+toTitleCase(feature.properties.FILE_NAME.split('_').join(' '))+', England';
  
  var currentPlace = utils.newPlace();
  currentPlace.names.push(utils.newName(name1, '2013-09-01'));
  currentPlace.names.push(utils.newName(name2, '2013-09-01'));
  currentPlace.geojsons.push(utils.newGeoJSON(feature.geometry, '2013-09-01'));
  currentPlace.attributions.push('Contains Ordnance Survey data © Crown copyright and database right 2013');
  
  utils.writePlace(outputDir, currentPlace);
});

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}