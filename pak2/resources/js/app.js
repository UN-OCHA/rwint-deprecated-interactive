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

  // Get and display the fundings Graph from FTS.
  var fundings = false;
  function drawFundings() {
    function getFundings(country) {
      var requests = [];
      var url = 'http://fts.rwdev.org/api/v1/funding.xml';
      for (var year = 2000, current = new Date().getFullYear(); year <= current; year++) {
        var request = $.extend($.get(url, {country: country, year: year}, null, 'xml'), {country: country, year: year});
        requests.push(request);
      }
      return requests;
    }

    if (!fundings) {
      $.when.all(getFundings('pakistan')).then(function(results) {
        var chart_data = {
          labels:[],
          datasets: [{
            fillColor: "rgba(151,187,205,0.5)",
            strokeColor: "rgba(151,187,205,1)",
            data: [],
            mouseover: function(event) {
              var item = event.hoveredItem;
              var tooltip = $(event.target).next('.tooltip');
              tooltip.html('$' + Math.round((item.value / 1000000.0).toFixed(3)).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + 'M');
              tooltip.css('top', (item.bottom - tooltip.outerHeight()).toString() + 'px');
              tooltip.css('left', (((item.right + item.left) / 2) - (tooltip.outerWidth() / 2)).toString() + 'px');
              tooltip.removeClass('hidden');
            },
            mouseout: function(event) {
              var tooltip = $(event.target).next('.tooltip');
              tooltip.addClass('hidden');
            }
          }]
        };
        var chart_options = {
          scaleOverlay: true,
          scaleLabel: "<%='$' + Math.round((value / 1000000.0).toFixed(3)).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,') + 'M'%>"
        };

        for (var i = 0, l = results.length; i < l; i++) {
          var response = results[i][2];
          var year = response.year;
          var country = response.country;
          var json = $.xmlToJSON(response.responseXML);
          var total = parseInt(json.funding.total.Text);

          chart_data.labels.push(response.year);
          chart_data.datasets[0].data.push(total);
        }
        var target = $('#sidebar .category.funding .fundings');
        target.attr('width', target.css('width'));
        target.attr('height', target.css('height'));

        var context =  target.get(0).getContext("2d");
        new Chart(context).Bar(chart_data, chart_options);
      });
      fundings = true;
    }
  }

  // Get latest headlines about IDPs in Pakistan from ReliefWeb.
  var headlines = false;
  function getHeadlines() {
    if (!headlines) {
    var url = 'http://api.rwlabs.org/v0/report/list';
      var params = {
        fields: {
          include: [
            'title',
            'headline.summary',
            'date.original',
            'url'
          ]
        },
        filter: {
          conditions: [
            {
              field: 'headline'
            },
            {
              field: 'vulnerable_groups',
              value: 'IDPs'
            },
            {
              field: 'primary_country',
              value: 'Pakistan'
            }
          ],
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
          content.push(
            '<div class="headline">'  + "\n" +
            '<h4 class="title"><a href="' + fields.url + '">' + fields.title.replace(/^Pakistan\s*:\s*/i) + '</a></h4>' + "\n" +
            '<span class="date">' + date.toUTCString() + '</span>' + "\n" +
            '<p class="summary">' + fields.headline.summary + '</p>' + "\n"
          );
        }
        content = "<ul>\n<li class='headline'>\n" + content.join("</li>\n<li class='headline'>\n") + "</li>\n</ul>\n";
        $('#sidebar .category.timeline .headlines').html(content);
      }, 'json');
      headlines = true;
    }
  }

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
      drawFundings();
    }
    else if (target === 'timeline') {
      getHeadlines();
    }
  });
})();
