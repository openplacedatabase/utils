#!/bin/bash
# Unzips a .zip download from NHGIS,
# unzips all .zips inside, and runs
# the ogr2ogr conversion on all resulting
# .shp files to generate .geojson files

# Make sure a valid directory was given as the first and second argument
[[ -d $1 ]] || { 
  echo >&2 "First argument must be a valid directory; '$1' given"; 
  exit 1; 
}
[[ -d $2 ]] || { 
  echo >&2 "Second argument must be a valid directory; '$2' given"; 
  exit 1; 
}

# Unzip all resulting .zips if they haven't been already
for inputfile in $(find $1 -type f -name "*.geojson"); do
  echo "processing $inputfile"
  outputfile=$(basename $inputfile)
  node bin/nhgis-all-property-values.js -f $inputfile > $2/$outputfile
done
