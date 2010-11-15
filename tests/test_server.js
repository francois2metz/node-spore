"use strict";
// :(
require.paths.unshift(__dirname +"/minitest");
require.paths.unshift(__dirname +"/../lib");

var spore = require('spore');

var minitest = require("minitest");
var assert   = require("assert");
var express  = require("express");
var http     = require("http");
var sys      = require("sys");

var port = 5555;

/** https://github.com/visionmedia/expresso/blob/master/bin/expresso#L208
* Colorize the given string using ansi-escape sequences.
* Disabled when --boring is set.
*
* @param {String} str
* @return {String}
*/

function colorize(str){
    var boring = false;
    var colors = { bold: 1, red: 31, green: 32, yellow: 33 };
    return str.replace(/\[(\w+)\]\{([^]*?)\}/g, function(_, color, str){
        return boring
            ? str
            : '\x1B[' + colors[color] + 'm' + str + '\x1B[0m';
    });
}

/** assert.response from expresso (http://github.com/visionmedia/expresso/blob/master/bin/expresso) */
/**
* Assert response from `server` with
* the given `req` object and `res` assertions object.
*
* @param {Server} server
* @param {Object} req
* @param {Object|Function} res
* @param {String} msg
*/
assertResponse = function(server, req, res, msg){
    // Callback as third or fourth arg
    var callback = typeof res === 'function'
        ? res
        : typeof msg === 'function'
            ? msg
            : function(){};

    // Default messate to test title
    if (typeof msg === 'function') msg = null;
    msg = msg || assert.testTitle;
    msg += '. ';

    // Pending responses
    server.__pending = server.__pending || 0;
    server.__pending++;

    // Create client
    if (!server.fd) {
        server.listen(server.__port = port++, 'localhost');
        server.client = http.createClient(server.__port, 'localhost');
    }

    // Issue request
    var timer,
        client = server.client,
        method = req.method || 'GET',
        status = res.status || res.statusCode,
        data = req.data || req.body,
        requestTimeout = req.timeout || 0;

    var request = client.request(method, req.url, req.headers);

    // Timeout
    if (requestTimeout) {
        timer = setTimeout(function(){
            --server.__pending || server.close();
            delete req.timeout;
            assert.fail(msg + 'Request timed out after ' + requestTimeout + 'ms.');
        }, requestTimeout);
    }
    client.on('error', function(e) {
        console.log(e);
    });
    if (data) request.write(data);
    request.addListener('response', function(response){
        response.body = '';
        response.setEncoding('utf8');
        response.addListener('data', function(chunk){ response.body += chunk; });
        response.addListener('end', function(){
            --server.__pending || server.close();
            if (timer) clearTimeout(timer);

            // Assert response body
            if (res.body !== undefined) {
                var eql = res.body instanceof RegExp
                  ? res.body.test(response.body)
                  : res.body === response.body;
                assert.ok(
                    eql,
                    msg + 'Invalid response body.\n'
                        + ' Expected: ' + sys.inspect(res.body) + '\n'
                        + ' Got: ' + sys.inspect(response.body)
                );
            }

            // Assert response status
            if (typeof status === 'number') {
                assert.equal(
                    response.statusCode,
                    status,
                    msg + colorize('Invalid response status code.\n'
                        + ' Expected: [green]{' + status + '}\n'
                        + ' Got: [red]{' + response.statusCode + '}')
                );
            }

            // Assert response headers
            if (res.headers) {
                var keys = Object.keys(res.headers);
                for (var i = 0, len = keys.length; i < len; ++i) {
                    var name = keys[i],
                        actual = response.headers[name.toLowerCase()],
                        expected = res.headers[name],
                        eql = expected instanceof RegExp
                          ? expected.test(actual)
                          : expected == actual;
                    assert.ok(
                        eql,
                        msg + colorize('Invalid response header [bold]{' + name + '}.\n'
                            + ' Expected: [green]{' + expected + '}\n'
                            + ' Got: [red]{' + actual + '}')
                    );
                }
            }

            // Callback
            callback(response);
        });
    });
    request.end();
};


minitest.setupListeners();

minitest.context("server", function () {
    this.setup(function () {
        this.app = express.createServer();
    });

    this.assertion("create methods", function(test) {
        spore.createServer(this.app, __dirname +'/fixtures/test.json', {
            public_timeline: function(req, res) {
                res.send('Hello '+ req.params.format);
                res.end();
            },
            echo: function(req, res) {
                res.send('echo');
                res.end();
                test.finished();
            }
        });
        assertResponse(this.app,
                       {   method: 'GET',
                           headers: {},
                           url: '/statuses/public_timeline.json' },
                       { body: 'Hello json' });
        assertResponse(this.app,
                       {   method: 'POST',
                           headers: {},
                           url: '/echo' },
                       { body: 'echo' });
    });

    this.assertion("return 501 Not Implemented if the method is not provided", function(test) {
        spore.createServer(this.app, __dirname +'/fixtures/test.json', {
            public_timeline: function(req, res) {

            }
        });
        assertResponse(this.app,
                       {   method: 'POST',
                           headers: {},
                           url: '/echo' },
                       { status: 501 }, function() {
                           test.finished();
                       });
    });
});
