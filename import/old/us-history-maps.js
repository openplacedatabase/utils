/**
 * This will create properly formatted data from the US History Maps repo
 * See https://github.com/poezn/us-history-maps
 * Make sure to clone this repo before running
 */
 
var fs = require('fs'),
    path = require('path'),
    _ = require('underscore')._,
    argv = require('optimist').argv,
    utils = require('./lib/utils.js');
    
if(argv._.length !== 2) {
  console.log('Usage: node import/<script> from.geojson to-dir');
  process.exit();
}
    
var sourceDir = argv._[0];
//add dirname of path doesn't start with /
if(sourceDir.substr(0,1) != '/') {
  var sourceDir = path.join(process.cwd(),sourceDir);
}

var outputDir  = argv._[1];
//add dirname of path doesn't start with /
if(outputDir.substr(0,1) != '/') {
  var outputDir = path.join(process.cwd(),outputDir);
}

var dateMapping = {
  '1789030':'1789-03-04',
  '1789080':'1789-08-07',
  '1790040':'1790-04-02',
  '1790050':'1790-05-26',
  '1791030':'1791-03-04',
  '1791090':'1791-09-09',
  '1792030':'1792-03-03',
  '1792060':'1792-06-01',
  '1794010':'1794-01-11',
  '1795100':'1795-10-27',
  '1796060':'1796-06-01',
  '1798040':'1798-04-07',
  '1800070':'1800-07-04',
  '1800071':'1800-07-10',
  '1800100':'1800-10-01',
  '1802040':'1802-04-26',
  '1803030':'1803-03-01',
  '1803040':'1803-04-30',
  '1804030':'1804-03-27',
  '1804100':'1804-10-01',
  '1805010':'1805-01-11',
  '1805070':'1805-07-04',
  '1809030':'1809-03-01',
  '1810040':'1810-04-01',
  '1810100':'1810-10-27',
  '1812040':'1812-04-30',
  '1812050':'1812-05-12',
  '1812060':'1812-06-04',
  '1813040':'1813-04-17',
  '1816120':'1816-12-11',
  '1817030':'1817-03-03',
  '1817120':'1817-12-10',
  '1818100':'1818-10-20',
  '1818120':'1818-12-03',
  '1819030':'1819-03-02',
  '1819120':'1819-12-14',
  '1820030':'1820-03-16',
  '1821070':'1821-07-10',
  '1821080':'1821-08-10',
  '1821090':'1821-09-16',
  '1821091':'1821-09-27',
  '1822030':'1822-03-30',
  '1824110':'1824-11-15',
  '1825010':'1825-01-12',
  '1828050':'1828-05-06',
  '1834060':'1834-06-30',
  '1836030':'1836-03-02',
  '1836060':'1836-06-15',
  '1836070':'1836-07-04',
  '1837010':'1837-01-26',
  '1837030':'1837-03-28',
  '1838070':'1838-07-04',
  '1842110':'1842-11-10',
  '1845030':'1845-03-03',
  '1845120':'1845-12-29',
  '1846060':'1846-06-18',
  '1846080':'1846-08-15',
  '1846120':'1846-12-28',
  '1847010':'1847-01-13',
  '1847030':'1847-03-13',
  '1848020':'1848-02-02',
  '1848050':'1848-05-29',
  '1848080':'1848-08-14',
  '1849030':'1849-03-03',
  '1850090':'1850-09-09',
  '1853030':'1853-03-02',
  '1853120':'1853-12-30',
  '1854050':'1854-05-30',
  '1858050':'1858-05-11',
  '1859020':'1859-02-14',
  '1860020':'1860-02-08',
  '1860120':'1860-12-20',
  '1861010':'1861-01-09',
  '1861011':'1861-01-10',
  '1861012':'1861-01-11',
  '1861013':'1861-01-19',
  '1861014':'1861-01-26',
  '1861015':'1861-01-29',
  '1861020':'1861-02-01',
  '1861021':'1861-02-08',
  '1861022':'1861-02-28',
  '1861030':'1861-03-02',
  '1861031':'1861-03-02',
  '1861040':'1861-04-12',
  '1861041':'1861-04-17',
  '1861050':'1861-05-06',
  '1861051':'1861-05-07',
  '1861052':'1861-05-18',
  '1861053':'1861-05-20',
  '1861054':'1861-05-21',
  '1861070':'1861-07-02',
  '1861080':'1861-08-01',
  '1861100':'1861-10-31',
  '1861110':'1861-11-20',
  '1861120':'1861-11-28',
  '1861121':'1861-12-10',
  '1862070':'1862-07-14',
  '1863020':'1863-02-24',
  '1863030':'1863-03-04',
  '1863060':'1863-06-20',
  '1864050':'1864-05-26',
  '1864100':'1864-10-31',
  '1865040':'1865-04-09',
  '1866050':'1866-05-05',
  '1866070':'1866-07-24',
  '1867010':'1867-01-18',
  '1867030':'1867-03-01',
  '1867100':'1867-10-11',
  '1868060':'1868-06-22',
  '1868061':'1868-06-25',
  '1868070':'1868-07-04',
  '1868071':'1868-07-09',
  '1868072':'1868-07-13',
  '1868073':'1868-07-25',
  '1870010':'1870-01-26',
  '1870020':'1870-02-23',
  '1870030':'1870-03-30',
  '1870070':'1870-07-15',
  '1872100':'1872-10-21',
  '1876080':'1876-08-01',
  '1882030':'1882-03-28',
  '1884050':'1884-05-17',
  '1889110':'1889-11-02',
  '1889111':'1889-11-08',
  '1889112':'1889-11-11',
  '1890050':'1890-05-02',
  '1890070':'1890-07-03',
  '1890071':'1890-07-10',
  '1894070':'1894-07-04',
  '1896010':'1896-01-04',
  '1896050':'1896-05-04',
  '1898080':'1898-08-12',
  '1900060':'1900-06-14',
  '1903100':'1903-10-20',
  '1907110':'1907-11-16',
  '1912010':'1912-01-06',
  '1912020':'1912-02-14',
  '1912080':'1912-08-24',
  '1921030':'1921-03-28',
  '1959010':'1959-01-03',
  '1959080':'1959-08-21'
}

