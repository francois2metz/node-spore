"use strict";
var http = require('http')
, url  = require('url')
, querystring = require('querystring')
;
/**
 * Client
 */
function Client(middlewares, spec) {
    this.httpClient = http;
    this.middlewares = middlewares;
    this.spec = spec;
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
        var methodDef = this.spec.methods[methodName];

        var params = args[0];
        var payload = null;
        if (args.length > 2) {
            var callback = args[2];
            payload = args[1];
        } else if (args.length == 1) {
            var callback = args[0];
        } else {
            var callback = args[1];
            if (methodDef.required_params.length == 0
                && methodDef.optional_params.length == 0) {
                payload = args[0];
                params = null;
            }
        }
        if (this._isValidCall(methodDef, callback, params, payload)) {
            var baseUrl  = (methodDef.base_url || this.spec.base_url);
            var urlInfos = url.parse(baseUrl);
            var headers  = {'host': urlInfos.host};

            var request = {port      : urlInfos.port ? urlInfos.port : 80,
                           host      : urlInfos.host,
                           scheme    : urlInfos.protocol.substr(0, urlInfos.protocol.length - 1),
                           method    : methodDef.method,
                           path_info : urlInfos.pathname + methodDef.path,
                           headers   : headers,
                           params    : params,
                           payload   : payload
                          };
            var response_middlewares = [];
            var response = null;
            try {
                for (var i in this.middlewares) {
                    var middleware = this.middlewares[i];
                    var retVal = middleware(methodDef, request);
                    if (retVal && typeof retVal == 'object') {
                        response = retVal;
                        break;
                    } else if (retVal && typeof retVal == 'function') {
                        response_middlewares.push(retVal)
                    }
                }
            } catch (e) {
                callback(e, null);
                return;
            }
            if (!response)
                this._makeRequest(methodDef, request, callback, response_middlewares);
            else
                this._endCall(methodDef, response, callback, response_middlewares);
        }
    },

    _makeRequest: function(method, request, callback, response_middlewares) {
        var client   = this.httpClient.createClient(request.port, request.host);
        var httpRequest  = client.request(request.method, this._formatPath(request.path_info, request.params),
                                          request.headers);
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
            response_middlewares.reverse().forEach(function(middleware) {
                middleware(response);
            });
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
