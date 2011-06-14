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
        var part = null;
        // load from file
        if (typeof spec == 'string' && (spec[0] == '.' || spec[0] == '/')) {
            var content = fs.readFileSync(spec);
            part = JSON.parse(content);
        }
        // load from json
        else if (typeof spec == 'string') {
            part = JSON.parse(spec);
        }
        // object
        else {
            part = spec;
        }
        spore = merge_spec(spore, part);
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
    var request = require('./httpclient').createRequest({http: require('http'),
                                                         https: require('https')}, url, 'GET');
    request.finalize(function(err, res) {
        if (err) callback(err, null);
        else callback(null, exports.createClient(JSON.parse(res.body)));
    });
};
/**
 * Export all client middlewares
 */
exports.middlewares = require('./middlewares');
/**
 * Connect middleware
 * Params:
 *  - spec: path to spore description file
 *  - imple
 */
exports.middleware = function(spec, imple) {
    var router = require('connect').router;
    // call to readFileSync should be avoid
    var content = fs.readFileSync(spec);
    spec = JSON.parse(content);
    return router(function(app) {
        for (var methodName in spec.methods) {
            var method = spec.methods[methodName];
            var verb = method.method.toLowerCase();
            if (verb != 'head') {
                if (imple[methodName]) {
                    app[verb](method.path, imple[methodName]);
                } else { // not implemented
                    app[verb](method.path, function(req, res) {
                        res.writeHead(501);
                        res.end();
                    });
                }
            }
        }
    });
};
