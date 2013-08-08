(function() {

  /**
   * CSV Layer.
   */
  var CSVLayer = L.FeatureGroup.extend({
    options: {
      style: L.mapbox.marker.style,
      filter: function() { return true; },
      tooltip: function() { return ''; },
      hover: true
    },

    initialize: function(_, options) {
      L.setOptions(this, options);

      this._layers = {};

      if (typeof _ === 'string') {
        this.loadUrl(_);
      }
      else if (_ && typeof _ === 'object') {
        this.setGeoJosn(_);
      }

      if (this.options.hover) {
        this.on('mouseover', function(e) {
          e.layer.openPopup();
        }).on('mouseout', function(e) {
          e.layer.closePopup();
        });
      }
    },

    setGeoJson: function(_) {
      this._geojson = _;
      this.clearLayers();
      this._initialize(_);
    },

    getGeoJson: function(_) {
      return this._geojosn;
    },

    setStyle: function(_) {
      if (_ && typeof _ === 'function') {
        this.options.style = _;
        if (this._geojson) {
          this.clearLayers();
          this._initialize(this._geojson);
        }
      }
    },

    getStyle: function() {
      return this.options.style;
    },

    setTooltip: function(_) {
      if (_ && typeof _ === 'function') {
        this.options.tooltip = _;
        if (this._geojson) {
          this.clearLayers();
          this._initialize(this._geojson);
        }
      }
    },

    getTooltip: function() {
      return this.options.tooltip;
    },

    setFilter: function(_) {
      if (_ && typeof _ === 'function') {
        this.options.filter = _;
        if (this._geojson) {
          this.clearLayers();
          this._initialize(this._geojson);
        }
      }
    },

    getFilter: function() {
      return this.options.filter;
    },

    loadUrl: function(url) {
      var xhr = new XMLHttpRequest();

      xhr.onprogress = function() {};

      xhr.onload = L.bind(function() {
        this.setGeoJson(csv2geojson.csv2geojson(xhr.responseText));
        this.fire('ready');
      }, this);

      xhr.onerror = L.bind(function (error) {
        this.fire('error', {error: error || true});
      }, this);

      xhr.open('GET', url, true);
      xhr.send(null);

      return this;
    },

    _initialize: function(json) {
      var features = L.Util.isArray(json) ? json : json.features;

      if (features) {
        for (var i = 0, l = features.length; i < l; i++) {
          this._initialize(features[i]);
        }
      }
      else if (json.geometries || json.geometry) {
        var layer = L.GeoJSON.geometryToLayer(json, L.bind(this.options.style, this));
        var popupContent = this.options.tooltip(json);

        if (popupContent) {
          layer.bindPopup(popupContent,{
            closeButton: false,
            minWidth: 100
          });
        }

        this.addLayer(layer);
      }
    }
  });

  var CircleLayer = CSVLayer.extend({
    options: {
      circle: {
        property: 'circle_size',  // Circle size feature property.
        color: '#f00',            // Stroke color.
        opacity: 0.8,             // Stroke opacity.
        weight: 2,                // Stroke weight.
        fillColor: '#ED1C24',     // Fill color.
        fillOpacity: 0.6          // Fill opacity.
      },

      style: function(feature, latlon) {
        var radius = feature.properties[this.options.circle.property];
        if (radius) {
          // Get the circle size. Would be better not to have the comma.
          radius = parseInt(radius.replace(',', ''));
        }
        else {
          radius = 10000;
        }

        return L.circle(latlon, radius, this.options.circle);
      }
    }
  });

  var MarkerLayer = CSVLayer.extend({
    options: {
      marker: {
        'marker-size' : 'medium',
        'marker-color' : '#7e7e7e',
        'marker-symbol': 'village',
      },

      style: function(feature, latlon) {
        var properties = feature.properties;
        properties['marker-size'] = this.options.marker['marker-size'];
        properties['marker-color'] = this.options.marker['marker-color'];
        properties['marker-symbol'] = this.options.marker['marker-symbol'];
        return L.marker(latlon, {
          icon: L.AwesomeMarkers.icon({
            icon: 'icon-user',
            color: 'darkblue'
          }),
          title: properties.title,
        });
      }
    }
  });

  /**
   * CSV Graph.
   */
  var CSVGraph = null;

  // Allow to get back an array of resolved/rejected objects.
  if (jQuery.when.all===undefined) {
    jQuery.when.all = function(deferreds) {
      var deferred = new jQuery.Deferred();
      $.when.apply(jQuery, deferreds).then(
        function() {
          deferred.resolve(Array.prototype.slice.call(arguments));
        },
        function() {
          deferred.fail(Array.prototype.slice.call(arguments));
        }
      );
      return deferred;
    }
  }


  L.maptools = {};

  L.maptools.csvlayer = function (_, options) {
      return new CSVLayer(_, options);
  };

  L.maptools.circlelayer = function (_, options) {
      return new CircleLayer(_, options);
  };

  L.maptools.markerlayer = function (_, options) {
      return new MarkerLayer(_, options);
  };
})();