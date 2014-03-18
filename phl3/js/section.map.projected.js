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

      var minimapProjection = d3.geo.mercator().scale(150/2/Math.PI).translate([75, 75]);
      var minimapPath = d3.geo.path().projection(null);

      var b = data.bbox,
          s = 1 / Math.max((b[2] - b[0]) / width, (b[3] - b[1]) / height),
          t = [(width - s * (b[2] + b[0])) / 2, (height - s * (b[3] + b[1])) / 2];

      //minimapProjection.scale(s).translate(t);

      var context = control.append('canvas')
          .attr('width', width)
          .attr('height', height)
          .node().getContext('2d');

      context.translate(t[0], t[1]);
      context.scale(s, s);
      context.strokeStyle = '#ccc';
      context.fillStyle = '#fff';
      context.lineWidth = 0.1;
      context.beginPath();
      minimapPath.context(context)(mesh);
      context.fill();
      context.stroke();

      var minimapOldScale = 0;

      var center = [(width - (b[2] - b[0]) * s) / 2, (height - (b[3] - b[1]) * s) / 2];
      var scale = s;

      var minimapZoom = d3.behavior.zoom()
        .center([width / 2, height / 2])
        .scaleExtent([1, 256])
        .on('zoom', function () {
          var p = d3.mouse(control.node()),
              m = minimapZoom.center(),
              l = [(p[0] - m[0]), (p[1] - m[1])],
              c = zoom.center(),
              t = zoom.translate(),
              s = zoom.scale(),
              z = s  * originalScale;


          console.log(l);
          console.log(p);

          t = [c[0] - t[0] / s, c[1] - t[1] / s];
          console.log(t);

          console.log('pre', [-p[0] * originalScale / scale, -p[1] * originalScale / scale]);
          zoom.translate([-p[0] * originalScale / scale, -p[1] * originalScale / scale]);
          zoom.scale(s * 2);
          scaleMap();
          return;
          //zoom.translate([p[0] * s , p[1] * s]);

          s = d3.event.scale / zoom.scale();

          var n = Math.log(s) / Math.LN2,
              k = s > minimapOldScale ? Math.ceil(n) : Math.floor(n),
              z = Math.pow(2, k);

          minimapOldScale = z;

          console.log(z);

          applyZoom(0, z);
        });

      var drag = d3.behavior.drag()
          .on("dragstart", dragstarted)
          .on("drag", dragged)
          .on("dragend", dragended);

      var selection = control.append('svg')
          .attr('width', width)
          .attr('height', height)
          .call(minimapZoom)
        .append("rect")
          .attr('class', 'selection')
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", width)
          .attr("height", height)
          .call(drag);

      minimap = {
        width: width,
        height: height,
        center: center,
        selection: selection,
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

      //oldScale = z;

      console.log('t', zoom.translate(), d3.event.translate);
      console.log('s', zoom.scale(), d3.event.scale);
      console.log('mouse', d3.mouse(layerMap.node()));
      console.log('mouse', d3.mouse(document.body));

      //applyZoom(0, z / s);
      scaleMap();
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
          s = zoom.scale();/*,
          c = zoom.center(),
          n = Math.log(s) / Math.LN2,
          w = bounds[1][0] - bounds[0][0],
          h = bounds[1][1] - bounds[0][1],
          m = [(bounds[1][0] + bounds[0][0]) / 2, (bounds[1][1] + bounds[0][1]) / 2],
          xMin = -width / 2,
          xMax = (width - w) / 2,
          yMin = (h - height) / 2,
          yMax = (height - h) / 2,
          tx = Math.min(xMin, Math.max(t[0], xMax)),
          ty = Math.min(yMin, Math.max(t[1], yMax));

      var ox = c[0] - s * (bounds[1][0] - bounds[0][0]) / 2;
      var oy = c[1] - s * (bounds[1][1] - bounds[0][1]) / 2;
      //tx = t[0] < -o ? -o : (t[0] > o ? o : t[0]);
      tx = Math.min(ox, Math.max(t[0], -ox));
      ty = Math.min(oy, Math.max(t[1], -oy));

      t = zoom.translate([tx, ty]).translate();*/

      console.log('translate', t);

      svgMap.attr('transform',
        'translate(' + t + ')scale(' + s + ')');

      var n = Math.log(s) / Math.LN2;

      if (s !== oldScale) {
        var z = s * originalScale;

        svg.selectAll('.municipalities')
          .attr('stroke-width', 0.2 / z);

        svg.selectAll('.boundaries.outer')
          .attr('stroke-width', 0.2 / z);

        svg.selectAll('.boundaries.inner')
          .attr('stroke-width', 0.2 / z);

        svg.selectAll('.boundaries.inner.dashed')
          .attr('stroke-dasharray', [2 / z, 2 / z].join(','));

        svg.selectAll('.boundaries.inner.dotted')
          .attr('stroke-dasharray', 1 / z);

        svg.selectAll('.boundaries.province')
          .attr('stroke-width', 0.5 / z);

        svg.selectAll('.boundaries.region')
          .attr('stroke-width', 0.75 / z);
      }
      oldScale = s;

      /*

     var n = Math.log(s) / Math.LN2;

      svg.selectAll('.city.anchor')
        .style('display', function (d) { return (n + 1) >= d.type ? 'inherit' : 'none'; })
        .attr('r', function (d) { return 6 / (d.type * s); });

      svg.selectAll('.city.capital')
        .attr('dy', 3 / s + 'px')
        .style('font-size', 9 / s + 'px');

      svg.selectAll('.city.label')
        .style('display', function (d) { return (n + 1) >= d.type ? 'inherit' : 'none'; })
        .attr('dy', 0 / s + 'px')
        .attr('dx', -6 / s + 'px')
        .style('font-size', 9 / s + 'px');*/

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

    function drawCanvas(context, canvas) {
      //var canvas = d3.select(context.getCanvas());

      context.clearRect(0, 0, canvas.attr('width'), canvas.attr('height'));

      context.strokeStyle = '#766951';
      context.fillStyle = '#d7c7ad';

      context.beginPath();

      path.context(context)(canvas.datum());

      context.fill();
      context.stroke();
    }

    // Draw the map.
    function drawMap(world, boundaries, country, regions, cities) {
      var b = country.bbox,
          s = 1 / Math.max((b[2] - b[0]) / width, (b[3] - b[1]) / height),
          t = [(width - s * (b[2] + b[0])) / 2, (height - s * (b[3] + b[1])) / 2];

      originalScale = s;
      originalTranslate = t;

      bounds = [[b[0], b[1]], [b[2], b[3]]];

      svg.attr('transform', 'translate(' + originalTranslate + ')scale(' + originalScale + ')');

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
          .attr('class', 'country')//function (d) { return 'country ' + d.properties.iso3; })
          .attr('d', path);

      // Outer Boundaries.
      groupWorld.append('path')
          .datum(topojson.mesh(world, world.objects.layer1, function(a, b) {
            return a === b && a.properties.iso3 !== iso3;
          }))
          .attr('class', 'boundaries outer')
          .attr('d', path);

      // Inner boundaries.
      d3.values(boundaries.objects).forEach(function (layer, i) {
        groupWorld.append('path')
          .datum(topojson.feature(boundaries, layer))
          .attr('class', 'boundaries inner' + ['', ' dashed', ' dotted'][i])
          .attr('d', path);
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
          .attr('d', path);

      // Provinces.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a.properties.province !== b.properties.province;
          }))
          .attr('d', path)
          .attr('class', 'boundaries province');

      // Regions.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a.properties.region !== b.properties.region;
          }))
          .attr('d', path)
          .attr('class', 'boundaries region');

      // Outer Boundaries.
      groupCountry.append('path')
          .datum(topojson.mesh(country, country.objects.layer1, function(a, b) {
            return a === b;
          }))
          .attr('class', 'boundaries outer')
          .attr('d', path);

      //addCities(cities, jsonCountry);

      scaleMap();

      addZoom();
      addDateSelector();
      addIndexSelector();
      addLegend();
      addMiniMap(country);

      //updateMiniMap();

      //addWorldLabels(jsonWorld);
      //addLabels(jsonCountry);
    }

    function addCities(cities, jsonCountry) {
      var jsonCities = {
            type: 'FeatureCollection',
            features: cities.filter(function (d) {
                return d.NAME.trim() && parseInt(d.CLASS, 10);
              }).map(function (d) {
                return {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [d.LONGITUDE, d.LATITUDE]
                  },
                  properties: {
                    name: d.NAME.trim(),
                    type: parseInt(d.CLASS, 10),
                  }
                };
              })
            };

      jsonCities.features.sort(function compare(a, b) {
        return b.properties.type - a.properties.type;
      });

      var nest = d3.nest()
          .key(function (d) { return d.properties.type; })
          .entries(jsonCities.features);

      var groupCities = svg.append('g').attr('class', 'cities');

      var center = d3.geo.centroid(jsonCountry);

  /*<marker id="marker"
      viewBox="0 0 6 6"
      refY="3"
      markerWidth="7"
      markerHeight="7"
      orient="auto">
    <path d="M0,3v-3l6,3l-6,3z"></path>
  </marker>

      svgDefs.append('marker')
        .attr('id', 'capital')
        .attr('viewBox', '0 0 6')*/

      // Star: \u2605

      nest.forEach(function (n) {
        if (n.key >= 5) {
          return;
        }
        var group = groupCities.append('g')
            .attr('class', 'type' + n.key);

        group.append('path')
            .datum({
              type: 'FeatureCollection',
              features: n.values
            })
            .attr('d', path)
            .attr('class', 'anchors');

        group.selectAll('.label')
            .data(n.values)
          .enter().append('text')
            .attr('class', function (d) {
              return 'label ' + (d.geometry.coordinates[0] > center[0] ? 'start' : 'end');
            })
            .attr('x', function (d) { return projection(d.geometry.coordinates)[0]; })
            .attr('y', function (d) { return projection(d.geometry.coordinates)[1]; })
            //.attr('dy', '-0.5%')
            //.attr('transform', function (d) { return 'translate(' + projection(d.geometry.coordinates) + ')'; })
            .text(function (d) { return d.properties.name; });
      });
    }

    function addWorldLabels(jsonWorld) {
      return;
      svg.selectAll(".subunit-label")
          .data(jsonWorld.features)
        .enter().append("text")
          .attr("class", 'subunit-label')
          .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
          .attr("dy", ".35em")
          .text(function(d) { return d.properties.name; });
    }

    function addLabels(jsonCountry) {
      return;
      var nest = d3.nest()
          .key(function(d) { return d.properties.region; })
          .rollup(function (features) {
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: path.centroid({
                  type: 'FeatureCollection',
                  features: features
                })
              },
              properties: {
                name: features[0].properties.region
              }
            };
          })
          .map(jsonCountry.features);

      /*svg.append("path")
          .datum(collection)
          .attr("d", path)
          .attr("class", "place")
          .attr('fill', '#444');*/
      svg.selectAll(".subunit-label")
          .data(d3.values(nest))
        .enter().append("text")
          .attr("class", 'subunit-label')
          //.attr('d', path)
          //.attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
          .attr("transform", function(d) { return "translate(" + d.geometry.coordinates + ")"; })
          .attr("dy", ".35em")
          .text(function(d) { return d.properties.name; });

      return;
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
        height = 650,
        container = d3.select('#' + id),
        spinner = new Spinner(),
        formatter = d3.format(",.0f"),
        indexes = {'affectedPeople': 'Affected People', 'IDP': 'Displaced People', 'damagedHouses': 'Damaged Houses'},
        stats = {},
        activeIndex = 'affectedPeople',
        dateMin = 0, dateMax = 0, dateCurrent = 0,
        minimap, originalScale, originalTranslate,
        bounds, oldScale = 0;

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

    var path = d3.geo.path()
        .projection(null)
        .pointRadius(0);

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

    var svgContainer = layerMap.append('svg')
        //.attr('width', width)
        //.attr('height', height)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMin slice')
        .attr('viewBox', '0 0 ' + width + ' ' + height);

    var svgDefs = svgContainer.append('defs');

    var svgMap = svgContainer.append('g');

    var svg = svgMap.append('g')
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
