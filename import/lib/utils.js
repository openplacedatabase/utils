var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    uuid = require('node-uuid');

module.exports = {
  newPlace: newPlace,
  newName: newName,
  newGeoJSON: newGeoJSON,
  writePlace: writePlace
};

function writePlace(outputDir, place) {
  
  //generate uuid
  place.id = uuid.v4();
  
  //get path and filename
  var filepath = path.join(outputDir,place.id.substr(0,2),place.id.substr(2,2),place.id.substr(4));
  
  //console.log(filepath);
  
  //create path
  if(!fs.existsSync(filepath)) {
    mkdirp.sync(filepath);
  }
  
  //save out geojsons
  for(x in place.geojsons) {
    fs.writeFileSync(path.join(filepath,(parseInt(x)+1)+'.geojson'),JSON.stringify(place.geojsons[x].id));
    place.geojsons[x].id = (parseInt(x)+1) + '';
  }
  
  //save place file
  fs.writeFileSync(path.join(filepath,'place.json'),JSON.stringify(place));
  
}

/**
 * Create a name object
 * name - a fully qualified UTF-8 String
 * from(opt) - the from date in YYYY-MM-DD format. Defaults to today
 * to(opt) - the to date in YYYY-MM-DD format. Defaults to 9999-12-31
 */
function newPlace() {
  return {
    id:null,
    version:1,
    names:[],
    geojsons:[],
    attributions:[]
  };
}

/**
 * Create a name object
 * name - a fully qualified UTF-8 String
 * from(opt) - the from date in YYYY-MM-DD format. Defaults to today
 * to(opt) - the to date in YYYY-MM-DD format. Defaults to 9999-12-31
 */
function newName(name) {
  
  var date = new Date();
  
  switch(arguments.length) {
    case 1:
      from = date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1,2)+'-'+pad(date.getUTCDate(),2);
      to = '9999-12-31';
      break;
    case 2:
      from = arguments[1];
      to = '9999-12-31';
      break;
    default:
      from = arguments[1];
      to = arguments[2];
      break;
  }
  
  //TODO validate name, from, and to
  
  return {
    from:from,
    to:to,
    name:name
  };
}

/**
 * Create a geojson object. Note that this is for importing,
 * as writePlace will split out the geojson into a separate file.
 * geojson - a geojson object
 * from(opt) - the from date in YYYY-MM-DD format. Defaults to today
 * to(opt) - the to date in YYYY-MM-DD format. Defaults to 9999-12-31
 */
function newGeoJSON(geojson) {
  
  var date = new Date();
  
  switch(arguments.length) {
    case 1:
      from = date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1,2)+'-'+pad(date.getUTCDate(),2);
      to = '9999-12-31';
      break;
    case 2:
      from = arguments[1];
      to = '9999-12-31';
      break;
    default:
      from = arguments[1];
      to = arguments[2];
      break;
  }
  
  //TODO validate geojson, from, and to
  
  return {
    from:from,
    to:to,
    id:geojson
  };
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}