"use strict";
var http = require('http')
, https = require('https')
, simpleHttp = require('./httpclient')
, urlparse = require('url').parse
;

/**
 * Client
 */
function Client(middlewares, spec) {
    this.httpClient  = {
        http: http,
        https: https
    }
    this._spec       = spec;
    this.middlewares = [];
    middlewares.forEach(this.enable.bind(this));
    var that = this;
    function create_wrapper(methodName) {
        return function() {
            that._call(methodName, Array.prototype.slice.call(arguments));
        }
    }
    for (var methodName in spec.methods) {
        var method = spec.methods[methodName];
        this._normalizeSpecMethod(spec, method);
        this[methodName] = create_wrapper(methodName);
    }
}
Client.prototype = {
    get spec() {
        return this._spec;
    },
    /**
     * Direct get request
     */
    get: function(url, callback) {
        var parsedUrl = urlparse(url, true);
        var method = this._normalizeSpecMethod(this.spec, {
            base_url: parsedUrl.protocol +'//' + parsedUrl.hostname,
            headers: {},
            method: 'GET',
            path: parsedUrl.pathname + parsedUrl.search
        });
        var request = this._createRequest(method, {}, null);
        this._callRequestMiddlewares(this.middlewares.slice(0), method, request, [], callback);
    },
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
        ['authentication', 'unattended_params',
         'expected_status', 'formats'].forEach(function(property) {
            if (method[property] === undefined)
                method[property] = spec[property];
        });
        if (!method.required_params) method.required_params = [];
        if (!method.optional_params) method.optional_params = [];
        method.method = method.method.toUpperCase();
        Object.freeze(method);
        return method;
    },

    _call: function(methodName, args) {
        var method   = this.spec.methods[methodName];
        if (method.deprecated === true)
            console.warn('Method '+ methodName + ' is deprecated.')
        var callback = args.pop(); // callback is always at the end
        var params   = args[0];
        var payload  = null;
        if (args.length > 1) {
            payload = args[1];
        } else {
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
                     * got an error
                     * break middleware chain and callback
                     */
                    if (retVal && retVal instanceof Error) {
                        return callback(retVal, null);
                    }
                    /**
                     * got a response object
                     * break middleware chain and bypass request
                     */
                    if (retVal && typeof retVal == 'object') {
                        return that._callResponseMiddlewares(response_middlewares, retVal, callback);
                    }
                    /**
                     * got a callback
                     * push it on response_middlewares array
                     * will be called after request
                     */
                    if (retVal && typeof retVal == 'function') {
                        response_middlewares.unshift(retVal);
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
        var headers   = {};
        for (var header in method.headers) {
            headers[header] = method.headers[header];
        }
        return simpleHttp.createRequest(this.httpClient, baseUrl + method.path, method.method, headers, params, payload);
    },

    /**
     * Make http request
     */
    _makeRequest: function(request, callback, response_middlewares) {
        var that = this;
        request.finalize(function(err, res) {
            if (err) callback(err, null);
            else that._callResponseMiddlewares(response_middlewares, res, callback);
        });
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
            /**
             * got an error
             * break middleware chain and callback
             */
            if (retVal && retVal instanceof Error) {
                return callback(retVal, response);
            }
            /**
             * got a response object
             * break middleware chain and bypass request
             */
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
            if (!params.hasOwnProperty(requiredParamName)) {
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
        // TODO: optional_payload is also on spore specification
        if (!payload && methodDef.required_payload === true) {
            callback("payload is required");
            return false;
        }
        return true;
    }
};

exports.Client = Client;
