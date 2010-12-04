"use strict";
var fs = require('fs')
, Client = require('./client').Client
;

function merge_spec(a, b) {
    if (!b)
        return a;
    var keys = Object.keys(b);
    for (var i = 0, len = keys.length; i < len; ++i) {
        if (keys[i] == 'methods') {
            a[keys[i]] = merge_spec(a.methods || {}, b.methods);
        } else {
            a[keys[i]] = b[keys[i]];
        }
    }
    return a;
}
/**
 * Create client with a spec file
 */
exports.createClient = function(sporeResource) {
    var middlewares = [];
    var specs       = []
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == 'function') {
            middlewares.push(arguments[i]);
        } else {
            specs.push(arguments[i]);
        }
    }
    var spore = {};
    specs.forEach(function(spec) {
        // load from file
        if (typeof spec == 'string' && (spec[0] == '.' || spec[0] == '/')) {
            // call to readFileSync should be avoid
            var content = fs.readFileSync(spec);
            spore = merge_spec(spore, JSON.parse(content));
        }
        // load from json
        else if (typeof spec == 'string') {
            spore = merge_spec(spore, JSON.parse(spec));
        }
        // object
        else {
            spore = merge_spec(spore, spec);
        }
    });
    return new Client(middlewares, spore);
};
/**
 * Create with an url
 * Params:
 *  - url
 *  - callback
 */
exports.createClientWithUrl = function(url, callback) {
    var request = require('./httpclient').createRequest(require('http'), url, 'GET');
    request.finalize(function(err, res) {
        if (err) callback(err, null);
        else callback(null, exports.createClient(JSON.parse(res.body)));
    });
};
/**
 * Create server
 * Params:
 *  - server: server created by express
 *  - spec: path to spore description file
 *  - imple
 */
exports.createServer = function(server, spec, imple) {
    // call to readFileSync should be avoid
    var content = fs.readFileSync(spec);
    spec = JSON.parse(content);
    for (var methodName in spec.methods) {
        var method = spec.methods[methodName];
        var verb = method.method.toLowerCase();
        if (verb != 'head') {
            if (imple[methodName]) {
                server[verb](method.path, imple[methodName]);
            } else { // not implemented
                server[verb](method.path, function(req, res) {
                    res.send(501);
                });
            }
        }
    }
};
