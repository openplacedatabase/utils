var uuid = require('node-uuid'),
    opdSDK = require('opd-sdk');

var create = {};
module.exports = create;


/**
 * Creates a new place with several helper methods 
 */
create.newPlace = function() {
  place = {
    
    /**
     * Our internal representation of the place
     */
    _place : {
      id: uuid.v4(),
      version: 1,
      names: [],
      geojsons: [],
      sources: []
    },

    /**
     * Our internal array of geojsons
     */
    _geojsons : [],

    /**
     * Add a name to our place
     * Second parameter is from (optional), defaults to today
     * Third parameter is to (optional), defaults to 9999-01-01
     */
    addName: function(name) {
      var self = this,
          newName = {
            from: null,
            to: null,
            name: name
          };

      // If we have a second parameter and it is trueish, set from
      if(arguments.length > 1 && arguments[1]) {
        newName.from = arguments[1];
      } else {
        var date = new Date();
        newName.from = date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1,2)+'-'+pad(date.getUTCDate(),2);;
      }

      // If we have a third parameter and it is trueish, set to
      if(arguments.length > 2 && arguments[2]) {
        newName.to = arguments[2];
      } else {
        newName.to = '9999-12-31';
      }

      // Validate newName
      opdSDK.validate.placeName(newName);

      // Add newName to our list of names
      self._place.names.push(newName);

      // Return self for chaining
      return self;
    },

    /**
     * Add a geojson to our place
     * Second parameter is from (optional), defaults to today
     * Third parameter is to (optional), defaults to 9999-01-01
     */
    addGeoJSON: function(geojson) {
      var self = this,
          newGeoJSON = {
            from: null,
            to: null,
            id: self._geojsons.length+1+''
          };

      // Validate geojson object
      opdSDK.validate.geojson(geojson);

      // If we have a second parameter and it is trueish, set from
      if(arguments.length > 1 && arguments[1]) {
        newGeoJSON.from = arguments[1];
      } else {
        var date = new Date();
        newGeoJSON.from = date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1,2)+'-'+pad(date.getUTCDate(),2);
      }

      // If we have a third parameter and it is trueish, set to
      if(arguments.length > 2 && arguments[2]) {
        newGeoJSON.to = arguments[2];
      } else {
        newGeoJSON.to = '9999-12-31';
      }

      // Validate place geojson
      opdSDK.validate.placeGeoJSON(newGeoJSON);

      // Push geojson onto internal array
      self._geojsons.push(geojson);

      // Add newName to our list of names
      self._place.geojsons.push(newGeoJSON);

      // Return self for chaining
      return self;
    },

    /**
     * Add a source to our place
     */
    addSource: function(source) {
      var self = this;

      // Validate source
      opdSDK.validate.placeSource(source);

      // Add source to our list of sources
      self._place.sources.push(source);

      // Return self for chaining
      return self;
    },

    /**
     * Gets the place
     */
    getPlace: function() {
      var self = this;

      // Clone _place
      var clonedPlace = JSON.parse(JSON.stringify(self._place));

      // Return our cloned place
      return clonedPlace;
    },

    /**
     * Gets a geojson by id
     */
    getGeoJSON: function(id) {
      var self = this;

      var geojsonId = parseInt(id) - 1;

      // Return null if id does not exist
      if(!self._geojsons[geojsonId]) {
        return null;
      }

      // Clone geojson
      var clonedGeoJSON = JSON.parse(JSON.stringify(self._geojsons[geojsonId]));

      // Return our cloned geojson
      return clonedGeoJSON;
    },

    /**
     * Saves a place using the passed in client
     */
    save: function(opdClient,callback) {
      var self = this;

      // Create the request object
      var requestObj = {};
      
      requestObj[self._place.id] = self._place;

      for(var x in self._geojsons) {
        requestObj[self._place.id+'/'+(parseInt(x)+1)] = self._geojsons[x];
      }

      opdClient.saveMulti(requestObj,callback);

      return true;
    }

  };

  return place;
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}