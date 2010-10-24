/**
 * Spore Spec implementation
 */
var fs = require('fs')
, Client = require('./client').Client
;

exports.createClient = function(sporeResource) {
    var middlewares = [];
    if (arguments.length > 1) {
        for (var i = 0; i < arguments.length - 1; i++) {
            middlewares.push(arguments[i]);
        }
        sporeResource = arguments[arguments.length - 1];
    }
    if (typeof sporeResource == 'string')
    {
        // call to readFileSync should be avoid
        var content = fs.readFileSync(sporeResource);
        sporeResource = JSON.parse(content);
    }
    return new Client(middlewares, sporeResource);
};

exports.createServer = function() {
    throw 'not implemented. Please fork and add code here ;)';
};
