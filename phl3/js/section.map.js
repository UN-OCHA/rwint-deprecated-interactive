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

    function wrap(text, width) {
      var c = document.createElement('canvas').getContext('2d');
      c.font = text.style('font');
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 0.9, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dx", "-.35em");//.attr("dy", dy + "em");
        while ((word = words.pop()) && lineNumber < 1) {
          line.push(word);
          tspan.text(line.join(" "));
          if (c.measureText(tspan.text()).width > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + "em").attr("dx", "-.35em").text(word);
          }
        }
        text.attr('dy', (1 - lineNumber) * dy + 'em');
      });
    }

    function showTooltip() {
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

        tooltip.style('display', 'block')
            .html('<span class="name">' + name + '</span>' + values);
      }
    }

    function hideTooltip() {
      tooltip.style('display', 'none');
    }

    function moveTooltip() {
      var position = d3.mouse(container.node()),
          x = position[0],
          y = position[1],
          w = parseInt(tooltip.style('width'), 10),
          right = (x > parseInt(container.style('width'), 10) / 2);

      tooltip.classed('left', right).classed('right', !right)
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
      html += '<div class="source">Source: DROMIC</div>';

      layerControl.select('.control.legend').html(html);
    }

    function addTrack(track) {
      // Typhoon track.
      var layer = svg.append('path')
          .datum(track)
          .attr('class', 'track')
          .attr('d', function(d) {
            return 'M' + d.map(function (e) {
              return projection([e.LON, e.LAT]);
            }).join('L');
          })
          .attr('vector-effect', 'non-scaling-stroke');

      layerControl.select('.top.right').append('div')
          .attr('class', 'control track')
          .html('<input type="checkbox" name="track" id="track" value="1" checked/>' +
                '<label for="track">Typhoon track</label>' +
                '<div class="source">Source: UNISYS</div>')
          .on('click', function() {
            var target = d3.event.target;
            if (target.name === 'track') {
              layer.style('display', target.checked ? 'block' : 'none');
            }
          });
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
          .attr({x: 0, y: 0, width: width, height: height});

      minimap.container = layerMap.node();
      minimap.focus = d3.select('.focus').node();
      minimap.selection = selection;
      minimap.update = function () {
        var sb = this.container.getBoundingClientRect(),
            b = this.focus.getBoundingClientRect(),
            s = Math.min(width / (b.right - b.left), height / (b.bottom - b.top)),
            w = s * (sb.right - sb.left),
            h = s * (sb.bottom - sb.top),
            x = sb.left * s + (width - s * (b.right + b.left)) / 2,
            y = sb.top * s + (height - s * (b.bottom + b.top)) / 2;

        this.selection.attr({x:x, y:y, width: w, height: h});
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

    function updateInfo(data, regions, cities) {
      var symbols = {'M': 'million', 'K': 'thousands'};
      var formatter = function (n) {
        var v = d3.formatPrefix(n);
        return v.scale(n).toFixed(1) + ' ' + symbols[v.symbol];
      };

      var totals = {
        affectedPeople: 0,
        IDP: 0,
        damagedHouses: 0
      };

      var day = d3.keys(stats).pop();

      var date = d3.time.format("%d %b %Y")(new Date(parseInt(day, 10)));

      var stat = stats[day];

      d3.keys(stat).forEach(function (k) {
        var municipality = stat[k],
            region = regions[parseInt(k.substr(0, 2), 10) - 1],
            affectedPeople = municipality.affectedPeople || 0,
            IDP = municipality.IDP || 0,
            damagedHouses = municipality.damagedHouses || 0;

        region.affectedPeople = (region.affectedPeople || 0) + affectedPeople;
        region.IDP = (region.IDP || 0) + IDP;
        region.damagedHouses = (region.damagedHouses || 0) + damagedHouses;

        totals.affectedPeople += affectedPeople;
        totals.IDP += IDP;
        totals.damagedHouses += damagedHouses;
      });

      var tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip info right');

      function createGraph(section, title, type, data) {
        data = data.filter(function (d) { return typeof d[type] !== 'undefined'; });

        data.sort(function (a, b) {
          return b[type] - a[type];
        });

        var barHeight = 20,
            width = 300,
            height = data.length * barHeight,
            margin = {
              left: 40,
              top: 20,
              right: 10,
              bottom: 20
            };

        var formatter = d3.format('.2s');

        var graph = section.append('div')
            .attr('class', 'graph');

        graph.append('h4')
            .attr('class', 'title')
            .html('Number of ' + title.toLowerCase());

        var svg = graph.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
          .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var xScale = d3.scale.linear()
            .range([0, width])
            .domain([0, d3.max(data, function (d) { return d[type]; })]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickFormat(formatter)
            .ticks(6);

        svg.selectAll("grid")
            .data(xScale.ticks(6))
          .enter().append("line")
            .attr({
                "class": "grid",
                "x1" : function(d) { return xScale(d); },
                "x2" : function(d) { return xScale(d); },
                "y1" : 0,
                "y2" : height + 5,
                "fill" : "none",
                "shape-rendering" : "crispEdges",
                "stroke" : "#eee",
                "stroke-width" : "1px"
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        var commas = d3.format("0,000");

        var bar = svg.selectAll('.bar')
            .data(data)
          .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function (d, i) { return 'translate(0,' + i * barHeight + ')'; })
            .on('mousemove', function mouseover () {
              tooltip.style({left: d3.event.clientX + 16 + 'px', top: d3.event.clientY - 16 + 'px'});
            })
            .on('mouseover', function mouseout () {
              var datum = d3.select(this).datum();
              tooltip
                .html(datum.Rname + ' (' + datum.Region_nam + ')' + '</br><span>' + title + ':</span> <strong>' + commas(datum[type]) + '</strong>')
                .style({display: 'block', left: d3.event.clientX + 16 + 'px', top: d3.event.clientY - 16 + 'px'});
            })
            .on('mouseout', function mouseout () {
              tooltip.style('display', 'none');
            });

        bar.append('text')
            .attr('class', 'category')
            .attr('x', -3)
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return d.Rname; });

        bar.append('rect')
            .attr('width', function (d) { return xScale(d[type]); })
            .attr('height', barHeight - 4)
            .attr("y", 2);

        bar.append('text')
            .attr('class', function (d) {
              return 'value ' + (xScale(d[type]) > width / 10 ? 'end' : 'start');
            })
            .attr('x', function (d) {
              var x = xScale(d[type]);
              return x > width / 10 ? x -3 : x + 3;
            })
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return formatter(d[type]); });
      }

      // Affected people section.
      var section = d3.select('#info .section.affected-people');
      section.append('div')
          .attr('class', 'total affectedPeople')
          .html('<div><i class="icon-affectedPeople"></i>' +
            '<div><strong>' + formatter(totals.affectedPeople) + '</strong>' +
            '<em>affected (' + date + ')</em></div></div>');

      createGraph(section, 'Affected people', 'affectedPeople', regions);

      section.append('div')
          .attr('class', 'total IDP')
          .html('<div><i class="icon-IDP"></i>' +
            '<div><strong>' + formatter(totals.IDP) + '</strong>' +
            '<em>displaced (' + date + ')</em></div></div>');

      createGraph(section, 'Displaced people', 'IDP', regions);

      section.append('p')
        .html('Source: DROMIC');

      // Damages section
      var section = d3.select('#info .section.damages');

      section.append('div')
          .attr('class', 'total damagedHouses')
          .html('<div><i class="icon-damagedHouses"></i>' +
            '<div><strong>' + formatter(totals.damagedHouses) + '</strong>' +
            '<em>damaged houses (' + date + ')</em></div></div>');

      createGraph(section, 'Damaged houses', 'damagedHouses', regions);

      section.append('p')
        .html('Source: DROMIC');
    }

    // Draw the map.
    function drawMap(world, boundaries, country, regions, cities, track) {
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

      // Region labels.
      regions.forEach(function (d) {
        d.geometry = {
            type: 'Point',
            coordinates: projection([d.POINT_X, d.POINT_Y])
        };
      });
      svg.append('g')
          .attr('class', 'regions')
        .selectAll('region')
          .data(regions)
        .enter().append('text')
          .attr('class', 'region')
          .attr('x', function (d) { return d.geometry.coordinates[0]; })
          .attr('y', function (d) { return d.geometry.coordinates[1]; })
          .text(function(d) { return d.Rname; });

      // Cities labels.
      var features = d3.values(cities).filter(function (d) { return d.CLASS == 1; }).map(function (d) {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: projection([d.LONGITUDE, d.LATITUDE])
          },
          properties: {
            name: d.NAME,
            type: parseInt(d.CLASS, 10)
          }
        };
      });

      var citiesGroup = svg.append('g')
          .attr('class', 'cities');

      citiesGroup.selectAll('anchor')
          .data(features)
        .enter().append('circle')
          .attr('class', 'anchor')
          .attr('cx', function (d) { return d.geometry.coordinates[0]; })
          .attr('cy', function (d) { return d.geometry.coordinates[1]; })
          .attr('r', 6)
          .attr('vector-effect', 'non-scaling-stroke');

      citiesGroup.selectAll('label')
          .data(features)
        .enter().append('text')
          .attr('class', 'label')
          //.attr('transform', function (d) { return 'translate(' + d.geometry.coordinates + ')'; })
          .attr('x', function (d) { return d.geometry.coordinates[0]; })
          .attr('y', function (d) { return d.geometry.coordinates[1]; })
          //.attr('dx', '-6')
          .text(function (d) { return d.properties.name + ' \u272A'; });

      addZoom();
      addDateSelector();
      addIndexSelector();
      addLegend();
      addTrack(track);
      addMiniMap(country);

      createZoom(country.bbox, width, height);
    }

    // Inverse transformation matrix.
    function inverseMatrix(m) {
      var a = m[0],
          b = m[2],
          c = m[4],
          d = m[1],
          e = m[3],
          f = m[5],
          det = a * e - b * d,
          A = e / det,
          B = -b / det,
          C = (b * f - c * e) / det,
          D = -d / det,
          E = a / det,
          F = (c * d - a * f) / det;

      return [A, D, B, E, C, F];
    }

    function multiplyMatrices(m, M) {
      var a = m[0],
          b = m[2],
          c = m[4],
          d = m[1],
          e = m[3],
          f = m[5],
          A = M[0],
          B = M[2],
          C = M[4],
          D = M[1],
          E = M[3],
          F = M[5];

      return [
        a * A + b * D,
        d * A + e * D,
        a * B + b * E,
        d * B + e * E,
        a * C + b * F,
        d * C + e * F];
    }

    function updateNonScalable(scale) {
      d3.selectAll('.cities .anchor')
          .attr('r', 6 / scale);

      d3.selectAll('.cities .label')
          .style('font-size', 20 / scale + 'px')
          .attr('dx', 8 / scale)
          .attr('dy', 8 / scale);

      d3.selectAll('.regions .region')
          .style('font-size', 24 / scale + 'px');
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

          updateNonScalable(matrix[0]);
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

    function updateFTS(appeal, clusters, emergency) {
      var formatter = function (n) {
        var v = d3.formatPrefix(n);
        return v.scale(n).toFixed(2) + v.symbol;
      };

      var labelFormatter = function (n) {
        var v = d3.formatPrefix(n);
        return Math.round(v.scale(n)) + v.symbol;
      };

      var percentage = d3.format(".0%");

      var tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip info right');

      function createGraph(section, title, data) {
        data.sort(function (a, b) {
          return b.current_requirement - a.current_requirement;
        });

        var barHeight = 20,
            width = 240,
            height = data.length * barHeight,
            margin = {
              left: 100,
              top: 20,
              right: 10,
              bottom: 20
            };

        var graph = section.append('div')
            .attr('class', 'graph');

        graph.append('h4')
            .attr('class', 'title')
            .html(title);

        var svg = graph.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
          .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var xScale = d3.scale.linear()
            .range([0, width])
            .domain([0, d3.max(data, function (d) { return d.current_requirement; })]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .tickFormat(formatter)
            .ticks(6);

        svg.selectAll("grid")
            .data(xScale.ticks(6))
          .enter().append("line")
            .attr({
                "class": "grid",
                "x1" : function(d) { return xScale(d); },
                "x2" : function(d) { return xScale(d); },
                "y1" : 0,
                "y2" : height + 5,
                "fill" : "none",
                "shape-rendering" : "crispEdges",
                "stroke" : "#eee",
                "stroke-width" : "1px"
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        var bar = svg.selectAll('.bar')
            .data(data)
          .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function (d, i) { return 'translate(0,' + i * barHeight + ')'; })
            .on('mousemove', function mouseover () {
              tooltip.style({left: d3.event.clientX + 16 + 'px', top: d3.event.clientY - 16 + 'px'});
            })
            .on('mouseover', function mouseout () {
              var d = d3.select(this).datum();

              var covered = percentage(d.current_requirement ? d.funding / d.current_requirement : 1),
                  requested = formatter(d.current_requirement),
                  funded = formatter(d.funding);

              tooltip
                .html(d.name + '<br/>' +
                  '<span>Covered:</span> <strong>' + covered + '</strong><br/>' +
                  '<span>Requested:</span> <strong>$' + requested + '</strong><br/>' +
                  '<span>Funded:</span> <strong>$' + funded + '</strong>'
                  )
                .style({display: 'block', left: d3.event.clientX + 16 + 'px', top: d3.event.clientY - 16 + 'px'});
            })
            .on('mouseout', function mouseout () {
              tooltip.style('display', 'none');
            });

        bar.append('text')
            .attr('class', 'category')
            .attr('x', 0)
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return d.name; })
            .call(wrap, margin.left);

        bar.append('rect')
            .attr('class', 'requested')
            .attr('width', function (d) { return xScale(d.current_requirement); })
            .attr('height', barHeight - 4)
            .attr("y", 2);

        bar.append('rect')
            .attr('class', 'funded')
            .attr('width', function (d) { return xScale(d.funding); })
            .attr('height', barHeight - 4)
            .attr("y", 2);

        bar.append('text')
            .attr('class', function (d) {
              return 'value ' + (xScale(d.funding) > width / 10 ? 'end' : 'start');
            })
            .attr('x', function (d) {
              var x = xScale(d.funding);
              return x > width / 10 ? x -3 : x + 3;
            })
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return labelFormatter(d.funding); });
      }

      function createPie(container, appeal) {
        var data = [
          appeal.funding,
          appeal.current_requirements - appeal.funding
        ];

        var width = 40,
            height = 40,
            radius = Math.min(width, height) / 2;

        var arc = d3.svg.arc()
            .outerRadius(radius)
            .innerRadius(0);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d) { return d; });

        var svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
          .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var g = svg.selectAll(".arc")
            .data(pie(data))
          .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return i === 0 ? '#026cb6' : '#ccc'; });
      }

      var covered = percentage(appeal.current_requirements ? appeal.funding / appeal.current_requirements : 1),
          requested = labelFormatter(appeal.current_requirements),
          funded = labelFormatter(appeal.funding);

      var section = d3.select('#info .section.funding');

      section.append('h3')
          .html("Strategic Response Plan (Nov 2013 - Oct 2014)");
      section.append('div')
          .attr('class', 'total appeal')
          .html('<div><i class="icon-requested"></i>' +
            '<div><strong>$' + requested + '</strong>' +
            '<em>requested</em></div></div>' +
            '<div><i class="icon-funded"></i>' +
            '<div><strong>$' + funded + '</strong>' +
            '<em>funded</em></div></div>' +
            '<div><i class="icon-covered"></i>' +
            '<div><strong>' + covered + '</strong>' +
            '<em>covered</em></div></div>');

      createPie(section.select('.icon-covered'), appeal);

      createGraph(section, "Funding by clusters (USD)", clusters)

      section.append('h3')
          .html("Total funding to emergency");
      section.append('div')
          .attr('class', 'total funding')
          .html('<div><i class="icon-funded"></i>' +
            '<div><strong>$' + labelFormatter(emergency.total) + '</strong>' +
            '<em>funded</em></div></div>');

      section.append('p')
        .html('Source: FTS');
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
          .defer(d3.csv, 'data/un.phl.cities.csv.json')
          .defer(d3.csv, 'data/track.csv');

      loader.await(function (error, data, world, boundaries, country, regions, cities, track) {
        spinner.stop();
        if (error === null) {
          setData(data);

          drawMap(world, boundaries, country, regions, cities, track);

          updateMap();

          updateInfo(data, regions, cities);
        }
      });
    }

    function loadFTS(appealId) {
      queue()
          .defer(d3.json, 'http://fts.rwdev.org/api/v1/appeal/id/' + appealId + '.json')
          .defer(d3.json, 'http://fts.rwdev.org/api/v1/cluster/appeal/' + appealId + '.json')
          .defer(d3.json, 'http://fts.rwdev.org/api/v1/funding.json?emergency=16439')
          .await(function (error, appeal, clusters, emergency) {
            if (error === null) {
              updateFTS(appeal[0], clusters, emergency);
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

    // Tooltip.
    var tooltip = layerMarker.append('div')
        .style('display', 'none')
        .attr('class', 'tooltip right');

    var projection = d3.geo.mercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2]);

    var path = d3.geo.path()
        .projection(null)
        .pointRadius(0);

    var svgContainer = layerMap.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height);

    var svgDefs = svgContainer.append('defs');

    svgDefs.append('marker')
        .attr({
          id: 'track-marker',
          viewBox: '0 0 1 1',
          refY: 0.5,
          markerWidth: 1,
          markerHeight: 1,
          orient: 'auto',
          markerUnits: 'userSpaceOnUse'
        })
      .append('path')
        .attr('d', 'M0,0.5v-0.5l1,0.5l-1,0.5z');

    var svg = svgContainer.append('g')
        .attr('transform', 'matrix(1 0 0 1 0 0)')
        .on('mousemove', moveTooltip)
        .on('mouseover', showTooltip)
        .on('mouseout', hideTooltip);

    return {
      load: function () {
        // Load the data.
        loadData();
        // Load FTS data with appeal ID.
        loadFTS(1043);
      }
    };
  };

})();
