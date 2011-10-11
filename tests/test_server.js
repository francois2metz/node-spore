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
function assertResponse(server, req, res, msg) {
    // Callback as third or fourth arg
    var callback = typeof res === 'function'
        ? res
        : typeof msg === 'function'
            ? msg
            : function() {};

    // Default messate to test title
    if (typeof msg === 'function') msg = null;
    msg = msg || "";

    // Add a unique token for this call to assert.response(). We'll move it to
    // succeeded/failed when done
    var token = new Error('Response not completed: ' + msg);
    //test._pending.push(token);

    function check() {
        try {
            server.__port = server.address().port;
            server.__listening = true;
        } catch (err) {
            process.nextTick(check);
            return;
        }
        if (server.__deferred) {
            server.__deferred.forEach(function(fn) { fn(); });
            server.__deferred = null;
        }
    }

    // Pending responses
    server.__pending = server.__pending || 0;
    server.__pending++;

    // Check that the server is ready or defer
    if (!server.fd) {
        server.__deferred = server.__deferred || [];
        server.listen(server.__port = port++, '127.0.0.1', check);
    } else if (!server.__port) {
        server.__deferred = server.__deferred || [];
        process.nextTick(check);
    }

    // The socket was created but is not yet listening, so keep deferring
    if (!server.__listening) {
        server.__deferred.push(issue);
        return;
    } else {
        issue();
    }

    function issue() {
        // Issue request
        var timer,
            method = req.method || 'GET',
            status = res.status || res.statusCode,
            data = req.data || req.body,
            requestTimeout = req.timeout || 0,
            encoding = req.encoding || 'utf8';

        var request = http.request({
            host: '127.0.0.1',
            port: server.__port,
            path: req.url,
            method: method,
            headers: req.headers
        });

        var check = function() {
            if (--server.__pending === 0) {
                server.close();
                server.__listening = false;
            }
        };

        // Timeout
        if (requestTimeout) {
            timer = setTimeout(function() {
                check();
                delete req.timeout;
                assert.fail(msg + 'Request timed out after ' + requestTimeout + 'ms.');
            }, requestTimeout);
        }

        if (data) request.write(data);

        request.on('response', function(response) {
            response.body = '';
            response.setEncoding(encoding);
            response.on('data', function(chunk) { response.body += chunk; });
            response.on('end', function() {
                if (timer) clearTimeout(timer);
                try {
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

                    // Add this to the succeeded bin.
                    assert.ok(true, msg);
                } catch (err) {
                    assert.ok(false, err);
                } finally {
                    // Potentially shut down the server.
                    check();
                }
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
