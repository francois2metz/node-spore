"use strict";
var http = require('http')
, url  = require('url')
, querystring = require('querystring')
, simpleHttp = require('./httpclient')
;

/**
 * Request object
 * Params:
 *  - parsedUrl: created by url.parse
 *  - method: http method
 *  - headers
 *  - params
 *  - payload
 */
function Request(parsedUrl, method, headers, params, payload) {
    this.scheme       = parsedUrl.protocol.substr(0, parsedUrl.protocol.length - 1);
    this.port         = parsedUrl.port ? parsedUrl.port : (this.scheme === 'http' ? 80 : 443);
    this.host         = parsedUrl.hostname;
    this.method       = method;
    this.path_info    = parsedUrl.pathname;
    this.query_string = parsedUrl.query || {};
    this.headers      = headers,
    this.params       = params;
    this.payload      = payload;
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
        for (var param in params) {
            var re = new RegExp(":"+ param)
            for (var header in headers) {
                if (headers[header].search(re) != -1) {
                    headers[header] = headers[header].replace(re, params[param]);
                }
            }
        }
        return headers;
    },
    /**
     * Return a flat object with final headers and uri
     */
    finalize: function() {
        return {
            port   : this.port,
            host   : this.host,
            scheme : this.scheme,
            method : this.method,
            uri    : this.uri,
            headers: this._formatHeaders(this.headers, this.params),
            params : this.params,
            payload: this.payload
        };
    }
};

/**
 * Client
 */
function Client(middlewares, spec) {
    this.httpClient  = http;
    this.spec        = spec;
    this.middlewares = [];
    middlewares.forEach(this.enable.bind(this));
    var that = this;
    function create_wrapper(methodName) {
        return function() {
            that._call(methodName, arguments);
        }
    }
    for (methodName in spec.methods) {
        var method = spec.methods[methodName];
        this._normalizeSpecMethod(spec, method);
        this[methodName] = create_wrapper(methodName);
    }
}
Client.prototype = {
    /**
     * Enable middleware at runtime
     */
    enable: function(middleware) {
        this.enable_if(function() { return true; }, middleware);
    },
    /**
     * Enable middleware if cond return true
     */
    enable_if: function(cond, middleware) {
        this.middlewares.push({cond: cond, fun: middleware});
    },
    /**
     * Disable middleware at runtime
     */
    disable: function(middleware) {
        this.middlewares = this.middlewares.filter(function(element) {
            if (element.fun === middleware)
                return false;
            return true;
        });
    },

    _normalizeSpecMethod: function(spec, method) {
        if (method.authentication === undefined) {
            method.authentication = spec.authentication;
        }
        if (method.unattended_params === undefined) {
            method.unattended_params = spec.unattended_params;
        }
        if (!method.expected_status) {
            method.expected_status = spec.expected_status;
        }
        if (spec.formats && !method.formats) {
            method.formats = spec.formats;
        }
        if (!method.required_params) {
            method.required_params = [];
        }
        if (!method.optional_params) {
            method.optional_params = [];
        }
        method.method = method.method.toUpperCase();
        Object.freeze(method);
    },

    _call: function(methodName, args) {
        var method  = this.spec.methods[methodName];
        if (method.deprecated === true)
            console.warn('Method '+ methodName + ' is deprecated.')
        var params  = args[0];
        var payload = null;
        if (args.length > 2) {
            var callback = args[2];
            payload = args[1];
        } else if (args.length == 1) {
            var callback = args[0];
        } else {
            var callback = args[1];
            if (method.required_params.length == 0
                && method.optional_params.length == 0) {
                payload = args[0];
                params = null;
            }
        }
        if (this._isValidCall(method, callback, params, payload)) {
            var request = this._createRequest(method, params, payload);
            this._callRequestMiddlewares(this.middlewares.slice(0), method, request, [], callback);
        }
    },
    /**
     * Call each middlewares with callback named 'next' for asynchronous processing.
     */
    _callRequestMiddlewares: function(middlewares, method, request, response_middlewares, callback) {
        var that = this;
        try {
            var middleware = middlewares.shift();
            if (!middleware) {
                return this._makeRequest(request, callback, response_middlewares);
            }
            if (middleware.cond(method, request)) {
                var middleware_callback = function(retVal) {
                    /**
                     * got a response object
                     * break middleware chain and bypass request
                     */
                    if (retVal && typeof retVal == 'object') {
                        return that._endCall(retVal, callback, response_middlewares);
                    }
                    /**
                     * got a callback
                     * push it on response_middlewares array
                     * will be called after request
                     */
                    if (retVal && typeof retVal == 'function') {
                        response_middlewares.push(retVal);
                    }
                    that._callRequestMiddlewares(middlewares, method, request, response_middlewares, callback);
                };
                middleware.fun(method, request, middleware_callback);
            } else {
                this._callRequestMiddlewares(middlewares, method, request, response_middlewares, callback);
            }
        } catch (e) {
            callback(e, null);
        }
    },

    /**
     * request object
     * Params:
     *   - method: spore method called
     *   - params
     *   - payload
     */
    _createRequest: function(method, params, payload) {
        var baseUrl   = (method.base_url || this.spec.base_url).replace(/(\/)$/, '');
        var parsedUrl = url.parse(baseUrl + method.path, true); // query string parsing
        var headers   = {'host': parsedUrl.hostname};
        for (var header in method.headers) {
            headers[header] = method.headers[header];
        }
        return new Request(parsedUrl, method.method, headers, params, payload);
    },

    /**
     * Make http request
     */
    _makeRequest: function(request, callback, response_middlewares) {
        var that = this;
        simpleHttp.request(this.httpClient, request, function(err, res) {
            if (err) callback(err, null);
            else that._endCall(res, callback, response_middlewares);
        });
    },

    _endCall: function(response, callback, middlewares) {
        this._callResponseMiddlewares(middlewares.reverse(), response, callback);
    },

    /**
     * Call each middlewares with callback named 'next' for asynchronous processing.
     */
    _callResponseMiddlewares: function(middlewares, response, callback) {
        var that = this;
        var middleware = middlewares.shift();
        if (!middleware) {
            return callback(null, response);
        }
        var middleware_callback = function(retVal) {
            // got a response object: break middleware chain
            if (retVal && typeof retVal == 'object') {
                return callback(null, retVal);
            }
            that._callResponseMiddlewares(middlewares, response, callback);
        };
        try {
            middleware(response, middleware_callback);
        } catch (e) {
            callback(e, response);
        }
    },
    /**
     * Check params and payload
     */
    _isValidCall: function(methodDef, callback, params, payload) {
        // check required params
        for (var index in methodDef.required_params) {
            var requiredParamName = methodDef.required_params[index];
            if (params[requiredParamName] == null || params[requiredParamName] == undefined) {
                callback(requiredParamName +' param is required');
                return false;
            }
        }
        // check unattended params
        if (methodDef.unattended_params === false) {
            for (var param in params) {
                if (methodDef.optional_params.indexOf(param) == -1
                    && methodDef.required_params.indexOf(param) == -1) {
                    callback('unattended param '+ param);
                    return false;
                }
            }
        }
        // check payload
        if (payload && (methodDef.method == 'GET' || methodDef.method == 'HEAD')) {
            callback("payload is useless");
            return false;
        }
        // TODO: optional_payload is also on spore specification
        if (!payload && methodDef.required_payload === true) {
            callback("payload is required");
            return false;
        }
        return true;
    }
};

exports.Client = Client;
