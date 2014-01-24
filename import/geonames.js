/**
 * This will create properly formatted data from geonames country files
 * See http://download.geonames.org/export/dump/
 *
 * The input directory should have the following files in it.
 * Note that allCountries may be replaces with a country file dump (ie: US.txt)
 *  and specified via commandline --places=US.txt
 * 
 * ./allCountries.txt
 * ./admin1CodesASCII.txt
 * ./admin2Codes.txt
 * ./countryInfo.txt
 *
 */
 
var fs = require('fs'),
    path = require('path'),
    JSONStream = require('JSONStream'),
    csv = require('csv'),
    async = require('async'),
    placeLib = require(path.join(__dirname,'..','lib','create.js')),
    opdSDK = require('opd-sdk'),
    argv = require('optimist')
      .demand(['u', 'p'])
      .default('host','http://localhost:8080')
      .default('c',10)
      .default('places','allCountries.txt')
      .default('admin1','admin1CodesASCII.txt')
      .default('admin2','admin2Codes.txt')
      .default('country','countryInfo.txt')
      .argv;
    
if(argv._.length !== 1) {
  console.log('Usage: node import/<script> from-dir');
  process.exit();
}

// Set the source directory    
var sourceDir = argv._[0];

// Add dirname of path doesn't start with /
if(sourceDir.substr(0,1) != '/') {
  var sourceDir = path.join(process.cwd(),sourceDir);
}

// Create the opdclient
var opdClient = opdSDK.createClient({
      host:argv.host,
      username: argv.u,
      password: argv.p
    });

// Setup the saving queue
var totalSaved = 0;
var queue = async.queue(function(place, callback) {

  place.save(opdClient, function(response) {
    for(var x in response) {
      if(response[x].error) console.log(response[x].error);
    }
    callback();

    if(totalSaved % 1000 === 0) {
      console.log('Processed %d places', index);
    }
  });

  totalSaved++;
}, argv.c);

queue.drain = function() {
  console.log('Done Saving '+totalPlaces+' places');
};

// Ok, process geonames now
var totalPlaces = 0;
async.auto({
  'country': processCountries,
  'admin1': processAdmin1,
  'admin2': processAdmin2,
  'places': ['country', 'admin1', 'admin2', processPlaces]
},
function(error) {
  if(error) console.log(error);
  console.log('Done Processing '+totalPlaces+' places');
});


/**
 * Functions
 */

function processCountries(callback) {
  var data = {},
      countryColumns = ['iso', 'iso3', 'iso_numeric', 'fips',
        'country', 'capital', 'area_sq_km', 'population', 'continent',
        'tld', 'currency_code', 'currency_name', 'phone',
        'postal_code_format', 'postal_code_regex', 'languages',
        'geonameid', 'neighbours', 'equivalent_fips_code'];
  
  csv().from.path(path.join(sourceDir,argv.country), { delimiter: '\t' })
    .on('record', function(row, index){
      if(row.length !== countryColumns.length) {
        return callback('country row ' + index + ' is the wrong length');
      }
      data[row[0]] = row[4];
    })
    .on('error', function(error){
      callback(error);
    })
    .on('end', function(count){
      callback(null, data);
    });
};

/**
 * The first column of the admin1 file is an id of format
 * "{2lettercountrycode}.{number}" such as "GB.07". We
 * store those in an object keyed by country and then the
 * number, such as {'GB': {'07': "name"}}
 */
function processAdmin1(callback) {
  var data = {},
      admin1Columns = ['id','name','ascii','ref-id'];

  csv().from.path(path.join(sourceDir,argv.admin1), { delimiter: '\t' })
    .on('record', function(row, index){
      if(row.length !== admin1Columns.length) {
        return callback('admin1 row ' + index + ' is the wrong length');
      }
      var id = row[0].split('.');
      if(id.length !== 2) {
        console.log('unknown admin1 id format', row[0]);
        return;
      }
      if(data[id[0]] === undefined) {
        data[id[0]] = {};
      }
      data[id[0]][id[1]] = row[1];
    })
    .on('error', function(error){
      callback(error);
    })
    .on('end', function(count){
      callback(null,data);
    });
};

/**
 * The admin2 format is similar to the admin1 format except that
 * it has an additional level of nesting.
 */
