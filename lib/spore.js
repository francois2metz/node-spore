/**
 * Spore Spec implementation
 */
var fs = require('fs')
, http = require('http')
, url  = require('url')
;
/**
 * Client
 */
function Client(spore) {
    this.httpClient = http;
    if (typeof spore == 'string')
    {
        // call to readFileSync should be avoid
        var spec = fs.readFileSync(spore);
        spore = JSON.parse(spec);
    }
    this.spec = spore;
    var that = this;
    for (methodName in spore.methods) {
        this[methodName] = function() {
            that._call(methodName, arguments);
        }
    };
}
Client.prototype = {
    _call: function(methodName, args) {
        var params = args[0];
        var callback = args[1];
        var methodDef = this.spec.methods[methodName];
        if (this._isValidCall(methodDef, callback, params)) {
            var urlInfos = url.parse(this.spec.api_base_url);
            var client   = this.httpClient.createClient(urlInfos.port ? urlInfos.port : 80, urlInfos.host);
            var request  = client.request(methodDef.method, this._formatPath(methodDef, params),
                                          {'host': urlInfos.host});
            request.end();
        }
    },

    _isValidCall: function(methodDef, callback, params) {
        for (var index in methodDef.required) {
            var requiredParamName = methodDef.required[index];
            if (params[requiredParamName] == null || params[requiredParamName] == undefined) {
                callback(requiredParamName +' param is required');
                return false;
            }
        }
        for (var param in params) {
            if (methodDef.params.indexOf(param) == -1
                && methodDef.required.indexOf(param)) {
                callback(param +' param is unknow');
                return false;
            }
        }
        return true;
    },

    _formatPath: function(methodDef, params) {
        return '/statuses/public_timeline.json';
    }
};
/**
 * API
 */
function API() {
    throw 'not implemented. Please fork and add code here ;)';
}

exports.Client = Client;
exports.API    = API;
