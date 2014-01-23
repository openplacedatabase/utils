# opd-utils

Basic utility scripts for managing OPD data.

# Install
````
npm install opd-utils --save

````

OR

````
git clone https://github.com/openplacedatabase/utils.git
````

# Using as a library

````javascript
var opdUtils = require('opd-utils');

````


## Validation

## Place creation utilities

### newPlace()

## Place updating utility


### updatePlace

# Scripts
Feel free to take these and modify them to import data into OPD.

## Import

## Update

## Snapshot
This command will bundle up all of your data into a snapshot file that can be consumed by the `utils/import.js` script

````shell
snapshot.js
````


# Misc
Here are a few things that are useful.

## ogr2ogr
Convert shapfiles (.shp) to GEOJSON

````shell
// Ubuntu installation
sudo apt-get install gdal-bin
````

## ArcGIS Explorer
A wonderful online tool for viewing shape files. [link](http://www.arcgis.com/explorer/)

# License
[MIT](LICENSE.md)