function processAdmin2(callback) {
  var data = {}
      admin2Columns = ['id','name','ascii','ref-id'];

  csv().from.path(path.join(sourceDir,argv.admin2), { delimiter: '\t' })
    .on('record', function(row, index){
      if(row.length !== admin2Columns.length) {
        return callback('admin2 row ' + index + ' is the wrong length');
      }
      var id = row[0].split('.');
      if(id.length !== 3) {
        console.log('unkown admin2 id format', row[0]);
      }
      if(data[id[0]] === undefined){
        data[id[0]] = {};
      }
      if(data[id[0]][id[1]] === undefined){
        data[id[0]][id[1]] = {};
      }
      data[id[0]][id[1]][id[2]] = row[1];
    })
    .on('error', function(error){
      callback(error);
    })
    .on('end', function(count){
      callback(null, data);
    });
};

function processPlaces(processCallback, results) {
   
  var fileDone = false,
      filePaused = false,
      counter = 0,
      csvStream,
      placeColumns = [
        'id', 'name', 'ascii_name',
        'alternate_names', 'latitude', 'longitude',
        'feature_class', 'feature_code', 'country_code',
        'cc2', 'admin1_code', 'admin2_code', 
        'admin3_code', 'admin4_code', 'population',
        'elevation', 'dem', 'timezone', 'modified_date'
      ],
      featureClasses = ['P'];
  
  
  csvStream = csv().from.path(path.join(sourceDir,argv.places), { delimiter: '\t', escape: '\\', quote: '' })
    .on('record', function(row, index){
          
      counter++;
    
      if(row.length !== placeColumns.length) {
        console.log('Place row %d is the wrong length', index);
        return;
      }
      
      if(index % 10000 === 0) {
        console.log('Processing place %d', index);
      }
      
      var place = zip(placeColumns, row);
      
      // Filter on feature class
      if(featureClasses.indexOf(place.feature_class) === -1){
        return;
      }

      // Process alternate names
      var alternate_names = [];
      if(place.alternate_names) {
        alternate_names = place.alternate_names.split(',');
      }
      place.alternate_names = alternate_names;
      
      //
      // Calculate the place's administrative heirarchy
      //
      
      var admin2Code = place.admin2_code,
          admin1Code = place.admin1_code,
          countryCode = place.country_code,
          heirarchy = '';
          
      if(admin2Code && results.admin2[countryCode]
          && results.admin2[countryCode][admin1Code]
          && results.admin2[countryCode][admin1Code][admin2Code]) {
        heirarchy += ', ' + results.admin2[countryCode][admin1Code][admin2Code];
      }
      
      if(admin1Code && results.admin1[countryCode] && results.admin1[countryCode][admin1Code]) {
        heirarchy += ', ' + results.admin1[countryCode][admin1Code];
      }
      
      if(countryCode && results.country[countryCode]) {
        heirarchy += ', ' + results.country[countryCode];
      }
      
      // Append administrative heirarchy to name and alternate names
      place.extended_name = place.name + heirarchy;
      for(var i = 0; i < place.alternate_names.length; i++){
        place.alternate_names[i] += heirarchy;
      }
      
      // Create a new place
      var currentPlace = placeLib.newPlace();
      
      // Add the extended name
      currentPlace.addName(place.extended_name);

      // Add alternate names      
      for(var x in place.alternate_names) {
        if(place.alternate_names[x] != place.extended_name) {
          currentPlace.addName(place.alternate_names[x]);
        }
      }
      
      // Hack for england
      if(place.country_code == 'GB') {
        var placesToAdd = [];
        var currentNames = currentPlace.getPlace().names;

        for(var x in currentNames) {
          if(currentNames[x].name.indexOf('England') !== -1) {
            var idx = currentNames[x].name.indexOf(', United Kingdom');
            if(idx !== -1) {
              placesToAdd.push(currentNames[x].name.substr(0,idx));
            }
          }
        }
        for(var x in placesToAdd) {
          currentPlace.addName(placesToAdd[x]);
        }
      }

      // Add geojson
      currentPlace.addGeoJSON({
        'type': 'Point',
        'coordinates': [ parseFloat(place.longitude), parseFloat(place.latitude) ]
      });
      
      // Add source
      currentPlace.addSource('Initially imported from geonames');

      totalPlaces++;

      // Save place
      queue.push(currentPlace);
      
    })
    .on('error', function(error){
      if(!fileDone) {
        console.log(error);
        //console.log('Parse error');
        processCallback(error);
      }
    })
    .on('end', function(count){
      fileDone = true;
      processCallback(null);
    });
  
  
  
};

function zip(keys, values) {
  if(keys.length !== values.length) {
    console.log('length of keys and values does not match');
    process.exit();
  }
  var object = {};
  for(var i = 0; i < keys.length; i++) {
    object[keys[i]] = values[i];
  }
  return object;
};