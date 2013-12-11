var ogr2ogr = require('ogr2ogr'),
    path = require('path'),
    fs = require('fs'),
    argv = require('optimist').argv;

if(argv._.length !== 2) {
  console.log('Usage: node togeojson.js fromfile tofile');
}

var fromFile = argv._[0];
//add dirname of path doesn't start with /
if(fromFile.substr(0,1) != '/') {
  var fromFile = path.join(process.cwd(),fromFile);
}

var toFile  = argv._[1];
//add dirname of path doesn't start with /
if(toFile.substr(0,1) != '/') {
  var toFile = path.join(process.cwd(),toFile);
}

//console.log(fromFile);
//console.log(toFile);


var outPipe = fs.createWriteStream(toFile);
var st = ogr2ogr(fromFile).timeout(2147483647).stream();
st.on('error', console.error);
st.pipe(outPipe);