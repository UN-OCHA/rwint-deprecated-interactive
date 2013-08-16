(function() {
  // Variables from post page.
  var center_lon = 30;
  var center_lat = 71;
  var zoom_min = 5;
  var zoom_max = 7;
  var zoom_default = 6;
  var data_key = '0Ap0itMVUpmqcdGxmYnNQeVJiNTd2Y0p0eU1zVGEwV2c';
  // Just add the ID of the spreadsheet to the end of the following URL.
  var data_url = 'https://docs.google.com/spreadsheet/pub?key=' + data_key + '&single=true&output=csv&gid=';

  // Setup the scrollbar on the categories sidebar.
  $('document').ready(function() {
    $('#sidebar .categories').niceScroll({
        preservenativescrolling: false,
        cursorwidth: '8px',
        cursorborder: 'none',
        cursorborderradius:'0px',
        cursorcolor:"#000000",
        autohidemode: false,
        background:"#333333"
     });
  });

  // Create a map and overwrite min, max zoom and set the center and default zoom level.
  var map = L.mapbox.map('map', 'reliefweb.1_AVMU_World', {
    zoomControl: false,
    minZoom: zoom_min,
    maxZoom: zoom_max
  }).setView([center_lon, center_lat], zoom_default);

  // Set zoom control to the right.
  new L.Control.Zoom({ position: 'topright' }).addTo(map);

  //add layers
  L.mapbox.tileLayer('reliefweb.pak_base_pco').addTo(map);

  // Create the IDP layer.
  var IDP_layer = L.maptools.circlelayer(data_url + 2, {
    tooltip: function(feature) {
      var district = feature.properties.District;
      var IDP_number = feature.properties.IDP_ind_130714;
      return '<div class="marker-tooltip">' +
             '<span class="district">' + district + ' district</span>' + '</br>' +
             '<span class="idp-number">' + IDP_number + '</span> IDPs' +
             '</div>';
    }
  }).addTo(map);

  // Create the Camp layer.
  var camp_layer = L.maptools.markerlayer(data_url + 0, {
    tooltip: function(feature) {
      var district = feature.properties.district;
      var camp = feature.properties.camp;
      var IDP_number = feature.properties.IDP_130714;
      return '<div class="marker-tooltip">' +
             '<span class="district">' + district + ' district</span>' + '</br>' +
             '<span class="camp">' + camp + ' camp</span>' + '</br>' +
             '<span class="idp-number">' + IDP_number + '</span> IDPs' +
             '</div>';
      return '';
    }
  }).addTo(map);

  // Formatting functions for the FTS data.
  function formatFunding(value) {
    return '$' + Math.round((value / 1000000.0).toFixed(3)).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + 'M';
  }
  function capitalize(str) {
    return str.replace(/\w\S*/g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  }

  // Get and display the fundings Graph from FTS.
  var fundings = false;
  function getFundings(country) {
    if (!fundings) {
      var currentYear = new Date().getFullYear();

      function tooltipMouseOver(event) {
        var item = event.hoveredItem;
        var tooltip = $(event.target).next('.tooltip');
        tooltip.html(formatFunding(item.value));
        tooltip.css('top', (item.bottom - tooltip.outerHeight()).toString() + 'px');
        tooltip.css('left', (((item.right + item.left) / 2) - (tooltip.outerWidth() / 2)).toString() + 'px');
        tooltip.removeClass('hidden');
      }

      function tooltipMouseOut(event) {
        var tooltip = $(event.target).next('.tooltip');
        tooltip.addClass('hidden');
      }

      // Appeals.
      $.get('http://fts.rwdev.org/api/v1/appeal/country/' + country + '.xml', {}, function(data) {
        var json = $.xml2json(data).Appeal;
        var appeals = [];
        var year = 0;
        var currentAppeal = false;
        var appeal = null;
        var target = null;
        var context = null;

        for (var i = 0, l = json.length; i < l; i++) {
          appeal = json[i];
          appeal = {
            id: parseInt(appeal.id),
            emergencyId: parseInt(appeal.emergency_id),
            year:  parseInt(appeal.year),
            requested: parseInt(appeal.current_requirements),
            received: parseInt(appeal.funding),
            pledges: parseInt(appeal.pledges),
            type: appeal.type
          };
          if (appeal.requested > 0) {
            if (appeal.year > year) {
              year = appeal.year;
              currentAppeal = appeal;
            }
            appeal.remaining = appeal.requested - appeal.received;
            appeals.push(appeal);
          }
        }

        appeals.sort(function(a, b) {
          return (a.year < b.year) ? -1 : ((a.year > b.year) ? 1 : 0);
        });

        // Current appeal.
        if (currentAppeal) {
          var funded = Math.round((currentAppeal.received / currentAppeal.requested) * 100);
          $('#sidebar .category.funding .appeal .requested').removeClass('hidden').children('.value').html(formatFunding(currentAppeal.requested));
          $('#sidebar .category.funding .appeal .received').removeClass('hidden').children('.value').html(formatFunding(currentAppeal.received));
          $('#sidebar .category.funding .appeal .funded').removeClass('hidden').children('.value').html(funded.toString() + "%");

          // Funded percentage.
          var canvas = $('#sidebar .category.funding .appeal .percentage').get(0);
          var context = canvas.getContext('2d');
          var percentageData = [Math.PI * 2 * funded / 100, Math.PI * 2 * (100 - funded) / 100];
          var percentageColor = ['#0988bb', '#eee'];
          var x = canvas.width / 2;
          var y = canvas.height / 2;
          var lastend = 0;

          for (var i = 0; i < percentageData.length; i++) {
            context.fillStyle = percentageColor[i];
            context.beginPath();
            context.moveTo(x, y);
            context.arc(x, y, y, lastend, lastend + percentageData[i], false);
            context.lineTo(x,y);
            context.fill();
            lastend += percentageData[i];
          }

          $.get('http://fts.rwdev.org/api/v1/cluster/appeal/' + currentAppeal.id + '.xml', {}, function(data) {
            var clusters = $.xml2json(data).Cluster;
            var cluster = null;

            // Clusters chart.
            var series = [[],[]];
            var options = {
              stacked: true,
              labels: [],
              barFillColor: ["rgba(151,187,205,0.5)", "rgba(220,220,220,0.5)"],
              barLineColor: ["rgba(151,187,205,1)", "rgba(220,220,220,1)"],
              formatDataValue: formatFunding,
              mouseover: tooltipMouseOver,
              mouseout: tooltipMouseOut,
              scaleStepHop: 50000000
            };
            for (var j = 0, k = clusters.length; j < k; j++) {
              cluster = clusters[j];
              cluster.received = parseInt(cluster.funding);
              cluster.requested = parseInt(cluster.current_requirement);
              cluster.remaining = cluster.requested - cluster.received;
              options.labels.push(capitalize(cluster.name));
              series[0].push(cluster.received);
              series[1].push(cluster.remaining < 0 ? 0 : cluster.remaining);
            }
            SimpleChart.bar('#sidebar .category.funding .clusters .chart', series, options);

            // Appeals history.
            series = [[],[]];
            options.scaleStepHop = 100000000;
            options.labels = [];
            for (var j = 0, k = appeals.length; j < k; j++) {
              appeal = appeals[j];
              options.labels.push(appeal.year);
              series[0].push(appeal.received);
              series[1].push(appeal.remaining);
            }

            SimpleChart.bar('#sidebar .category.funding .appeals .chart', series, options);
          });
        }
      }, 'xml');
      fundings = true;
    }
  }

  // Get latest headlines about IDPs in Pakistan from ReliefWeb.
  var headlines = false;
  function getHeadlines(country) {
    if (!headlines) {
    var url = 'http://api.rwlabs.org/v0/report/list';
      var params = {
        fields: {
          include: [
            'title',
            'headline.summary',
            'date.original',
            'source.shortname',
            'source.name',
            'url'
          ]
        },
        filter: {
          conditions: [{
            field: 'headline'
          },{
            field: 'vulnerable_groups',
            value: 'IDPs'
          },{
            field: 'primary_country',
            value: country
          }],
          operator: 'and'
        },
        sort: ['date.original:desc'],
        limit: 5
      };
      $.get(url, $.param(params), function (data) {
        data = data.data.list;
        var content = [];
        var now = new Date();
        for (var i = 0, l = data.length; i < l; i++) {
          var fields = data[i].fields;
          var date = new Date(fields.date.original);
          var source = '';
          if (fields.source) {
            if (fields.source[0].shortname) {
              source = fields.source[0].shortname;
            }
            else if (fields.source[0].name) {
              source = fields.source[0].name;
            }
          }
          content.push(
            '<div class="headline">'  + "\n" +
            '<h4 class="title"><a href="' + fields.url + '">' + fields.title.replace(/^Pakistan\s*:\s*/i, '') + '</a></h4>' + "\n" +
            '<span class="date">' + date.toUTCString() + ' - <em>' + source + '</em></span>' + "\n" +
            '<p class="summary">' + fields.headline.summary + '</p>' + "\n"
          );
        }
        content = "<ul>\n<li class='headline'>\n" + content.join("</li>\n<li class='headline'>\n") + "</li>\n</ul>\n";
        $('#sidebar .category.timeline .headlines').html(content);
      }, 'json');
      headlines = true;
    }
  }

  // Make sure canvas have proper width and height;
  $('canvas').each(function () {
    var target = $(this);
    target.attr('width', target.css('width'));
    target.attr('height', target.css('height'));
  });

  // Hide/show categories.
  $('#sidebar .navigation .button').click(function(event) {
    event.preventDefault();

    $('#sidebar .navigation .button').removeClass('active');
    $(this).addClass('active');

    var target = this.href.substr(this.href.lastIndexOf('#') + 1);

    $('#sidebar .category').addClass('hidden');
    $('#sidebar .category.' + target).removeClass('hidden');

    $('#sidebar .categories').getNiceScroll().resize();

    if (target === 'funding') {
      getFundings('pakistan');
    }
    else if (target === 'timeline') {
      getHeadlines('pakistan');
    }
  });

  // Show timeline popup.
  $('.timeline-popup-show').click(function(event){
    event.preventDefault(); // Disable normal link function so that it doesn't refresh the page.
    $('.timeline-popup-container').show(); // Display the popup.
  });

  // Hide timeline popup.
  $('.timeline-popup-hide').click(function(event) {
    event.preventDefault();
    $('.timeline-popup-container').hide(); // Hide the popup.
  });
})();
