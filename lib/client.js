"use strict";
var http = require('http')
, url  = require('url')
, querystring = require('querystring')
;
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
    _addMiddleware: function(cond, middleware) {
        this.middlewares.push({cond: cond, fun: middleware});
    },
    /**
     * Enable middleware at runtime
     */
    enable: function(middleware) {
        this._addMiddleware(function() { return true; }, middleware);
    },
    /**
     * Enable middleware if cond return true
     */
    enable_if: function(cond, middleware) {
        this._addMiddleware(cond, middleware);
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
        if (spec.authentication === true
            && method.authentication !== false) {
            method.authentication = true;
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
                return this._makeRequest(method, request, callback, response_middlewares);
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
        var baseUrl  = (method.base_url || this.spec.base_url);
        var urlInfos = url.parse(baseUrl);
        var headers  = {'host': urlInfos.hostname};
        for (var header in method.headers) {
            headers[header] = method.headers[header];
        }

        return { port      : urlInfos.port ? urlInfos.port : 80,
                 host      : urlInfos.hostname,
                 scheme    : urlInfos.protocol.substr(0, urlInfos.protocol.length - 1),
                 method    : method.method,
                 path_info : urlInfos.pathname + method.path,
                 get uri() {
                     return this._formatPath(this.path_info, this.params);
                 },
                 headers   : headers,
                 params    : params,
                 payload   : payload,
                 _formatPath: function(path, params) {
                     var queryString = {};
                     for (var param in params) {
                         var re = new RegExp(":"+ param)
                         var found = false;
                         if (path.search(re) != -1) {
                             path = path.replace(re, params[param]);
                             found = true;
                         }
                         for (var header in this.headers) {
                             if (this.headers[header].search(re) != -1) {
                                 found = true;
                             }
                         }
                         if (!found)
                             queryString[param] =  params[param];
                     }
                     var query = querystring.stringify(queryString);
                     return path + ((query != "") ? "?"+ query : "");
                 },
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
    },

    _makeRequest: function(method, re, callback, response_middlewares) {
        var request     = re.finalize();
        var client      = this.httpClient.createClient(request.port, request.host);
        var httpRequest = client.request(request.method, request.uri, request.headers);
        client.on('error', function(e) {
            callback(e, null);
        });
        if (request.payload !== null)
            httpRequest.write(request.payload);
        var data = "";
        var that = this;
        httpRequest.on('response', function(response) {
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                var c = {
                    status  : response.statusCode,
                    headers : response.headers,
                    body    : data
                };
                that._endCall(c, callback, response_middlewares);
            });
        });
        httpRequest.end();
    },

    _endCall: function(response, callback, middlewares) {
        this._callResponseMiddlewares(middlewares.reverse(), response, callback);
    },

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

    _isValidCall: function(methodDef, callback, params, payload) {
        for (var index in methodDef.required_params) {
            var requiredParamName = methodDef.required_params[index];
            if (params[requiredParamName] == null || params[requiredParamName] == undefined) {
                callback(requiredParamName +' param is required');
                return false;
            }
        }
        for (var param in params) {
            if (methodDef.optional_params.indexOf(param) == -1
                && methodDef.required_params.indexOf(param) == -1) {
                callback(param +' param is unknow');
                return false;
            }
        }
        if (payload && (methodDef.method == 'GET' || methodDef.method == 'HEAD')) {
            callback("payload is useless");
            return false;
        }
        if (!payload && methodDef.required_payload === true) {
            callback("payload is required");
            return false;
        }
        return true;
    }
};

exports.Client = Client;
