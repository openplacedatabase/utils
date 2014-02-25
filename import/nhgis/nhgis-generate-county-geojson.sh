#!/bin/bash
# Unzips a .zip download from NHGIS,
# unzips all .zips inside, and runs
# the ogr2ogr conversion on all resulting
# .shp files to generate .geojson files

# Make sure a valid file was given as the first argument
[[ -e $1 ]] || { 
  echo >&2 "First argument must be a valid file; '$1' given"; 
  exit 1; 
}

basedir=$(dirname $1)
zipname=$(basename $1)
extension="${zipname##*.}"
zipname="${zipname%.*}"

# Make sure the file is a .zip
[[ $extension = "zip" ]] || {
  echo >&2 "File must be a .zip";
  exit 1;
}

# Unzip file if a directory for it doesn't already exist
[[ -d "$basedir/$zipname" ]] || {
  unzip $1 -d $basedir;
}

# Unzip all resulting .zips if they haven't been already
for f in $(find $basedir/$zipname -type f -name "*.zip"); do
  fname=$(basename $f)
  [[ -f "$basedir/$zipname/${fname%.*}.shp" ]] || unzip $f -d $basedir/$zipname;
done

# Make sure output directory exists
[[ -d "$basedir/$zipname/geojsons" ]] || {
  mkdir "$basedir/$zipname/geojsons"
}

# Convert all .shp to .geojson
for f in $(find $basedir/$zipname -type f -name "*.shp"); do
  fname=$(basename $f)
  fname="${fname%.*}"
  echo "Creating $fname.geojson"
  ogr2ogr -f GeoJSON -s_srs EPSG:102003 -t_srs WGS84 -a_srs WGS84 $basedir/$zipname/geojsons/$fname.geojson $basedir/$zipname/$fname.shp
done
