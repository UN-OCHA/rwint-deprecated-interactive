(function () {

  if (!window.sections) {
    window.sections = {};
  }

  window.sections.details = function (id) {
    var categories = ['theme', 'disaster_type', 'vulnerable_groups'],
        startingDate = 1996,
        current_year = new Date().getUTCFullYear(),
        year, from, to, category, i, l, facets = [];

    for (i = 0, l = categories.length; i < l; i++) {
      category = categories[i];

      for (year = 1996; year < current_year; year++) {
        from = Date.UTC(year, 0, 1, 0, 0, 0, 0);
        to = Date.UTC(year + 1, 0, 1, 0, 0, 0, 0);

        facets.push({
          field: category + '.name.exact',
          name: category + '-' + year,
          limit: 30,
          filter: {
            field: 'date',
            value: {
              from: from,
              to: to
            }
          }
        });
      }
    }

    var params = {
      limit: 0,
      nodefault: true,
      filter: {
        field: 'status',
        value: ['to-review', 'published'],
        operator: 'OR'
      },
      facets: facets
    }

    var url = 'http://api.rwlabs.org/v0/report/list';

    d3.xhr(url).post(JSON.stringify(params), function(error, xhr) {
      var data = JSON.parse(xhr.responseText);

      // Parse data.
      var facets = data.data.facets,
          category, term, name, count, i, j, l, m,
          dataset, datasets = {};

      for (i = 0, l = categories.length; i < l; i++) {
        category = categories[i];
        dataset = datasets[category] = {max: 0, totalYear: 0};

        for (year = current_year - 10; year < current_year; year++) {
          totalYear = 0;

          if (facets[category + '-' + year]) {
            terms = facets[category + '-' + year].terms;

            for (j = 0, m = terms.length; j < m; j++) {
              term = terms[j];
              name = term.term;
              count = term.count;
              dataset[name] = dataset[name] || {name: name, total: 0, data: []};
              dataset[name].data.push([year, count]);
              dataset[name].total += count;
              dataset.max = count > dataset.max ? count : dataset.max;
              totalYear += count;
            }
          }

          dataset.totalYear = totalYear > dataset.totalYear ? totalYear : dataset.totalYear;
        }
      }

      for (property in datasets) {
        if (datasets.hasOwnProperty(property)) {
          drawData(property, datasets[property]);
        }
      }
    });


    function drawData(property, dataset) {
      var margin = {
            top: 20,
            right: 300,
            bottom: 0,
            left: 20
          },
        width = 400,
        height = 500;

      height = d3.keys(dataset).length * 20;

      var start_year = current_year - 10,
          end_year = current_year - 1;

      var c = d3.scale.category20c();

      var x = d3.scale.linear()
        .range([0, width]);

      var xAxis = d3.svg.axis()
        .scale(x)
        .orient('top');

      var formatYears = d3.format('0000');
      xAxis.tickFormat(formatYears);

      x.domain([start_year, end_year]);
      var xScale = d3.scale.linear()
        .domain([start_year, end_year])
        .range([0, width]);

      var dataset, property, item, j = 0;

      var container = d3.select('#details').append('div');

      container.append('h4').html(property.replace('_', ' ').replace(/s*$/, 's') + ' <em>(past 10 years)</em>');

      var svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('margin-left', margin.left + 'px')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + 0 + ')')
        .call(xAxis);

      for (property in dataset) {
        if (dataset.hasOwnProperty(property) && property !== 'max' && property !== 'totalYear') {
          item = dataset[property];

          var g = svg.append('g').attr('class', 'category');

          var circles = g.selectAll('circle')
            .data(item.data)
            .enter()
            .append('circle');

          var text = g.selectAll('text')
            .data(item.data)
            .enter()
            .append('text');

          var rScale = d3.scale.linear()
            .domain([0, d3.max(item.data, function (d) {
              return d[1];
            })])
            .range([2, 9]);

          circles
            .attr('cx', function (d, i) {
              return xScale(d[0]);
            })
            .attr('cy', j * 20 + 20)
            .attr('r', function (d) {
              return rScale(d[1]);
            })
            .style('fill', function (d) {
              return c(j);
            });

          text
            .attr('y', j * 20 + 25)
            .attr('x', function (d, i) {
              return xScale(d[0]) - 5;
            })
            .attr('class', 'value')
            .text(function (d) {
              return d[1];
            })
            .style('fill', function (d) {
              return c(j);
            })
            .style('display', 'none');

          g.append('text')
            .attr('y', j * 20 + 25)
            .attr('x', width + 40)
            .attr('class', 'label')
            .text(truncate(item.name, 30, '...'))
            .style('fill', function (d) {
              return c(j);
            })
            .on('mouseover', mouseover)
            .on('mouseout', mouseout);

          j++;
        }
      }
    }

    function truncate(str, maxLength, suffix) {
      if (str.length > maxLength) {
        str = str.substring(0, maxLength + 1);
        str = str.substring(0, Math.min(str.length, str.lastIndexOf(' ')));
        str = str + suffix;
      }
      return str;
    }

    function mouseover(p) {
      var g = d3.select(this).node().parentNode;
      d3.select(g).selectAll('circle').style('display', 'none');
      d3.select(g).selectAll('text.value').style('display', 'block');
    }

    function mouseout(p) {
      var g = d3.select(this).node().parentNode;
      d3.select(g).selectAll('circle').style('display', 'block');
      d3.select(g).selectAll('text.value').style('display', 'none');
    }

    return {
      load: function () {
      }
    }
  };

})();
