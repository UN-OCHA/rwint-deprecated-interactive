(function () {

  'use strict';

  // SimpleAutocomplete.
  var URLLoader = window.URLLoader = {};

  // Merge properties of objects passed as arguments into target.
  URLLoader.extend = function (target) {
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
  };

  // Send a GET request to a url.
  URLLoader.get = function (url, callback, options) {
    var xhr, cors, handler, success = 200, l = location;

    options = options || {};

    // Cross domain request?
    cors = typeof options.cors !== 'undefined' ? options.cors :
           url.indexOf(l.protocol + '//' + l.domain + (l.port ? ':' + l.port : '')) !== 0;

    // Internet explorer.
    if (cors && typeof window.XDomainRequest !== 'undefined') {
      xhr = new window.XDomainRequest();
      success = undefined;
    }
    // Other browsers.
    else if (typeof window.XMLHttpRequest === 'undefined') {
      xhr = new XMLHttpRequest();
    }

    if (!xhr || !('onload' in xhr)) {
      callback(false, 'Browser not supported.');
      return null;
    }

    // Make sure the callback is executed only once by setting it to noop.
    handler = function () {
      callback.apply(xhr, arguments);
      callback = function () {};
    };

    xhr.onprogress = function () {};

    xhr.onload = function () {
      if (this.status === success) {
        handler(true, this.responseText);
      }
      else {
        handler(false, this.statusText);
      }
    };

    xhr.onerror = function () {
      handler(false, this.statusText);
    };

    xhr.open('GET', url, true);

    // Set headers if any (doesn't work with XDomainRequest).
    if (typeof options.headers === 'object' && 'withCredentials' in xhr) {
      var headers = options.headers, header;
      for (header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, headers[header]);
        }
      }
    }

    delete options.cors;
    delete options.headers;

    // Extra parameters and overrides.
    URLLoader.extend(xhr, options);

    xhr.send(null);

    return xhr;
  };

})();
