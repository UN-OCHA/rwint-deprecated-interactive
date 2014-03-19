/* global d3:false */
/* global topojson:false */
/* global queue:false */
/* global ss:false */
/* global Spinner:false */
/* jshint strict: true */
(function () {
  "use strict";

  if (!window.sections) {
    window.sections = {};
  }

  window.sections.map = function (id) {
    function getPixelRatio(context) {
      var backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

      return (window.devicePixelRatio || 1) / backingStore;
    }

    function showLabel() {
      var target = d3.select(d3.event.target);

      if (target.classed('country') || target.classed('municipality')) {
        var data = target.datum().properties,
            name = data.name,
            values = '';

       if (target.classed('municipality')) {
          var stat = stats[dateCurrent][data.code];

          values = ' ' + d3.keys(stat).map(function (k) {
            return '<i class="icon-' + k + '"></i> ' + (stat[k] !== false ? formatter(stat[k]) : 'no data');
          }).filter(function (v) { return v !== ''; }).join(' ');
        }

        label.style('display', 'block')
            .html('<span class="name">' + name + '</span>' + values);
      }
    }

    function hideLabel() {
      label.style('display', 'none');
    }

    function moveLabel() {
      var position = d3.mouse(container.node()),
          x = position[0],
          y = position[1],
          w = parseInt(label.style('width'), 10),
          right = (x > parseInt(container.style('width'), 10) / 2);

      label.classed('left', right).classed('right', !right)
          .style({
            'top': (y - 16) + 'px',
            'left': (right ? x - 32 - w : x + 16) + 'px'
          });
    }

    function addDateSelector() {
      var control = layerControl.select('.top.right').append('div')
          .attr('class', 'control date selector');

      var formatter = d3.time.format.utc('%Y/%m/%d'),
          i, options = [];

      control.append('span')
          .html('Date ');

      for (i = dateMin; i <= dateMax; i = i + 86400000) {
        if (stats.hasOwnProperty(i)) {
          options.push('<option value="' + i + '">' + formatter(new Date(i)) + '</option>');
        }
      }

      control.append('select')
          .on('change', function () {
            dateCurrent = parseInt(this.value, 10);
            updateMap();
          })
          .html(options.reverse().join(''));
    }

    function addIndexSelector() {
      layerControl.select('.top.right').append('div')
          .attr('class', 'control index selector')
          .html(d3.keys(indexes).map(function(k) {
            var checked = (k === activeIndex ? ' checked="checked"' : '');
            return '<input type="radio" name="selection" id="selector-' + k + '" value="' + k + '" ' + checked + '/>' +
                   '<label for="selector-' + k + '"><i class="icon-' + k + '"></i>' + indexes[k] + '</label>';
          }).join('<br/>'))
          .on('click', function() {
            var target = d3.event.target;
            if (target.name === 'selection') {
              activeIndex = target.value;
              updateMap();
            }
          });
    }

    function addLegend() {
      layerControl.select('.top.right').append('div')
          .attr('class', 'control legend');
    }

    function updateLegend(color) {
      var domain = color.domain().slice(0),
          length = domain.unshift(0),
          html = domain.map(function (v, i) {
            var str = '<i style="background:' + color(v) + '"></i>';
            if (i === 0) {
              str += 'no data';
            }
            else if (i === 1) {
              str += '&lt; ' + formatter(domain[i + 1]);
            }
            else if (i === length - 1) {
              str += '&gt; ' + formatter(v + 1);
            }
            else {
              str += formatter(v + 1) + ' - ' + formatter(domain[i + 1]);
            }
            return str;
          }).reverse().join('<br/>');

      html = '<h4><i class="icon-' + activeIndex + '"></i>' + indexes[activeIndex] + '</h4>' + html;

      layerControl.select('.control.legend').html(html);
    }

    function addMiniMap(data) {
      var control = layerControl.select('.bottom.right').append('div')
          .attr('class', 'control minimap');

      var width = 150,
          height = 150,
          mesh = topojson.mesh(data, data.objects.layer1, function(a, b) { return a === b; });

      var path = d3.geo.path().projection(null);

      var b = data.bbox,
          c = [(b[2] + b[0]) / 2, (b[3] + b[1]) / 2],
          s = 1 / Math.max((b[2] - b[0]) / width, (b[3] - b[1]) / height),
          t = [width / 2 - s * c[0], height / 2 - s * c[1]];

      var context = control.append('canvas')
          .attr('width', width)
          .attr('height', height)
          .node().getContext('2d');

      context.translate(t[0], t[1]);
      context.scale(s, s);

      context.strokeStyle = '#ccc';
      context.fillStyle = '#fff';
      context.lineWidth = 0.1;

      path.context(context)(mesh);

      context.fill();
      context.stroke();

      var w = d3.select(window);

      var selection = control.append('svg')
          .attr({width: width, height: height})
          .on({
            'dblclick': function () {
              var x = c[0]  +  (d3.event.offsetX - width / 2) / s,
                  y = c[1]  +  (d3.event.offsetY - height / 2) / s;

              handleZoom(x, y, d3.event.shiftKey ? 0.5 : 2);
              d3.event.preventDefault();
            },
            'mousedown': function () {
              var ox = d3.event.clientX,
                  oy = d3.event.clientY;

              function move() {
                var x = d3.event.clientX,
                    y = d3.event.clientY;
                if (x !== ox || y !== oy) {
                  //minimap.translate(x - ox, y - oy);
                  handleTranslate(-(x - ox) * s, -(y - oy) * s);
                  ox = x; oy = y;
                }
                d3.event.preventDefault();
              }

              function stop() {
                w.on('mousemove', null).on('mouseup', null);
              }

              w.on('mousemove', move).on('mouseup', stop);
              d3.event.preventDefault();
            }
          })
        .append("rect")
          .attr('class', 'selection')
          .attr({x: 0, y: 0, width: width, height: height})
          ;//.attr('vector-effect', 'non-scaling-stroke');

      minimap.focus = d3.select('.focus').node();
      minimap.selection = selection;
      minimap.matrix = [1, 0, 0, 1, 0, 0];
      minimap.update = function () {
        var b = this.focus.getBoundingClientRect(),
            s = Math.min(width / (b.right - b.left), height / (b.bottom - b.top)),
            w = s * window.innerWidth,
            h = s * window.innerHeight,
            x = (width - s * (b.right + b.left)) / 2,
            y = (height - s * (b.bottom + b.top)) / 2;

        this.matrix = [1, 0, 0, 1, 0, 0];
        this.selection.attr({x:x, y:y, width: w, height: h, transform:'none'});
      };
      minimap.translate = function(dx, dy) {
        this.matrix[4] += dx; this.matrix[5] += dy;
        this.selection.attr('transform', 'matrix(' + this.matrix.join(' ') + ')');
      };
    }


    function updateMinimap() {
      if (minimap.update) {
        minimap.update();
      }
    }

    function addZoom() {
      var control = layerControl.select('.top.left').append('div')
          .attr('class', 'control zoom');

      control.append('a')
          .attr('class', 'zoom-in')
          .html('+')
          .on('click', function () { handleZoom(0, 0, 2); });

      control.append('a')
          .attr('class', 'zoom-out')
          .html('-')
          .on('click', function () { handleZoom(0, 0, 0.5); });
    }

    // Draw the map.
    function drawMap(world, boundaries, country, regions, cities) {
      var iso3 = 'PHL';

      // World.
      var groupWorld = svg.append('g')
          .attr('class', 'world');

      // Countries
      groupWorld.append('g')
          .attr('class', 'countries')
        .selectAll('.country')
          .data(topojson.feature(world, world.objects.layer1).features.filter(function(f) {
            return f.properties.iso3 !== iso3;
          }))
        .enter().append('path')
          .attr('class', 'country')
          .attr('d', path);

      // Outer Boundaries.
      groupWorld.append('path')
          .datum(topojson.mesh(world, world.objects.layer1, function(a, b) {
            return a === b && a.properties.iso3 !== iso3;
          }))
          .attr('class', 'boundaries outer')
          .attr('d', path)
          .attr('vector-effect', 'non-scaling-stroke');

      // Inner boundaries.
      d3.values(boundaries.objects).forEach(function (layer, i) {
        groupWorld.append('path')
          .datum(topojson.feature(boundaries, layer))
          .attr('class', 'boundaries inner' + ['', ' dashed', ' dotted'][i])
          .attr('d', path)
          .attr('vector-effect', 'non-scaling-stroke');
      });


      // Focused country.
      var groupCountry = svg.append('g')
          .attr('class', 'focus');

      // Municipalities.
      groupCountry.append('g')
          .attr('class', 'municipalities')
        .selectAll('.municipality')
          .data(topojson.feature(country, country.objects.layer1).features)
        .enter().append('path')
          .attr('class', 'municipality')
          .attr('d', path)
          .attr('vector-effect', 'non-scaling-stroke');

      // Provinces.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a.properties.province !== b.properties.province;
          }))
          .attr('d', path)
          .attr('class', 'boundaries province')
          .attr('vector-effect', 'non-scaling-stroke');

      // Regions.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a.properties.region !== b.properties.region;
          }))
          .attr('d', path)
          .attr('class', 'boundaries region')
          .attr('vector-effect', 'non-scaling-stroke');

      // Outer Boundaries.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a === b;
          }))
          .attr('class', 'boundaries outer')
          .attr('d', path)
          .attr('vector-effect', 'non-scaling-stroke');

      addZoom();
      addDateSelector();
      addIndexSelector();
      addLegend();
      addMiniMap(country);

      createZoom(country.bbox, width, height);
    }

    function setData(data) {
      var formatter = d3.time.format.utc('%m/%d/%y'),
          max = 0, min = new Date().getTime();

      data.forEach(function (d) {
        if (d.date) {
          var date = formatter.parse(d.date).getTime();
          if (!stats.hasOwnProperty(date)) {
            stats[date] = {};
          }

          stats[date][d.code] = {
            affectedPeople: d.affectedPeople ? parseInt(d.affectedPeople, 10) : false,
            IDP: d.IDP ? parseInt(d.IDP, 10) : false,
            damagedHouses: d.damagedHouses ? parseInt(d.damagedHouses, 10) : false
          };

          max = date > max ? date : max;
          min = date < min ? date : min;
        }
      });

      dateMin = min;
      dateMax = max;
      dateCurrent = max;
    }

    var colors = {
      affectedPeople: ['rgb(255, 255, 255)', 'rgb(199, 214, 238)', 'rgb(149, 182, 223)', 'rgb(101, 154, 210)', 'rgb(2, 108, 182)', 'rgb(0, 52, 105)'],
      IDP: ['rgb(255, 255, 255)', 'rgb(255, 241, 226)', 'rgb(254, 208, 158)', 'rgb(244, 121, 50)', 'rgb(201, 90, 35)', 'rgb(160, 68, 30)'],
      damagedHouses: ['rgb(255, 255, 255)', 'rgb(253, 232, 230)', 'rgb(234, 163, 165)', 'rgb(209, 78, 79)', 'rgb(186, 18, 34)', 'rgb(139, 1, 14)']
    };

    // Update choropleth.
    function updateMap() {
      var stat = stats[dateCurrent];

      var values = d3.values(stat).map(function (d) {
        var max = d[activeIndex] || 0,
            magnitude = Math.floor(Math.log(max) / Math.LN10),
            stepHop = Math.pow(10, magnitude),
            stepMax = Math.floor(max / stepHop) * stepHop;

        return stepMax || 0;
      });
      values.unshift(0);

      var domain = ss.jenks(values, 5).slice(1, 5);
      domain.unshift(1);

      var color = d3.scale.threshold()
          .domain(domain)
          .range(colors[activeIndex]);

      svg.selectAll('.municipality')
          .attr('fill', function (d) {
            var code = d.properties.code;
            if (stat.hasOwnProperty(code)) {
              return color(stat[code][activeIndex] || 0);
            }
            return '#fff';
          })
          .attr('stroke', function (d) {
            var code = d.properties.code;
            if (stat.hasOwnProperty(code) && stat[code][activeIndex]) {
              return '#777';
            }
            return '#eee';
          });

      updateLegend(color);
    }

    function createZoom(bbox, width, height) {
      var matrix = [1, 0, 0, 1, 0, 0],
          ctm = svgContainer.node().getScreenCTM(),
          container = svgContainer.node(),
          w = d3.select(window),
          focus = d3.select('.focus').node();

      function resize() {
        ctm = svgContainer.node().getScreenCTM();
        updateMinimap();
      }

      w.on({'resize': resize, 'scroll': resize});

      function convert(x, y, inverse) {
        var point = container.createSVGPoint();
        point.x = x; point.y = y;
        point = point.matrixTransform(inverse ? ctm.inverse() : ctm);
        return [point.x, point.y];
      }

      function mouse() {
        var event = d3.event;
        return convert(event.clientX, event.clientY, true);
      }

      function update(dx, dy, scale) {
        pan(dx, dy);
        zoom(scale);
        svg.attr('transform', 'matrix(' + matrix.join(' ') + ')');
        updateMinimap();
      }

      function pan(dx, dy) {
        matrix[4] += dx ? width / 2 - dx : 0;
        matrix[5] += dy ? height / 2 - dy : 0;
      }

      function zoom(scale) {
        if (scale) {
          for (var i = 0, l = matrix.length; i < l; i++) {
            matrix[i] *= scale;
          }
          pan(scale * width / 2, scale * height / 2);
        }
      }

      svgContainer.on('dblclick', function () {
        var l = mouse();
        update(l[0], l[1], d3.event.shiftKey ? 0.5 : 2);
        d3.event.preventDefault();
      });

      svgContainer.on('mousedown', function () {
        var origin = mouse();

        function move() {
          var l = mouse();
          if (l[0] !== origin[0] || l[1] !== origin[1]) {
            update(width / 2 + origin[0] - l[0], height / 2 + origin[1] - l[1]);
            origin = l;
          }
          d3.event.preventDefault();
        }

        function stop() {
          w.on('mousemove', null).on('mouseup', null);
        }

        w.on('mousemove', move).on('mouseup', stop);
      });

      var b = bbox,
          c = [(b[2] + b[0]) / 2, (b[3] + b[1]) / 2],
          s = 1 / Math.max((b[2] - b[0]) / width, (b[3] - b[1]) / height);

      update(c[0], c[1], s);

      handleZoom = function (dx, dy, scale) {
        if (dx && dy) {
          scale *= matrix[0];
          matrix = [1, 0, 0, 1, 0, 0];
        }
        update(dx, dy, scale);
      };

      handleTranslate = function(dx, dy) {
        update(width / 2 - dx * matrix[0] / s, height / 2 - dy * matrix[0] / s);
      };
    }

    // Load the map data.
    function loadData() {
      var loader = queue();

      spinner.spin(container.node());

      loader
          .defer(d3.csv, 'data/data.csv.json')
          .defer(d3.json, 'data/un.countries.mercator.topojson')
          .defer(d3.json, 'data/un.boundaries.mercator.topojson')
          .defer(d3.json, 'data/un.phl.mercator.topojson')
          .defer(d3.csv, 'data/un.phl.regions.csv.json')
          .defer(d3.csv, 'data/un.phl.cities.csv.json');

      loader.await(function (error, data, world, boundaries, country, regions, cities) {
        spinner.stop();
        if (error === null) {
          setData(data);

          drawMap(world, boundaries, country, regions, cities);

          updateMap();
        }
      });
    }

    /********
     * Main *
     ********/
    var width = 1000,
        height = 650,
        container = d3.select('#' + id),
        spinner = new Spinner(),
        formatter = d3.format(",.0f"),
        indexes = {'affectedPeople': 'Affected People', 'IDP': 'Displaced People', 'damagedHouses': 'Damaged Houses'},
        stats = {},
        activeIndex = 'affectedPeople',
        dateMin = 0, dateMax = 0, dateCurrent = 0,
        minimap = {},
        handleZoom = function () {},
        handleTranslate = function () {};

    // Add layers.
    var layerMap = container.append('div').attr('class', 'layer-map'),
        layerMarker =  container.append('div').attr('class', 'layer-marker'),
        layerControl = container.append('div').attr('class', 'layer-control');

    layerControl.append('div').attr('class', 'top left');
    layerControl.append('div').attr('class', 'top right');
    layerControl.append('div').attr('class', 'bottom right');
    layerControl.append('div').attr('class', 'bottom left');

    // Label.
    var label = layerMarker.append('div')
        .style('display', 'none')
        .attr('class', 'label right');

    var path = d3.geo.path()
        .projection(null)
        .pointRadius(0);

    var svgContainer = layerMap.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height);

    var svgDefs = svgContainer.append('defs');

    var svg = svgContainer.append('g')
        .attr('transform', 'matrix(1 0 0 1 0 0)')
        .on('mousemove', moveLabel)
        .on('mouseover', showLabel)
        .on('mouseout', hideLabel);

    return {
      load: function () {
        // Load the data.
        loadData();
      }
    };
  };

})();
