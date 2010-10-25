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
        if (spec.formats && !method.formats) {
            method.formats = spec.formats;
        }
        if (!method.required_params) {
            method.required_params = [];
        }
        if (!method.optional_params) {
            method.optional_params = [];
        }
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

            var request = {SERVER_PORT    : urlInfos.port ? urlInfos.port : 80,
                           SERVER_NAME    : urlInfos.host,
                           REQUEST_METHOD : methodDef.method,
                           PATH_INFO      : urlInfos.pathname + methodDef.path,
                           headers        : headers,
                           spore          : {
                               params  : params,
                               payload : payload
                           }};
            this.middlewares.forEach(function(middleware) {
                if (middleware.request)
                    // TODO: must check return value
                    middleware.request(methodDef, request);
            });
            this._makeRequest(request, params, callback);
        }
    },

    _makeRequest: function(request, params, callback) {
        var client   = this.httpClient.createClient(request.SERVER_PORT, request.SERVER_NAME);
        var httpRequest  = client.request(request.REQUEST_METHOD, this._formatPath(request.PATH_INFO, params),
                                          request.headers);
        httpRequest.write(request.spore.payload);
        var data = "";
        httpRequest.on('response', function(response) {
            response.on('data', function(chunk) {
                data += chunk;
            });
            response.on('end', function() {
                callback(null, data);
            });
        });
        httpRequest.end();
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
