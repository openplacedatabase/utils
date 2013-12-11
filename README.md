# utils

Utilities for importing, exporting, etc.

# Import Data

Coming soon! (This section will detail how to transform data into the OPD format and submitting it for inclusion)

# Installation

togeojson has an additional requirement of `ogr2ogr` from gdal.
````
// for Ubuntu:
sudo apt-get install gdal-bin
````

# Schema
Below is the version 1 schema for place.json
````javascript
{
  "id":"<UUIDv4>",
  "version":1,
  "names":["<utf8 fully qualified names (comma separated)>"],
  "from":"YYYY-MM-DD",
  "to":"YYYY-MM-DD",
  "geojsons":[
    {
      "from":"YYYY-MM-DD",
      "to":"YYYY-MM-DD",
      "id":"<the relative name of the geojson file, sans .geojson>"
    }
  ]
}
````
The schema for x.geojson is detailed [here](http://geojson.org/geojson-spec.html)

The folder structure for OPD is as follows
````
<root data folder>/
|
+-- 6a/
   |
   +-- 72/
       |
       +-- 44bc-1751-4f64-8089-05458c232a7e/
           |
           +-- place.json
           |
           +-- 1.geojson
           |
           +-- 2.geojson
           .
           .
           .
````
