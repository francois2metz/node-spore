/**
 * Spore Spec implementation
 */
/**
 * Client
 */
function Client(spore) {
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
        var method_def = this.spec.methods[methodName];
        for (var index in method_def.required) {
            var requiredParamName = method_def.required[index];
            if (params[requiredParamName] == null || params[requiredParamName] == undefined) {
                callback(requiredParamName +' param is required');
            }
        }
        for (var param in params) {
            if (method_def.params.indexOf(param) == -1
                && method_def.required.indexOf(param)) {
                callback(param +' param is unknow');
            }
        }

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
