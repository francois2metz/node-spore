"use strict";

var spore = require('../lib/spore');

var minitest = require("./minitest")
,   assert   = require("assert")
,   connect  = require("connect")
,   http     = require("http")
,   util     = require("util")
;

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

/**
 * assert.response from expresso (http://github.com/visionmedia/expresso/blob/master/bin/expresso)
 * Assert response from `server` with
 * the given `req` object and `res` assertions object.
 *
 * @param {Server} server
 * @param {Object} req
 * @param {Object|Function} res
 * @param {String} msg
 */
function assertResponse (server, req, res, msg){
    // Check that the server is ready or defer
    if (!server.fd) {
        if (!('__deferred' in server)) {
            server.__deferred = [];
        }
        server.__deferred.push(arguments);
        if (!server.__started) {
            server.listen(server.__port = port++, '127.0.0.1', function(){
                if (server.__deferred) {
                    process.nextTick(function(){
                        server.__deferred.forEach(function(args){
                          assertResponse.apply(assert, args);
                        });
                    });
                }
            });
            server.__started = true;
        }
        return;
    }

    // Callback as third or fourth arg
    var callback = typeof res === 'function'
        ? res
        : typeof msg === 'function'
            ? msg
            : function(){};

    // Default message to test title
    if (typeof msg === 'function') msg = null;
    msg = msg || assert.testTitle;
    msg += '. ';

    // Pending responses
    server.__pending = server.__pending || 0;
    server.__pending++;

    // Create client
    if (!server.fd) {
        server.listen(server.__port = port++, '127.0.0.1', issue);
    } else {
        issue();
    }

    function issue(){
        if (!server.client)
            server.client = http.createClient(server.__port);

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

        if (data) request.write(data);
        request.on('response', function(response){
            response.body = '';
            response.setEncoding('utf8');
            response.on('data', function(chunk){ response.body += chunk; });
            response.on('end', function(){
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
                            + ' Expected: ' + util.inspect(res.body) + '\n'
                            + ' Got: ' + util.inspect(response.body)
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
      }
};

minitest.setupListeners();

minitest.context("connect middleware", function () {
    this.setup(function () {
        this.app = connect.createServer();
    });

    this.assertion("create get method", function(test) {
        this.app.use(spore.middleware(__dirname +'/fixtures/test.json', {
            public_timeline: function(req, res) {
                res.writeHead(200);
                res.end('Hello '+ req.params.format, 'utf-8');
            }
        }));
        assertResponse(this.app,
                       {   method: 'GET',
                           headers: {},
                           url: '/statuses/public_timeline.json' },
                       { body: 'Hello json' }, function() {
                           test.finished();
                       });
    });

    this.assertion("create post method", function(test)  {
        this.app.use(spore.middleware(__dirname +'/fixtures/test.json', {
            echo: function(req, res) {
                res.writeHead(200);
                res.end('echo');
            }
        }));
        assertResponse(this.app,
                       {   method: 'POST',
                           headers: {},
                           url: '/echo' },
                       { body: 'echo' }, function() {
                           test.finished();
                       });
    });

    this.assertion("return 501 Not Implemented if the method is not provided", function(test) {
        this.app.use(spore.middleware(__dirname +'/fixtures/test.json', {}));
        assertResponse(this.app,
                       {   method: 'POST',
                           headers: {},
                           url: '/echo' },
                       { status: 501 }, function() {
                           test.finished();
                       });
    });
});
