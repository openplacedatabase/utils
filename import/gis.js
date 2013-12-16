/**
 * This will create properly formatted data from the GIS data found
 * http://library.thinkquest.org/C006628/GIS.html
 * Make sure to convert the shape files into a geojson file before running this script
 */

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    uuid = require('node-uuid'),
    argv = require('optimist').argv;

if(argv._.length !== 2) {
  console.log('Usage: node import/<script> fromdir todir');
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
 
// A list of files to be processed
var files = [
  {
    'file':'1994.geojson',
    'date':'1994-01-01'
  },
  {
    'file':'1945.geojson',
    'date':'1945-01-01'
  },
  {
    'file':'1938.geojson',
    'date':'1938-01-01'
  },
  {
    'file':'1920.geojson',
    'date':'1920-01-01'
  },
  {
    'file':'1914.geojson',
    'date':'1914-01-01'
  },
  {
    'file':'1880.geojson',
    'date':'1880-01-01'
  },
  {
    'file':'1815.geojson',
    'date':'1815-01-01'
  },
  {
    'file':'1783.geojson',
    'date':'1783-01-01'
  },
  {
    'file':'1715.geojson',
    'date':'1715-01-01'
  },
  {
    'file':'1650.geojson',
    'date':'1650-01-01'
  },
  {
    'file':'1530.geojson',
    'date':'1530-01-01'
  },
  {
    'file':'1492.geojson',
    'date':'1492-01-01'
  }
];

var countries = {};

for(x in files) {
  var fileString = fs.readFileSync(path.join(sourceDir,files[x].file));
  var json = JSON.parse(fileString);
  
  for(i in json.features) {
    var feature = json.features[i];
    
    // Ignore unclaimed areas
    if(feature.properties.NAME == 'unclaimed' || feature.properties.NAME == 'Antarctica') {
      continue;
    }
    
    if(countries[feature.properties.NAME]) {
      
      prevFrom = countries[feature.properties.NAME].from;
      geojsonto = (parseInt(prevFrom.substr(0,prevFrom.indexOf('-')))-1)+'-12-31';
      
      countries[feature.properties.NAME].geojson.unshift({
        from:files[x].date,
        to:geojsonto,
        id:null
      });
      
      countries[feature.properties.NAME].from = files[x].date;
      
      countries[feature.properties.NAME].tmpgeojsons.unshift(feature.geometry);
      
    } else {
      
      countries[feature.properties.NAME] = newPlace();
      countries[feature.properties.NAME].names.push(feature.properties.NAME);
      countries[feature.properties.NAME].from = files[x].date;
      countries[feature.properties.NAME].to = files[x].date;
      
      countries[feature.properties.NAME].geojson.unshift({
        from:files[x].date,
        to:files[x].date,
        id:null
      });
      
      countries[feature.properties.NAME].tmpgeojsons.unshift(feature.geometry);
      
    }
  } // End looping through features
  
}

for(x in countries) {
  var place = countries[x];
  var geojsons = place.tmpgeojsons;
  delete place.tmpgeojsons;
  for(i in place.geojson) {
    place.geojson[i].id = (parseInt(i)+1)+'';
  }
  if(place.to == files[0].date) {
    place.to = '9999-12-31';
  }
  
  writePlace(place, geojsons);
  
}

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
    user_id:0,
    tmpgeojsons:[]
  };
}