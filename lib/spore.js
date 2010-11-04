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

exports.createServer = function(server, spec, imple) {
    // call to readFileSync should be avoid
    var content = fs.readFileSync(spec);
    spec = JSON.parse(content);
    server.get('/statuses/public_timeline.json', imple.public_timeline);
};
