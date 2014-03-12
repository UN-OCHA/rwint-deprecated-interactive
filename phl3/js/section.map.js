(function () {

  if (!window.sections) {
    window.sections = {};
  }

  window.sections.map = function (id) {
    function showLabel() {
      var target = d3.select(d3.event.target);

      if (target.classed('country') || target.classed('municipality')) {
        var data = target.datum().properties,
            name = data.name,
            values = '';

        if (target.classed('country')) {
          var iso3 = data.iso3;
          values = ' (' + iso3 + ')';
        }
        else if (target.classed('municipality')) {
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
          w = parseInt(label.style('width')),
          right = (x > parseInt(container.style('width')) / 2);

      label.classed('left', right).classed('right', !right)
          .style({
            'top': (y - 16) + 'px',
            'left': (right ? x - 32 - w : x + 16) + 'px'
          });
    }

    function addDateSelector() {
      var control = layerControl.select('.top.right').append('div')
          .attr('class', 'control year selector');

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
            dateCurrent = parseInt(this.value);
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

    function addZoom() {
      var control = layerControl.select('.top.left').append('div')
          .attr('class', 'control zoom');

      control.append('a')
          .attr('class', 'zoom-in')
          .html('+')
          .on('click', function () { applyZoom(1); });

      control.append('a')
          .attr('class', 'zoom-out')
          .html('-')
          .on('click', function () { applyZoom(-1); });
    }

    // Redraw the map based on the zoom level or translation.
    function applyZoom(offset, multiplier) {
      if (!d3.event || d3.event.type !== 'zoom') {
        var t = zoom.translate(),
            s = zoom.scale(),
            c = zoom.center(),
            d = zoom.scaleExtent(),
            m = multiplier || 1,
            o = offset || 0,
            n = Math.log(s * m) / Math.LN2,
            k = (o >= 0 ? Math.floor(n) : Math.ceil(n)) + o,
            l = [(c[0] - t[0]) / s, (c[1] - t[1]) / s],
            z = Math.max(d[0], Math.min(d[1], Math.pow(2, k))),
            p = [l[0] * z + t[0], l[1] * z + t[1]];

        zoom.scale(z);
        zoom.translate([t[0] + c[0] - p[0], t[1] + c[1] - p[1]]);
      }
      scaleMap();
    }

    function scaleMap() {
      var t = zoom.translate(),
          s = zoom.scale(),
          dashArray = ['none', [2 / s, 2 / s].join(','), 1 / s];

      svg.attr('transform', 'translate(' + t.join(',') + ')scale(' + s + ')');

      svg.selectAll('.municipality')
        .attr('stroke-width', 0.2 / s);

      svg.selectAll('.boundaries.outer')
        .attr('stroke-width', 0.2 / s);

      svg.selectAll('.boundaries.inner')
        .attr('stroke-width', 0.2 / s)
        .attr('stroke-dasharray', function (d) { return dashArray[d.properties.type]; });

      /*projection.translate([projectionTranslate[0] + t[0], projectionTranslate[1] + t[1]]);
      projection.scale(projectionScale * s);
      drawCanvas();*/
    }

    function getPixelRatio(context) {
      var backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

      return (window.devicePixelRatio || 1) / backingStore;
    }

    function drawCanvas() {
      context.clearRect(0, 0, canvas.attr('width'), canvas.attr('height'));

      context.strokeStyle = '#766951';
      context.fillStyle = '#d7c7ad';

      context.beginPath();

      path.context(context)(canvas.datum());

      context.fill();
      context.stroke();
    }

    // Draw the map.
    function drawMap(world, boundaries, country) {
      /*var json = topojson.feature(world, world.objects.layer1);

      json.features = json.features.filter(function(feature) {
        return feature.properties.iso3 !== 'PHL';
      });

      canvas.datum(json);

      drawCanvas();

      addZoom();

      return;*/


      var dashArray = ['none', '2,2', '1'];

      var features = topojson.feature(world, world.objects.layer1).features.filter(function(f) { return f.properties.iso3 !== 'PHL'; });

      // Add the countries.
      svg.selectAll('.country')
          .data(features)
        .enter().append('path')
          .attr('class', function (d) { return 'country ' + d.properties.iso3; })
          .attr('d', path)
          .attr('fill', '#fff')
          .attr('stroke', 'none');

      // Add the focused country.
      svg.append('g')
          .attr('class', 'focus')
        .selectAll('.municipality')
          .data(topojson.feature(country, country.objects.layer1).features)
        .enter().append('path')
          .attr('class', 'municipality')
          .attr('d', path)
          .attr('fill', '#fff')
          .attr('stroke', 'none');
          //.attr('stroke', '#f00')
          //.attr('stroke-width', 0.2);

      /*svg.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) { return a !== b; }))
          .attr('d', path)
          .attr('class', 'boundaries inner')
          .attr('fill', 'none')
          .attr('stroke', '#ccc')
          .attr('stroke-width', 0.2);*/

      svg.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) { return a === b; }))
          .attr('d', path)
          .attr('class', 'boundaries outer')
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-width', 0.2);

      // Outer boundaries.
      svg.append('path')
          .datum(topojson.mesh(world, world.objects.layer1, function(a, b) { return a === b && a.properties.iso3 !== 'PHL'; }))
          .attr('d', path)
          .attr('class', 'boundaries outer')
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-width', 0.2);

      // Inner boundaries.
      svg.selectAll('.boundaries.inner')
          .data(topojson.feature(boundaries, boundaries.objects.layer1).features)
        .enter().append('path')
          .attr('class', 'boundaries inner')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', '#999')
          .attr('stroke-width', 0.2)
          .attr('stroke-dasharray', function (d) { return dashArray[d.properties.type]; });

      var j = topojson.feature(country, country.objects.layer1),
          b = path.bounds(j),
          p = projection(d3.geo.centroid(j)),
          c = zoom.center(),
          t = [c[0] - p[0], c[1] - p[1]],
          s = .9 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);

      // Center the map.
      zoom.translate(t);
      // Scale the map.
      applyZoom(0, s);

      addZoom();
      addDateSelector();
      addIndexSelector();
      addLegend();
    }

    function setData(data) {
      var formatter = d3.time.format.utc('%m/%d/%y'),
          max = 0, min = new Date().getTime();

      data.forEach(function (d) {
        if (d.date) {
          var date = formatter.parse(d.date).getTime();
          if (!stats.hasOwnProperty(date)) {
            stats[date] = {}
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
      dateMax = max
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

    // Load the map data.
    function loadData() {
      var loader = queue();

      spinner.spin(container.node());

      loader
          .defer(d3.csv, 'data/data.csv')
          .defer(d3.json, 'data/un.countries.topojson')
          .defer(d3.json, 'data/un.boundaries.topojson')
          .defer(d3.json, 'data/un.phl.topojson');
          //.defer(d3.json, rwapi.countries());

      loader.await(function (error, data, world, boundaries, country, countries) {
        spinner.stop();
        if (error === null) {
          setData(data);

          drawMap(world, boundaries, country);

          updateMap();
        }
      });
    }

    // Calculate 'count' thresholds from 'max' value.
    function computeSteps(max, count) {
      var magnitude = Math.floor(Math.log(max) / Math.LN10),
          stepHop = Math.pow(10, magnitude),
          stepMax = Math.floor(max / stepHop) * stepHop,
          divide = stepMax > 10,
          steps = [], i, l;

      steps.push(stepMax);
      for (i = 0, l = Math.min(count, stepMax) - 1; i < l; i++) {
        if (divide) {
          stepHop = stepMax <= stepHop ? stepHop / 10 : stepHop;
          stepMax = stepHop * Math.floor(stepMax / (2 * stepHop));
        }
        else {
          stepMax -= 1;
        }
        steps.push(stepMax >= 1 ? stepMax : 0);
      }
      steps.push(1);
      return steps.reverse();
    }

    /********
     * Main *
     ********/
    var width = 1000,
        height = 600,
        container = d3.select('#' + id),
        spinner = new Spinner(),
        formatter = d3.format(",.0f"),
        indexes = {'affectedPeople': 'Affected People', 'IDP': 'Displaced People', 'damagedHouses': 'Damaged Houses'},
        stats = {},
        activeIndex = 'affectedPeople',
        dateMin = 0, dateMax = 0, dateCurrent = 0;

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
        .attr('class', 'label right')
        .html('hello world');

    var projectionScale = width / 2 / Math.PI,
        projectionTranslate = [width / 2, height / 2];

    var projection = d3.geo.mercator()
        .scale(projectionScale)
        .translate(projectionTranslate);

    var path = d3.geo.path().projection(projection);

    var zoom = d3.behavior.zoom()
        .center([width / 2, height / 2])
        .scaleExtent([1, 59])
        .on('zoom', applyZoom);

    zoom(layerMap);

    /*var canvas = layerMap.append('div')
        .attr('class', 'background')
        .style({
          'position': 'absolute',
          'top': 0,
          'left': 0,
          'width': width + 'px',
          'height': height + 'px',
          'overflow': 'hidden'
        })
      .append('canvas')
        .attr('width', width)
        .attr('height', height)
        .style({
          'position': 'absolute',
          'left': 0,
          'top': 0
        });

    var context = canvas.node().getContext("2d");*/

    var svg = layerMap.append('svg')
        //.attr('width', width)
        //.attr('height', height)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMin slice')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        //.call(zoom)
      .append('g')
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