var countryGeometries = {};
var states = {};


var files = fs.readdirSync(sourceDir);
if(files.indexOf('.DS_Store') > -1) {
  files.splice(files.indexOf('.DS_Store'),1);
}
files.sort();

for(var x in files) {
  var fileName = files[x];
  
  var fileContents = fs.readFileSync(path.join(sourceDir,fileName));
  var geojson = JSON.parse(fileContents);
  
  if(fileName.substr(0,1) == 'm') {
    processMapgroup(fileName, geojson);
  } else {
    processStates(fileName, geojson);
  }
  
}

//saveUS();

//console.log(states);

saveStates();


/**
 * functions
 */


function processMapgroup(fileName, geojson) {
  
  //loop through features and build geojson
  var newGeometry = {type:'',coordinates:[]};
  
  for(var x in geojson.features) {
    var feature = geojson.features[x];
    
    if(feature.properties.CATEGORY == 'state' || feature.properties.CATEGORY == 'territory') {
      var subFeature = feature.geometry;
      if(subFeature.type == 'Polygon') {
        newGeometry.coordinates.push(subFeature.coordinates);
      } else if(subFeature.type == 'MultiPolygon') {
        newGeometry.coordinates = newGeometry.coordinates.concat(subFeature.coordinates);
      } else {
        console.log('Unknown feature type: ',subFeature.type);
        process.exit();
      }
    }
  }
  
  if(newGeometry.coordinates.length == 1) {
    newGeometry.type = 'Polygon';
    newGeometry.coordinates = newGeometry.coordinates[0];
  } else if(newGeometry.coordinates.length > 1) {
    newGeometry.type = 'MultiPolygon';
  } else {
    console.log('something got botched');
    process.exit();
  }
  
  var name = fileName.split('.')[0].substr(8);
  
  countryGeometries[name] = newGeometry;
}

