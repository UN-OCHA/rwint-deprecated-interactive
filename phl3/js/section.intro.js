(function () {

  if (!window.sections) {
    window.sections = {};
  }

  window.sections.intro = function (id) {

    function drawGraph(data) {
      var width = 500,
          height = 200,
          margin = 50;

      var layerGraph = container.append('div')
          .attr('class', 'layer graph')
          .style({
            'width': (width + margin * 2) + 'px',
            'height': (height + margin * 2) + 'px'
          });

      var svg = layerGraph.append('svg')
          .attr('width', '100%')
          .attr('height', '100%')
        .append('g')
          .attr('transform', 'translate(' + margin + ',' +  margin + ')');

      var x = d3.scale.ordinal()
          .rangePoints([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .tickFormat(d3.format('0000'));

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left")
          .tickFormat(d3.format('.2s'));

      var line = d3.svg.line()
          //.interpolate("basis")
          .x(function(d) { return x(d.year); })
          .y(function(d) { return y(d.count); });

      var years = d3.range(startingYear, currentYear);

      data = indexes.map(function (index) {
        var values = data[index];
        return {
          name: index,
          values: years.map(function (year) {
            return {
              year: year,
              count: values[year] || 0
            }
          })
        };
      });

      x.domain(years);
      y.domain([0, d3.max(data, function (i) {
          return d3.max(i.values, function(v) { return v.count; });
      })]);

      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
        .selectAll("text")
          .style("text-anchor", "end")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", 'rotate(-45)');

      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("# Posted");

      var index = svg.selectAll(".index")
          .data(data)
        .enter().append("g")
          .attr("class", "index");

      index.append("path")
          .attr("class", function(d) { return 'line ' + d.name; })
          .attr("d", function(d) { return line(d.values); });

      index.append("text")
          .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
          .attr("transform", function(d) { return "translate(" + x(d.value.year) + "," + y(d.value.count) + ")"; })
          .attr("x", 3)
          .attr("dy", ".35em")
          .text(function(d) { return d.name; });
    }

    function displayTotals(data) {
      var width = 400,
          height = 300;

      var totals = container.append('div')
          .attr('class', 'layer totals')
          .style({
            'width': width + 'px',
            'height': height + 'px'
          });

      indexes.forEach(function (index) {
        totals.append('div')
            .attr('class', 'total ' + index)
            .html('<i class="icon-' + index + '"></i>' +
                  '<strong>' + formatter(data[index]) + '</strong> ' + index);
      });
    }

    // Load global data.
    function loadData() {
      spinner.spin(container.node());

      queue()
          .defer(rwapi.countByYears, 'reports')
          .defer(rwapi.countByYears, 'jobs')
          .defer(rwapi.countByYears, 'training')
          .defer(rwapi.countByYears, 'disasters')
          .await(function (error, reports, jobs, training, disasters) {
            spinner.stop();

            if (!error) {
              drawGraph({
                reports: reports.data,
                jobs: jobs.data,
                training: training.data,
                disasters: disasters.data
              });

              displayTotals({
                reports: reports.total,
                jobs: jobs.total,
                training: training.total,
                disasters: disasters.total
              });
            }
          });
    }

    var container = d3.select('#' + id),
        spinner = new Spinner(),
        startingYear = 1996,
        currentYear = new Date().getUTCFullYear(),
        width = 500,
        height = 200,
        formatter = d3.format(",.0f"),
        indexes = ['reports', 'jobs', 'training', 'disasters'];

    return {
      load: function () {
        loadData();
      }
    };
  };

})();
