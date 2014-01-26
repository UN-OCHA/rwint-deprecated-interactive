(function() {

  var center = L.latLng(11.74, 122.88),
      zoom_min = 1,
      zoom_max = 10,
      zoom = 6;

  var colors = {
    blue: ['rgb(199, 214, 238)', 'rgb(149, 182, 223)', 'rgb(101, 154, 210)', 'rgb(2, 108, 182)', 'rgb(0, 52, 105)'],
    orange: ['rgb(255, 241, 226)', 'rgb(254, 208, 158)', 'rgb(244, 121, 50)', 'rgb(201, 90, 35)', 'rgb(160, 68, 30)'],
    red: ['rgb(253, 232, 230)', 'rgb(234, 163, 165)', 'rgb(209, 78, 79)', 'rgb(186, 18, 34)', 'rgb(139, 1, 14)']
  };

  var Legend = function(legend) {
    legend.getColor = function(value) {
      var grades = legend.grades,
          color = legend.color;
      for (var i = grades.length - 1; i >= 0; i--) {
        if (value > grades[i]) {
          return colors[color][i];
        }
      }
      return 'rgb(255, 255, 255)';
    };
    legend.show = function () {
      map.addControl(this.control);
    };
    legend.hide = function () {
      map.removeControl(this.control);
    };
    legend.control =  L.control({position: 'topright'});
    legend.control.onAdd = function() {
      var div = L.DomUtil.create('div', 'info legend'),
          grades = legend.grades;
      div.innerHTML = '<h4><i class="' + legend.icon + '"></i> ' + legend.title + '</h4>';
      for (var i = grades.length - 1; i >= 0; i--) {
        div.innerHTML += '<i style="background:' + legend.getColor(grades[i] + 1) + ';"></i> ';
        if (i === 0) {
          div.innerHTML += '&lt; ' + commas(grades[i]) + '<br/>';
        }
        else if (grades[i + 1]) {
          div.innerHTML += commas(grades[i] + 1) + ' &ndash; ' + commas(grades[i + 1]) + '<br/>';
        }
        else {
          div.innerHTML += '&gt; ' + commas(grades[i] + 1) + '<br/>';
        }
      }
      div.innerHTML += '<i style="background:rgb(255, 255, 255);"></i> no data';
      return div;
    };
    return legend;
  }

  var legends = {
    affectedPeople: new Legend({
      title: 'Affected People',
      icon: 'icon-people_affected_population',
      color: 'blue',
      grades: [0, 30000, 60000, 90000, 120000]
    }),
    damagedHouses: new Legend({
      title: 'Damaged Houses',
      icon: 'icon-damage_house_affected',
      color: 'red',
      grades: [0, 1000, 2000, 5000, 10000]
    }),
    IDP: new Legend({
      title: 'People Displaced',
      icon: 'icon-crisis_population_displacement',
      color: 'orange',
      grades: [0, 20000, 40000, 60000, 80000]
    }),
    setActiveLayer: function (activeLayer) {
      if (activeLayer !== this.activeLayer) {
        if (this.activeLayer) {
          this[this.activeLayer].hide();
        }
        this.activeLayer = activeLayer;
        this[this.activeLayer].show();
      }
    },
    getActiveLayer: function () {
      return this.activeLayer;
    },
    getColor: function (data) {
      return this[this.activeLayer].getColor(data[this.activeLayer] || 0);
    },
  }

  var data, json;

  function getColor(value) {
    return legends[activeLayer].getColor(value);
  }

  // Style a geographical area.
  function styleArea(feature) {
    var pcode = parseInt(feature.properties.MunipCode, 10),
        area = data[pcode],
        fillColor = 'rgb(255, 255, 255)';

    if (typeof area !== 'undefined') {
      fillColor = legends.getColor(area);
    }

    return {
      color: '#ccc',
      weight: 1,
      fillOpacity: 1,
      fillColor: fillColor
    };
  }

  function capitalize(str) {
    return str.toLowerCase().replace(/\b./g, function(c){ return c.toUpperCase(); });
  }

  function commas(str) {
    return (str + '').replace(/.(?=(?:.{3})+$)/g, '$&,');
  }

  function load(url, callback) {
    synchronize(true);
    cors.get(url, function(data) {
      callback(data);
      synchronize();
    });
  }

  // Synchronize data loading.
  var synchronized = 0;
  function synchronize(add) {
    if (add) {
      synchronized++;
      map.spin(true);
    }
    else {
      synchronized--;
      map.spin(false);
    }

    if (data && json && synchronized === 0) {
      layer.addData(json);
    }
  }

  // Create the map.
  var map = L.mapbox.map('map', null, {
    minZoom: zoom_min,
    maxZoom: zoom_max,
    center: center,
    zoom: zoom
  });


  var selector = L.control({position: 'topright'});
  selector.onAdd = function () {
    var div = L.DomUtil.create('div', 'selector info');
    div.innerHTML = '<input type="radio" name="layer-selection" value="affectedPeople" checked="checked"/><i class="icon-people_affected_population blue"></i> Affected People<br/>' +
                    '<input type="radio" name="layer-selection" value="damagedHouses"/><i class="icon-damage_house_affected red"></i> Damaged Houses<br/>' +
                    '<input type="radio" name="layer-selection" value="IDP"/><i class="icon-crisis_population_displacement orange"></i> People Displaced';
    L.DomEvent.addListener(div, 'click', function (event) {
      if (event.target.name === 'layer-selection') {
        legends.setActiveLayer(event.target.value);
        layer.setStyle(styleArea);
      }
    });
    return div;
  };
  selector.addTo(map);

  legends.setActiveLayer('affectedPeople');

  // Load the map tiles and add the minimap once loaded.
  L.mapbox.tileLayer('reliefweb.1_AVMU_World').on('ready', function () {
    // Add a minimap.
    var minimap = new L.Control.MiniMap(L.mapbox.tileLayer('reliefweb.1_AVMU_World'), {
      zoomLevelOffset: -3,
      toggleDisplay: true,
      width: 160,
      height: 160
    }).addTo(map);
  }).addTo(map);

  function format(value) {
    return value ? commas(value) : 'no data';
  }

  var layer = new L.TopoJSON(null, {
    style: styleArea,
    onEachFeature: function (feature, layer) {
      var properties = feature.properties,
          pcode = parseInt(properties.MunipCode, 10),
          munipName = properties.MunipName.toLowerCase(),
          label = '<span class="munip-name">' + munipName + '</span>';

      if (data[pcode]) {
        var affectedPeople = '<i class="icon-people_affected_population blue"></i> ' + format(data[pcode].affectedPeople),
            damagedHouses = '<i class="icon-damage_house_affected red"></i> ' + format(data[pcode].damagedHouses),
            IDP = '<i class="icon-crisis_population_displacement orange"></i> ' + format(data[pcode].IDP);

        label += ' ' + affectedPeople + ' ' + damagedHouses + ' ' + IDP;
      }

      layer.bindLabel(label, {
        className: 'label',
        direction: 'auto'
      });
    }
  }).addTo(map);

  // Load the geographical data.
  load('data3.topojson', function (jsonData) {
    json = JSON.parse(jsonData);
  });

  // Load the humanitarian data.
  load('data.csv', function (csvData) {
    var rows = CSV.parse(csvData),
        i, l, row, info = {};

    for (i = 1; row = rows[i]; i++) {
      info[parseInt(row[31], 10)] = {
        /*municipality: row[30],
        province: row[29],
        region: row[28],*/
        damagedHouses: parseInt(row[23], 10),
        IDP: parseInt(row[22], 10),
        affectedPeople: parseInt(row[8], 10)
      };
    }
    data = info;
  });

})();
