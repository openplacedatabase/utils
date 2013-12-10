/**
 * This will create properly formatted data from the Atlas of Historical County Boundaries
 * See http://publications.newberry.org/ahcbp/downloads/united_states.html
 * Make sure to convert the shape files into a geojson file before running this script
 * (Note: you will have to zip the provided shapes dir ebfore running togeojson.js)
 */
 
var fs = require('fs'),
    sourceFile = __dirname+'../counties.geojson',
    outputDir = __dirname+'../output';


/*
fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }
 
  data = JSON.parse(data);
  
  var groupings = {};
  
  for(x in data.features) {
    var feature = data.features[x];
    
    if(!groupings[feature.properties.ID]) {
      groupings[feature.properties.ID] = [];
    }
    groupings[feature.properties.ID].push(feature.properties.ID_NUM);
  }
  
  for(x in groupings) {
    console.log(x, groupings[x]);
  }
});
*/