function processStates(fileName, geojson) {
  
  var name = fileName.split('.')[0];
  
  for(var x in geojson.features) {
    var feature = geojson.features[x];
    
    if(feature.properties.COUNTRY == 'US') {
      
      if(feature.properties.CATEGORY == 'state') {
        if(!feature.properties.STATE) {
          console.log('Bad data');
          process.exit();
        }
        if(!states[feature.properties.STATE]) {
          states[feature.properties.STATE] = {
            state:true,
            names:[],
            geoms:[]
          };
        }
        states[feature.properties.STATE].names.push(feature.properties.LABEL);
        states[feature.properties.STATE].geoms.push({
          date:dateMapping[name],
          geom:feature.geometry
        });
        
      } else if(feature.properties.CATEGORY == 'territory') {
        if(feature.properties.LABEL != 'Unorganized territory') {
          if(!states[feature.properties.LABEL]) {
          states[feature.properties.LABEL] = {
              state:false,
              names:[],
              geoms:[]
            };
          }
          
          states[feature.properties.LABEL].names.push(feature.properties.LABEL);
          states[feature.properties.LABEL].geoms.push({
            date:dateMapping[name],
            geom:feature.geometry
          });
          
        }
      } else if(feature.properties.CATEGORY == 'disputed') {
        // Skip disputed areas
      } else {
        console.log('Unknown Category',feature.properties.CATEGORY);
        process.exit();
      }
    }
  }
}

function saveUS() {  

  var finalGeometries = [];

  var mappingKeys = Object.keys(dateMapping);
  mappingKeys.sort();
  
  //console.log(mappingKeys);
  
  for(var x in mappingKeys) {
    var index = mappingKeys[x];
    
    if(finalGeometries.length == 0 || !_.isEqual(finalGeometries[finalGeometries.length-1].geom,countryGeometries[index])) {
      finalGeometries.push({
        date: dateMapping[index],
        geom: countryGeometries[index]
      });
    }
  }
  
  var currentPlace = utils.newPlace();
  currentPlace.names.push(utils.newName('United States of America',finalGeometries[0].date));
  
  var x;
  for(x = 0; x < finalGeometries.length-1; x++) {
    
    var geom = finalGeometries[x].geom;
    var from = finalGeometries[x].date;
    var toDate = new Date(finalGeometries[x+1].date);
    toDate.setDate(toDate.getDate()-1);
    var to = toDate.getFullYear()+'-'+pad(toDate.getMonth()+1,2)+'-'+pad(toDate.getDate(),2);
    
    currentPlace.geojsons.push(utils.newGeoJSON(geom, from, to));
  }
  
  // Process last geometry
  currentPlace.geojsons.push(utils.newGeoJSON(finalGeometries[x].geom, finalGeometries[x].date));
  
  // Add attribution
  currentPlace.sources.push('Initially imported from https://github.com/poezn/us-history-maps');
  
  // Save US place
  utils.writePlace(outputDir, currentPlace);
}

function saveStates() {
  
  for(var x in states) {
    var state = states[x];
    
    var currentPlace = utils.newPlace();
    
    var names = _.unique(state.names);
    
    for(var y in names) {
      // If it is a state set ending date to 9999
      if(state.state) {
        currentPlace.names.push(utils.newName(names[y]+', United States of America',state.geoms[0].date));
      } else {
        //set ending date to the day before it disappeared
        
        //currentPlace.names.push(utils.newName(names[y]+', United States of America',state.geoms[0].date));
      }
    }
    
    for(var y in state.geoms) {
    
    }
    
    // Add attribution
    currentPlace.sources.push('Initially imported from https://github.com/poezn/us-history-maps');
    
    console.log(currentPlace);
    process.exit();
    
    // Save current place
    //utils.writePlace(outputDir, currentPlace);
    
  }
  
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
