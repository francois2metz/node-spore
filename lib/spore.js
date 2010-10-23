/**
 * Spore Spec implementation
 */
var fs = require('fs')
, http = require('http')
, url  = require('url')
, querystring = require('querystring')
;
/**
 * Client
 */
function Client(spec) {
    this.httpClient = http;
    this.spec = spec;
    var that = this;
    function create_wrapper(methodName) {
        return function() {
            that._call(methodName, arguments);
        }
    }
    for (methodName in spec.methods) {
        this[methodName] = create_wrapper(methodName);
    }
}
Client.prototype = {
    _call: function(methodName, args) {
        var params = args[0];
        var callback = args[1];
        var methodDef = this.spec.methods[methodName];
        if (this._isValidCall(methodDef, callback, params)) {
            var base_url = (methodDef.base_url || this.spec.base_url);
            var urlInfos = url.parse(base_url);
            var client   = this.httpClient.createClient(urlInfos.port ? urlInfos.port : 80, urlInfos.host);
            var request  = client.request(methodDef.method, this._formatPath(base_url, methodDef, params),
                                          {'host': urlInfos.host});
            var data = "";
            request.on('response', function(response) {
                response.on('data', function(chunk) {
                    data += chunk;
                });
                response.on('end', function() {
                    callback(null, data);
                });
            });
            request.end();
        }
    },

    _isValidCall: function(methodDef, callback, params) {
        for (var index in methodDef.required_params) {
            var requiredParamName = methodDef.required_params[index];
            if (params[requiredParamName] == null || params[requiredParamName] == undefined) {
                callback(requiredParamName +' param is required');
                return false;
            }
        }
        for (var param in params) {
            if (methodDef.optional_params.indexOf(param) == -1
                && methodDef.required_params.indexOf(param)) {
                callback(param +' param is unknow');
                return false;
            }
        }
        return true;
    },

    _formatPath: function(base_url, methodDef, params) {
        var base_path   = url.parse(base_url).pathname;
        var path        = base_path + methodDef.path;
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
/**
 * API
 */
function API() {
    throw 'not implemented. Please fork and add code here ;)';
}

exports.createClient = function(sporeResource) {
    if (typeof sporeResource == 'string')
    {
        // call to readFileSync should be avoid
        var content = fs.readFileSync(sporeResource);
        sporeResource = JSON.parse(content);
    }
    return new Client(sporeResource);
};

exports.API = API;
