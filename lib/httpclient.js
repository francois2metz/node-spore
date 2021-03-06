"use strict";
/**
 * Simple http client
 * make request and callback with response or error
 */
var querystring = require('querystring')
, urlparse  = require('url')
;
/**
 * Request object
 * Params:
 *  - httpClient: httpClient
 *  - url
 *  - method: http method
 *  - headers
 *  - params
 *  - payload
 */
function Request(httpClient, url, method, headers, params, payload) {
    url = urlparse.parse(url, true); // query string parsing
    this.httpClient   = httpClient;
    this.scheme       = url.protocol.substr(0, url.protocol.length - 1);
    this.port         = url.port ? url.port : (this.scheme === 'http' ? 80 : 443);
    this.host         = url.hostname;
    this.method       = method;
    this.path_info    = url.pathname;
    this.query_string = url.query || {};
    this.headers      = headers || {},
    this.params       = params || {};
    this.payload      = payload || null;
    this.headers['host'] = url.hostname;
}
Request.prototype = {
    get uri() {
        return this._formatPath(this.path_info, this.params);
    },
    /**
     * Format uri with params
     * add orphelin params in query string
     */
    _formatPath: function(path, params) {
        var queryString = this.query_string;
        for (var param in params) {
            var re = new RegExp(":"+ param)
            var found = false;
            if (path.search(re) != -1) {
                path = path.replace(re, params[param]);
                found = true;
            }
            for (var query in queryString) {
                if (queryString[query].search
                    && queryString[query].search(re) != -1) {
                    queryString[query] = queryString[query].replace(re, params[param]);
                    found = true;
                }
            }
            // exclude params in headers
            for (var header in this.headers) {
                if (this.headers[header].search(re) != -1) {
                    found = true;
                }
            }
            if (!found)
                queryString[param] = params[param];
        }
        var query = querystring.stringify(queryString);
        return path + ((query != "") ? "?"+ query : "");
    },
    /**
     * format final headers
     */
    _formatHeaders: function(headers, params) {
        var newHeaders = {};
        for (var header in headers)
            newHeaders[header] = headers[header];
        for (var param in params) {
            var re = new RegExp(":"+ param);
            for (var header in newHeaders) {
                if (newHeaders[header].search(re) != -1) {
                    newHeaders[header] = newHeaders[header].replace(re, params[param]);
                }
            }
        }
        return newHeaders;
    },
    /**
     * Make request to the server
     * Params:
     *  - callback
     */
    finalize: function(callback) {
        var headers     = this._formatHeaders(this.headers, this.params);
        if (this.payload != null) {
            headers['content-length'] = new Buffer(this.payload).length;
        } else if (this.method == 'POST' || this.method == 'DELETE' || this.method == 'PUT') {
            headers['content-length'] = 0;
        }
        var client = this.httpClient.http;
        if (this.scheme == 'https') client = this.httpClient.https;
        var httpRequest = client.request({port    : this.port,
                                          host    : this.host,
                                          method  : this.method,
                                          path    : this.uri,
                                          headers : headers},
                                         function(response) {
                                             var data = "";
                                             response.on('data', function(chunk) {
                                                 data += chunk;
                                             });
                                             response.on('end', function() {
                                                 var c = {
                                                     status  : response.statusCode,
                                                     headers : response.headers,
                                                     body    : data
                                                 };
                                                 callback(null, c);
                                             });
                                         });
        httpRequest.on('error', function(e) {
            callback(e, null);
        });
        if (this.payload !== null)
            httpRequest.write(this.payload);
        httpRequest.end();
    }
};
/**
 * Create http request
 */
exports.createRequest = function(httpClient, url, method, headers, params, payload) {
    return new Request(httpClient, url, method, headers, params, payload);
};
