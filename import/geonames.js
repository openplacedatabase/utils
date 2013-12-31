/**
 * This will create properly formatted data from the Natural Earth Populated Places file
 * See http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/
 * Make sure to convert the shape files into a geojson file before running this script
 * ogr2ogr -f GeoJSON -s_srs WGS84 -t_srs WGS84 -a_srs WGS84 places.geojson ne_10m_populated_places.shp
 */
 
var fs = require('fs'),
    path = require('path'),
    JSONStream = require('JSONStream'),
    argv = require('optimist').argv,
    csv = require('csv'),
    async = require('async'),
    utils = require('./lib/utils.js'),
    
    //
    // Variables for csv download and processings
    //
    localDir = '/srv/tmp/geonames',
    placesFilename = 'allCountries.txt',
    admin1Filename = 'admin1CodesASCII.txt',
    admin2Filename = 'admin2Codes.txt',
    countryFilename = 'countryInfo.txt',
    placeColumns = [
      'id', 'name', 'ascii_name',
      'alternate_names', 'latitude', 'longitude',
      'feature_class', 'feature_code', 'country_code',
      'cc2', 'admin1_code', 'admin2_code', 
      'admin3_code', 'admin4_code', 'population',
      'elevation', 'dem', 'timezone', 'modified_date'
    ],
    admin1Columns = ['id','name','ascii','ref-id'],
    admin2Columns = ['id','name','ascii','ref-id'],
    countryColumns = ['iso', 'iso3', 'iso_numeric', 'fips',
      'country', 'capital', 'area_sq_km', 'population', 'continent',
      'tld', 'currency_code', 'currency_name', 'phone',
      'postal_code_format', 'postal_code_regex', 'languages',
      'geonameid', 'neighbours', 'equivalent_fips_code'],
    featureClasses = ['A', 'P'];
    
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


async.auto({
  'country': processCountries,
  'admin1': processAdmin1,
  'admin2': processAdmin2,
  'places': ['country', 'admin1', 'admin2', processPlaces]
},
function(error) {
  console.log('Done processing files');
});


function processCountries(callback) {
  var data = {};
  csv().from.path(localDir + '/' + countryFilename, { delimiter: '\t' })
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
  var data = {};
  csv().from.path(localDir + '/' + admin1Filename, { delimiter: '\t' })
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
  var data = {};
  csv().from.path(localDir + '/' + admin2Filename, { delimiter: '\t' })
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
      csvStream;
  
  
  csvStream = csv().from.path(sourceFile, { delimiter: '\t', escape: '\\', quote: '' })
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
      
      // Only import GB for now
      if(place.country_code !== 'GB' && place.country_code !== 'US') {
        return;
      }
      
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
      
      var currentPlace = utils.newPlace();
      
      
      
      currentPlace.names.push(utils.newName(place.extended_name));
      
      for(var x in place.alternate_names) {
        currentPlace.names.push(utils.newName(place.alternate_names[x]));
      }
      
      currentPlace.geojsons.push(utils.newGeoJSON(
        {
          'type': 'Point',
          'coordinates': [ parseFloat(place.longitude), parseFloat(place.latitude) ]
        },
        '2013-09-01')
      );
      currentPlace.sources.push('Initially imported from geonames');
      
      utils.writePlace(outputDir, currentPlace);
      
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