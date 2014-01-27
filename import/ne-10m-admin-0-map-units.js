/**
 * This will create properly formatted data from the Natural Earth Admin 0 map units file
 * See http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-details/
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs WGS84 -t_srs WGS84 -a_srs WGS84 countries.geojson ne_10m_admin_0_map_units.shp
 */

 var fs = require('fs'),
    path = require('path'),
    JSONStream = require('JSONStream'),
    placeLib = require(path.join(__dirname,'..','lib','create.js')),
    opdSDK = require('opd-sdk'),
    argv = require('optimist')
      .demand(['u', 'p'])
      .default('host','http://localhost:8080')
      .argv;

if(argv._.length !== 1) {
  console.log('Usage: node import/<script> from.geojson to-dir');
  process.exit();
}
    
var sourceFile = argv._[0];
//add dirname of path doesn't start with /
if(sourceFile.substr(0,1) != '/') {
  var sourceFile = path.join(process.cwd(),sourceFile);
}

// Create the opdclient
var opdClient = opdSDK.createClient({
      host:argv.host,
      username: argv.u,
      password: argv.p
    });

var count = 0;

var jsonPipe = fs.createReadStream(sourceFile);
var parser = JSONStream.parse(['features',true]);

jsonPipe.pipe(parser).on('data', function(feature) {
  
  // Skip everything except england and wales
  if(feature.properties.NAME_LONG != 'England' && feature.properties.NAME_LONG != 'Wales') return;

  // Create a new place
  var currentPlace = placeLib.newPlace();
  
  var names = []

  // Add the extended name
  names.push(feature.properties.NAME_LONG);
  
  if(feature.properties.NAME_LONG && names.indexOf(feature.properties.NAME_LONG) < 0) {
    names.push(feature.properties.NAME_LONG);
  }
  
  if(feature.properties.FORMAL_EN && names.indexOf(feature.properties.FORMAL_EN) < 0) {
    names.push(feature.properties.FORMAL_EN);
  }
  
  if(feature.properties.FORMAL_FR && names.indexOf(feature.properties.FORMAL_FR) < 0) {
    names.push(feature.properties.FORMAL_FR);
  }
 
  for(var x in names) {
    currentPlace.addName(names[x]);
  }
  
  currentPlace.addGeoJSON(feature.geometry);
  currentPlace.addSource('Initially imported from Natural Earth.');
  
  console.log(currentPlace._place);

  place.save(opdClient, function(response) {
    console.log(response);
  });
  
});