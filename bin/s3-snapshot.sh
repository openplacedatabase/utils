#!/bin/bash
#
# Usage: s3-snapshot.sh <snapshot.zip>

# Make sure the aws cli is installed
hash aws 2>/dev/null || { 
  echo >&2 "The aws cli is not installed.  Aborting."; 
  exit 1; 
}

# Make sure a valid directory was given as the first argument
[[ -d $1 ]] || { 
  echo >&2 "First argument must be a valid directory; '$1' given"; 
  exit 1; 
}

# Make sure zip is installed
hash zip 2>/dev/null || { 
  echo >&2 "zip is not installed.  Aborting."; 
  exit 1; 
}

tmpdir="$1/.s3snaptmp"
cwdir=$(pwd)

# Delete temp directory if it exists
rm -rf $tmpdir

# Create temp directory
mkdir $tmpdir

# Copy from s3
echo "Copying from S3..."
aws s3 cp s3://opd-data $tmpdir --recursive --quiet --exclude '*' --include '*.json' --include '*.geojson'

cd $tmpdir

# Zip
echo "Zipping..."
zip -TmqR $cwdir/snapshot.zip '*'

# Calculate filename
s3name=$(date +%Y-%m-%d)
s3name="$s3name.zip"
echo "Copying $s3name to s3..."
aws s3 cp $cwdir/snapshot.zip s3://openplacedatabase/snapshots/$s3name

# Delete zipfile
rm $cwdir/snapshot.zip