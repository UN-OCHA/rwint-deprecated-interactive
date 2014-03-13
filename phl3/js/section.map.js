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

      var minimapProjection = d3.geo.mercator().scale(1).translate([0,0]);

      var minimapPath = d3.geo.path().projection(minimapProjection);

      var b = minimapPath.bounds(mesh),
          s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
          t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

      minimapProjection.scale(s).translate(t);

      var context = control.append('canvas')
          .attr('width', width)
          .attr('height', height)
          .node().getContext('2d');

      context.strokeStyle = '#ccc';
      context.fillStyle = '#fff';
      context.beginPath();
      minimapPath.context(context)(mesh);
      context.fill();
      context.stroke();

      var minimapOldScale = 0;

      var minimapZoom = d3.behavior.zoom()
        .center([width / 2, height / 2])
        .scaleExtent([1, 256])
        .on('zoom', function () {
          var l = minimapProjection.invert(d3.mouse(control.node())),
              p = projection(l),
              c = zoom.center(),
              t = zoom.translate(),
              s = zoom.scale();

          zoom.translate([c[0] - p[0] * s, c[1] - p[1] * s]);

          s = d3.event.scale / zoom.scale();

          var n = Math.log(s) / Math.LN2,
              k = s > minimapOldScale ? Math.ceil(n) : Math.floor(n),
              z = Math.pow(2, k);

          minimapOldScale = z;

          applyZoom(0, z);
        });

      var drag = d3.behavior.drag()
          //.origin(function(d) { return d; })
          .on("dragstart", dragstarted)
          .on("drag", dragged)
          .on("dragend", dragended);

      var selection = control.append('svg')
          .attr('width', width)
          .attr('height', height)
          .call(minimapZoom)
          //.call(minimapZoom)
        .append("rect")
          .attr('class', 'selection')
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", width)
          .attr("height", height)
          //.attr('stroke', '#ff7800')
          //.attr('stroke-opacity', 0.5)
          //.attr('fill', '#ff7800')
          //.attr('fill-opacity', 0.2)
          .call(drag);



      b = minimapPath.bounds(mesh);

      minimap = {
        width: width,
        height: height,
        center: [(width - (b[1][0] - b[0][0])) / 2, (height - (b[1][1] - b[0][1])) / 2],
        selection: selection,
        projection: minimapProjection,
        zoom: minimapZoom,
        update: function () {
          var b = d3.select('.focus').node().getBoundingClientRect(),
              s = this.height / b.height,
              h = s * window.innerHeight,
              w = s * window.innerWidth,
              x = -s * b.left + this.center[0],
              y = -s * b.top + this.center[1];

          this.selection
            .attr("x", x)
            .attr("y", y)
            .attr("width", w)
            .attr("height", h);

          this.zoom.translate(zoom.translate());
          this.zoom.scale(zoom.scale());
        }
      }
    }

    function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select('body').classed("dragging", true);
    }

    function dragged(d) {
      var t = zoom.translate(),
          s = zoom.scale();
      zoom.translate([t[0] - d3.event.dx * 2 * s, t[1] - d3.event.dy * 2 * s]);
      scaleMap();
    }

    function dragended(d) {
      d3.select('body').classed("dragging", false);
    }

    function updateMiniMap() {
      if (minimap) {
        minimap.update();
      }
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

    function handleZoom() {
      var s = d3.event.scale,
          n = Math.log(s) / Math.LN2,
          k = s > oldScale ? Math.ceil(n) : Math.floor(n),
          z = Math.pow(2, k);

      oldScale = z;

      applyZoom(0, z / s);
    }

    // Redraw the map based on the zoom level or translation.
    function applyZoom(offset, multiplier) {
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

      scaleMap();
    }

    function scaleMap() {
      var t = zoom.translate(),
          s = zoom.scale(),
          c = zoom.center(),
          tx = Math.min(c[0] - bounds[0][0] * s, Math.max(t[0], c[0] - bounds[1][0] * s)),
          ty = Math.min(c[1] - bounds[0][1] * s, Math.max(t[1], c[1] - bounds[1][1] * s)),
          dashArray = ['none', [2 / s, 2 / s].join(','), 1 / s];

      t = zoom.translate([tx, ty]).translate();

      svg.attr('transform', 'translate(' + t.join(',') + ')scale(' + s + ')');

      svg.selectAll('.municipality')
        .attr('stroke-width', 0.2 / s);

      svg.selectAll('.boundaries.outer')
        .attr('stroke-width', 0.2 / s);

      svg.selectAll('.boundaries.inner')
        .attr('stroke-width', 0.2 / s)
        .attr('stroke-dasharray', function (d) { return dashArray[d.properties.type]; });

      updateMiniMap();
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
      var jsonWorld = topojson.feature(world, world.objects.layer1),
          jsonCountry = topojson.feature(country, country.objects.layer1);

      var b = path.bounds(jsonCountry),
          s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
          t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

      projection.scale(s).translate(t);

      bounds = path.bounds(jsonCountry);

      var dashArray = ['none', '2,2', '1'];

      var features = jsonWorld.features.filter(function(f) { return f.properties.iso3 !== 'PHL'; });

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
          .data(jsonCountry.features)
        .enter().append('path')
          .attr('class', 'municipality')
          .attr('d', path)
          .attr('fill', '#fff')
          .attr('stroke', 'none');

      // Country international boundaries.
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

      scaleMap();

      addZoom();
      addDateSelector();
      addIndexSelector();
      addLegend();
      addMiniMap(country);

      updateMiniMap();
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
          .defer(d3.csv, 'data/data.csv.json')
          .defer(d3.json, 'data/un.countries-ms3.topojson')
          .defer(d3.json, 'data/un.boundaries.topojson')
          .defer(d3.json, 'data/un.phl.topojson');

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
        dateMin = 0, dateMax = 0, dateCurrent = 0,
        minimap, originalScale, originalTranslate,
        bounds;

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
        .scale(1)
        .translate([0, 0]);

    var path = d3.geo.path().projection(projection);

    var oldScale = 0;
    var zoom = d3.behavior.zoom()
        .center([width / 2, height / 2])
        .scaleExtent([1, 256])
        .on('zoom', handleZoom);

    zoom(layerMap);

    window.onresize = function () {
      updateMiniMap();
    };
    window.onscroll = function () {
      updateMiniMap();
    };

    var svg = layerMap.append('svg')
        //.attr('width', width)
        //.attr('height', height)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMin slice')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
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
