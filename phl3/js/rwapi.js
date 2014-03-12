(function() {
  var rwapi = window.rwapi = {
    base: 'http://api.rwlabs.org/v0/',
    countries: function() {
      return this.base + 'country/list?' + this.serialize({
        limit: 300,
        fields: {
          include: ['name', 'shortname', 'iso3']
        }
      });
    },
    reports: function (year) {
      return this.content('report', year, [{
        field: 'country.iso3.exact',
        name: 'country',
        limit: 300
      }, {
        field: 'theme.name.exact',
        name: 'theme',
        limit: 30
      }, {
        field: 'disaster_type.name.exact',
        name: 'disaster_type',
        limit: 30
      }]);
    },
    training: function (year) {
      return this.content('training', year, [{
        field: 'country.iso3.exact',
        name: 'country',
        limit: 300
      }, {
        field: 'theme.name.exact',
        name: 'theme',
        limit: 30
      }]);
    },
    jobs: function (year) {
      return this.content('job', year, [{
        field: 'country.iso3.exact',
        name: 'country',
        limit: 300
      }, {
        field: 'theme.name.exact',
        name: 'theme',
        limit: 30
      }]);
    },
    disasters: function (year) {
      return this.content('disaster', year, [{
        field: 'country.iso3.exact',
        name: 'country',
        limit: 300
      }, {
        field: 'type.name.exact',
        name: 'type',
        limit: 30
      }]);
    },
    content: function(index, year, facets) {
      var url = this.base + index + '/list?',
          params = {
            limit: 0,
            nodefault: 1,
            filter: {
              field: 'status',
              value: ['published', 'to-review', 'expired', 'current', 'past'],
              operator: 'OR'
            },
            facets: facets
          };

      if (year) {
        params.filter = {
          conditions: [
            params.filter,
            {
              field: 'date',
              value: {
                from: Date.UTC(year, 0, 1, 0, 0, 0, 0),
                to: Date.UTC(year + 1, 0, 1, 0, 0, 0, 0),
              }
            }
          ],
          operator: 'AND'
        };
      }
      else {
        params.facets.push({field: 'date'});
      }

      return url + this.serialize(params);
    },

    serialize: function (source, prefix) {
      var property, key, value, params = [];
      for (property in source) {
        if (source.hasOwnProperty(property)) {
          key = prefix ? prefix + "[" + encodeURIComponent(property) + "]" : property;
          value = source[property];
          params.push(typeof value === "object" ?
            this.serialize(value, key) :
            key + "=" + encodeURIComponent(value));
        }
      }
      return params.join("&").replace('%20', '+');
    },

    extend: function (target) {
      var sources = Array.prototype.slice.call(arguments, 1),
          i, l, property, source;
      for (i = 0, l = sources.length; i < l; i++) {
        source = sources[i] || {};
        for (property in source) {
          if (source.hasOwnProperty(property)) {
            target[property] = source[property];
          }
        }
      }
      return target;
    },

    defaultFilter: {
      conditions: [
        {
          field: 'status',
          value: ['to-review', 'published', 'expired', 'current', 'past'],
          operator: 'OR'
        },
        {
          field: 'date',
          value: {
            from: Date.UTC(1996, 1, 0, 0, 0, 0, 0)
          }
        }
      ],
      operator: 'AND'
    },

    post: function (url, data, callback) {
      if (data.hasOwnProperty('filter')) {
        data.filter = {
          conditions: [
            data.filter,
            rwapi.defaultFilter
          ],
          operator: 'AND'
        }
      }
      else {
        data.filter = rwapi.defaultFilter
      }
      data.nodefault = 1;

      d3.xhr(url).post(JSON.stringify(data), function (error, xhr) {
        callback(error, error ? null : JSON.parse(xhr.responseText));
      });
    },

    count: function (index, callback) {
      rwapi.post(rwapi.base + index + '/count', {}, function (error, data) {
        callback(error, error ? null : data.data.count);
      });
    },

    countByYears: function (index, callback) {
      rwapi.post(rwapi.base + index.replace(/s$/, '') + '/list', {limit: 0, facets: [{field: 'date'}]}, function (error, data) {
        if (!error) {
          var facet = data.data.facets.date,
              results = {};

          facet.entries.forEach(function (item) {
            results[new Date(item.time).getUTCFullYear()] = item.count;
          });

          callback(null, {total: data.data.total, data: results});
        }
        else {
          callback(error, null);
        }
      });
    }

  };
})();
