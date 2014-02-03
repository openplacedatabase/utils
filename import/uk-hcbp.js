/**
 * This will create properly formatted data from the Natural Earth Admin 0 map units file
 * See http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-details/
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs WGS84 -t_srs WGS84 -a_srs WGS84 counties.geojson Historic_Counties_of_England-Wales_longlat.shp
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

// We have to map each county to its "country" using the "HCS_CODE"
var mapping = {
  "AGL":"Wales",
  "BED":"England",
  "BER":"England",
  "BRN":"Wales",
  "BUC":"England",
  "CHE":"England",
  "CMB":"England",
  "CNW":"England",
  "CRD":"Wales",
  "CRM":"Wales",
  "CRN":"Wales",
  "CUM":"England",
  "DBH":"Wales",
  "DRB":"England",
  "DRH":"England",
  "DRS":"England",
  "DVN":"England",
  "ESE":"England",
  "FLT":"Wales",
  "GLC":"England",
  "GLM":"Wales",
  "HMP":"England",
  "HNT":"England",
  "HRF":"England",
  "HTF":"England",
  "KNT":"England",
  "LCR":"England",
  "LCS":"England",
  "LNC":"England",
  "MNM":"Wales",
  "MRN":"Wales",
  "MSX":"England",
  "MTG":"Wales",
  "NHB":"England",
  "NHP":"England",
  "NOT":"England",
  "NRF":"England",
  "OXD":"England",
  "PMB":"Wales",
  "RDN":"Wales",
  "RTL":"England",
  "SFF":"England",
  "SHP":"England",
  "SMS":"England",
  "STF":"England",
  "SUR":"England",
  "SUS":"England",
  "WML":"England",
  "WRC":"England",
  "WRW":"England",
  "WTS":"England",
  "YRK":"England"
};

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

  // Create a new place
  var currentPlace = placeLib.newPlace();

  console.log(feature.properties.NAME+' County, '+mapping[feature.properties.HCS_CODE]);

  // TODO match existing counties and enhance if need be

  /*
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
  */
  //place.save(opdClient, function(response) {
  //  console.log(response);
  //});
  
});