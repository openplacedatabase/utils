# opd-utils

Basic libraries, scripts, and other useful things when dealing with OPD data.

# Install
````
git clone https://github.com/openplacedatabase/utils.git
````

# Included Libraries
There are several helper libraries in the `lib/` directory

## Place Creation
````javascript
var lib = require('<path-to-lib-dir>/create.js'),
    opdClient = require('opd-sdk').createClient(options);

var place = lib.newPlace();

place.addName('name1').addGeoJSON(geojsonObj).addSource('my source');

console.log(place.toString());

place.save(opdClient);

place.getPlace();

place.getGeojson('geojsonid');
````

### newPlace()
Creates a new chainable place representation

### addName(name, [from], [to])
Adds a name to the place object. Throws an error if name is invalid.
**Params**
`name` must be a fully qualified, comma separated, UTF-8 place string.
`from` must be a valid date or null (Default today if not set or null).
`to` must be a valid date or null (Default '9999-12-31' if not set or null).

### addGeoJSON(geojson, [from], [to])
Adds a geojson to the place object. Throws an error if geojson is invalid.
**Params**
`geojson` must be a valid geojson object.
`from` must be a valid date or null (Default today if not set or null).
`to` must be a valid date or null (Default '9999-12-31' if not set or null).

### addSource(source)
Adds a source to the place object. Throws an error if name is invalid.
**Params**
`source` must be a UTF-8 string describing where this data came from.

### save(opdClient)
Saves the place and geojsons using the passed in opdclient (using opdclient.saveMulti()).
**Params**
`opdClient` must be an instance of `opd-sdk` createClient().

### getPlace()
Returns the actual place object.

### getGeoJSON(id)
Returns the actual geojson object identified by `id`. 
`id` is auto-assigned when adding a geojson object to the place.
**Params**
`id` a valid geojson id. Will return null if there is no geojson by that id.

## Place Updating

`// Coming soon.`

# Scripts
Feel free to take these and modify them to import data into OPD.

## Import
Located in `scripts/import/`, these scripts transform a variety of external data sources into OPD places.

## Update
Located in `scripts/update/`, these scripts are handy tools we've written to perform updates on the OPD data.

## Snapshot
Located at `scripts/snapshot.js`, this command will bundle up all of your data into a snapshot file that can be consumed by the `utils/import.js` script.

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