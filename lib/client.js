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
    var that = this;
    middlewares.forEach(function(middleware) {
        that._addMiddleware(function() { return true; }, middleware);
    });
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
        this.middlewares.push({cond: cond, middleware: middleware});
    },
    /**
     * Enable middleware at runtime
     */
    enable: function(middleware) {
        this._addMiddleware(function() { return true; }, middleware);
    },
    /**
     * Enable middleware if fun return true
     */
    enable_if: function(fun, middleware) {
        this._addMiddleware(fun, middleware);
    },
    /**
     * Disable middleware at runtime
     */
    disable: function(middleware) {
        this.middlewares = this.middlewares.filter(function(element) {
            if (element.middleware === middleware)
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
            this._callMiddlewares(this.middlewares.slice(0), method, request, [], callback);
        }
    },

    _callMiddlewares: function(middlewares, method, request, response_middlewares, callback) {
        var that = this;
        try {
            var middleware = middlewares.shift();
            if (!middleware) {
                this._makeRequest(method, request, callback, response_middlewares);
                return;
            }
            if (middleware.cond(method, request)) {
                var middleware_callback = function(retVal) {
                    // response object
                    if (retVal && typeof retVal == 'object') {
                        that._endCall(method, retVal, callback, response_middlewares);
                        return;
                    } else if (retVal && typeof retVal == 'function') { // response callback
                        response_middlewares.push(retVal);
                    }
                    that._callMiddlewares(middlewares, method, request, response_middlewares, callback);
                };
                middleware.middleware(method, request, middleware_callback);
            } else {
                this._callMiddlewares(middlewares, method, request, response_middlewares, callback);
            }
        } catch (e) {
            callback(e, null);
        }
    },

    _createRequest: function(method, params, payload) {
        var baseUrl  = (method.base_url || this.spec.base_url);
        var urlInfos = url.parse(baseUrl);
        var headers  = {'host': urlInfos.hostname};

        return { port      : urlInfos.port ? urlInfos.port : 80,
                 host      : urlInfos.hostname,
                 scheme    : urlInfos.protocol.substr(0, urlInfos.protocol.length - 1),
                 method    : method.method,
                 path_info : urlInfos.pathname + method.path,
                 headers   : headers,
                 params    : params,
                 payload   : payload
               };
    },

    _makeRequest: function(method, request, callback, response_middlewares) {
        var client      = this.httpClient.createClient(request.port, request.host);
        var httpRequest = client.request(request.method, this._formatPath(request.path_info, request.params),
                                         request.headers);
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
                that._endCall(method, c, callback, response_middlewares);
            });
        });
        httpRequest.end();
    },

    _endCall: function(method, response, callback, response_middlewares) {
        try {
            response_middlewares.reverse();
            for (var i = 0; i < response_middlewares.length; i++) {
                var retVal = response_middlewares[i](response);
                if (retVal) {
                    response = retVal;
                    break;
                }
            }
            callback(null, response);
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
    },

    _formatPath: function(path, params) {
        var queryString = {};
        for (var param in params) {
            var re = new RegExp(":"+ param)
            if (path.search(re) != -1)
                path = path.replace(re, params[param]);
            else
                queryString[param] =  params[param];
        }
        var query = querystring.stringify(queryString);
        return path + ((query != "") ? "?"+ query : "");
    }
};

exports.Client = Client;
