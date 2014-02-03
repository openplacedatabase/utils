/**
 * This will create properly formatted data from the Ordnance survey
 * See http://www.ordnancesurvey.co.uk/business-and-government/products/boundary-line.html
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs EPSG:27700 -t_srs WGS84 -a_srs WGS84 district-region.geojson district_borough_unitary_region.shp
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

var processedItems = {};

var count = 0;
var jsonPipe = fs.createReadStream(sourceFile);
var parser = JSONStream.parse(['features',true]);

jsonPipe.pipe(parser).on('data', function(feature) {

  count++;
  if(count%1 == 0) {
    console.log('Processed ',count);
  }
  
  if(!feature.properties.NAME) return;
  
  // Create a new place
  var currentPlace = placeLib.newPlace();

  processedItems[currentPlace._place.id] = feature.properties.NAME;

  var names = [];

  if(feature.properties.NAME.indexOf(' - ') !== -1) {
    names = feature.properties.NAME.split(' - ');
  } else {
    names.push(feature.properties.NAME);
  }

  for(var x in names) {
    var name = names[x];

    // Remove (B)
    if(name.indexOf('(B)') !== -1) {
      name = name.substr(0,name.indexOf('(B)'));
    }

    // Remove District
    if(name.indexOf(' District') !== -1) {
      name = name.substr(0,name.indexOf(' District'));
    }

    // Replace "[x] London Boro" with "London Borough of [x]"
    if(name.indexOf(' London Boro') !== -1) {
      name = 'London Borough of '+name.substr(0,name.indexOf(' London Boro'));
    }

    // Trim the name
    name = name.trim();

    currentPlace.addName(name+', England');
    currentPlace.addName(name+', England, United Kingdom');
  }

  currentPlace.addGeoJSON(feature.geometry);
  currentPlace.addSource('Initially imported using Ordnance Survey data © Crown copyright and database right 2013');

  place.save(opdClient, function(response) {
    for(var x in response) {
      if(response[x].error) {
        var id = x;
        if(id.indexOf('/')) id = id.substr(0,id.indexOf('/'));
        console.log(response[x].error);
        console.log('Error on ',processedItems[id]);
      }
    }
  });
});

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
 