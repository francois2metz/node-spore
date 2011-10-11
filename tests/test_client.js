"use strict";

// we test that
var spore = require('../lib/spore');

var minitest = require("./minitest")
,   assert   = require("assert")
,   httpmock = require("./mock_http_request")
,   http     = require("http")
,   fs       = require("fs")
;

minitest.setupListeners();

minitest.context("Create client with filename", function () {
    this.setup(function () {
        this.client = spore.createClient(__dirname +'/fixtures/test.json');
        this.mock   = httpmock.init();
        this.client.httpClient = this.mock;
    });

    this.assertion("should have a public_timeline method", function (test) {
        assert.ok(this.client.public_timeline,
                  "clientWithFile should have a public_timeline method");
        test.finished();
    });

    this.assertion("err if a required parameter is missing", function(test) {
        this.client.public_timeline({}, function(err, result) {
            assert.equal(result, null, 'result should be null');
            assert.equal(err, 'format param is required');
            test.finished();
        });
    });

    this.assertion("err if unknow param ", function(test) {
        this.client.public_timeline({format: 'json', unknowparam: 'foo'}, function(err, result) {
            assert.equal(result, null, 'result should be null');
            assert.equal(err, 'unattended param unknowparam');
            test.finished();
        });
    });

    this.assertion("no err if unattended params === true", function(test) {
        this.mock.add({
            port: 80,
            host: 'api2.twitter.com',
            method: 'GET',
            path: '/2/statuses/public_timeline.json?unknowparam=foo',
        });
        this.client.public_timeline2({format: 'json', unknowparam: 'foo'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("call remote server", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.json',
            response_data: '[{"place":null,"text": "node-spore is awesome"}, {}]'
        });
        this.client.public_timeline({format: 'json'}, function(err, result) {
            assert.equal(err, null, "err should be null");
            assert.equal(result.body, '[{"place":null,"text": "node-spore is awesome"}, {}]');
            test.finished();
        });
    });

    this.assertion("call with query string", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html?trim_user=1&include_entities=1',
        });
        this.client.public_timeline({format: 'html', 'trim_user': 1, 'include_entities': 1}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("call with 2 params in path", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/user/42.html',
        });
        this.client.big_method({format: 'html', id : "42"}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    }),

    this.assertion("path with query string", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/user.html?foo=bar',
        });
        this.client.with_query_string({format: 'html', param1 : "bar"}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method with specific base_url", function(test) {
        this.mock.add({
            port: 80,
            host: 'api2.twitter.com',
            method: 'GET',
            path: '/2/statuses/public_timeline.html',
        });
        this.client.public_timeline2({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method without params", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'HEAD',
            path: '/1/version',
        });
        this.client.version(function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method without params but with payload", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'POST',
            path: '/1/echo',
            payload: 'mypayload'
        });
        this.client.echo('mypayload', function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method with payload", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'POST',
            path: '/1/user/42',
            payload: 'plop \u00be',
            headers: {
                'host': 'api.twitter.com',
                'content-length': 7
            }
        });
        this.client.update_user({id: 42}, 'plop \u00be', function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion('method with buffer as payload', function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'POST',
            path: '/1/user/42',
            payload: 'plop \u00be',
            headers: {
                'host': 'api.twitter.com',
                'content-length': 7
            }
        });
        this.client.update_user({id: 42}, new Buffer('plop \u00be'), function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method with required payload", function(test) {
        this.client.update_user({id: 42}, function(err, result) {
            assert.equal(err, "payload is required");
            test.finished();
        });
    });

    this.assertion("method without payload", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'PUT',
            path: '/1/user/42',
            payload: '',
        });
        this.client.reinit_user({id: 42}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("method delete", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'DELETE',
            path: '/1/user',
            payload: '',
            headers: {
                "host":"api.twitter.com",
                'content-length': 0
            }
        });
        this.client.delete_method(function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("err if request error", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'HEAD',
            path: '/1/version',
            error: 'ECONNREFUSED'
        });
        this.client.version(function(err, result) {
            assert.equal(result, null, 'result should be null');
            assert.equal(err, 'ECONNREFUSED');
            test.finished();
        });
    });

    this.assertion("send headers without placeholder", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            headers: {
                "host"   :"api.twitter.com",
                "Accept" : "text/html"
            },
            path: '/1/user/'
        });
        this.client.with_headers(function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("send headers with placeholder", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            headers: {
                "host"   :"api.twitter.com",
                "Accept-language" : "en-us, fr-FR"
            },
            path: '/1/user/'
        });
        this.client.with_headers_placeholder({language1: 'en-us', language2: 'fr-FR'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });
});

minitest.context("Create client with json", function() {
    this.setup(function () {
        this.client = spore.createClient('{"base_url":"http://api.twitter.com/1","version":"0.1","methods":{"public_timeline":{"path":"/statuses/public_timeline.:format","method":"GET"}}}');
    });

    this.assertion("should have a public_timeline method", function (test) {
        assert.ok(this.client.public_timeline,
                  "clientWithFile should have a public_timeline method");
        test.finished();
    });
});

minitest.context("Create client with object", function() {
    this.setup(function() {
        this.client = spore.createClient({
            "base_url" : "http://api.twitter.com/1",
            "version" : "0.1",
            "methods" : {
                "public_timeline" : {
                    "optional_params" : [
                        "trim_user",
                        "include_entities"
                    ],
                    "required_params" : [
                        "format"
                    ],
                    "path" : "/statuses/public_timeline.:format",
                    "method" : "GET"
                }
            }
        });
    });

    this.assertion("should have a public_timeline method", function(test) {
        assert.ok(this.client.public_timeline,
                  "client should have a public_timeline method");
        test.finished();
    });
});

minitest.context("client with multiple spec", function() {
    this.setup(function() {
        this.client = spore.createClient(__dirname + '/fixtures/test1.json',
                                         __dirname + '/fixtures/test2.json',
                                         {base_url: 'http://example.com'});
    });

    this.assertion("should have public_timeline and create_user methods and overrided base_url", function(test) {
        assert.ok(this.client.create_user,
                  "should have a create_user method");
        assert.ok(this.client.public_timeline,
                  "should have a public_timeline method");
        assert.equal(this.client.spec.base_url,
                     "http://example.com");
        test.finished();
    });
});

minitest.context("client with request middleware", function() {
    this.setup(function() {
        this.mock = httpmock.init();
    });

    function createClient(middleware, mock) {
        var client = spore.createClient(middleware, __dirname +'/fixtures/test.json');
        client.httpClient = mock;
        return client;
    }

    this.assertion("should have a request param", function(test) {
        var called = 0;
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html',
        });
        var middleware = function(method, request, next) {
            called++;
            assert.ok(method.authentication);
            assert.deepEqual(request.headers, {host: 'api.twitter.com'});
            assert.deepEqual(request.params, {format: 'html'});
            assert.deepEqual(request.payload, null);
            assert.equal(request.scheme, 'http');
            assert.equal(request.port, 80);
            assert.equal(request.host, 'api.twitter.com');
            assert.equal(request.method, 'GET');
            assert.equal(request.path_info, '/1/statuses/public_timeline.:format');
            assert.equal(request.uri, '/1/statuses/public_timeline.html');
            next();
        };
        createClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(called, 1);
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("headers transform", function(test) {
        this.mock.add({
            port: 80,
            host: 'api2.twitter.com',
            headers: {'Accept': 'text/html,*/*;q=0.8', 'host': 'api2.twitter.com'},
            method: 'GET',
            path: '/2/statuses/public_timeline.html',
        });
        var middleware = function(method, request, next) {
            request.headers['Accept'] = 'text/html,*/*;q=0.8';
            next();
        };
        createClient(middleware, this.mock).public_timeline2({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("params and url transform", function(test) {
        this.mock.add({
            port: 80,
            host: 'api2.twitter.com',
            method: 'GET',
            path: '/3/statuses/public.json',
        });
        var middleware = function(method, request, next) {
            request.path_info = '/3/statuses/public.:format';
            request.params.format = 'json';
            next();
        };
        createClient(middleware, this.mock).public_timeline2({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("body transform", function(test) {
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'POST',
            path: '/1/user/42',
            payload: 'plop'
        });
        var middleware = function(method, request, next) {
            request.payload = 'plop';
            next();
        };
        createClient(middleware, this.mock).update_user({id: '42'}, 'plip', function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("can shortcut request by return a response object", function(test) {
        var middleware = function(method, request, next) {
            next({
                status: 400,
                headers: {'Server': 'apache'},
                body: 'plip'
            });
        };
        createClient(middleware, this.mock).update_user({id: '42'}, 'plip', function(err, result) {
            assert.equal(err, null);
            assert.deepEqual(result, {
                status: 400,
                headers: {'Server': 'apache'},
                body: 'plip'
            });
            test.finished();
        });
    });

    this.assertion("can throw exception", function(test) {
        var middleware = function(method, request, next) {
            throw new Error('big exception here');
        };
        createClient(middleware, this.mock).update_user({id: '42'}, 'plip', function(err, result) {
            assert.equal(err.message, 'big exception here');
            test.finished();
        });
    });

    this.assertion("can call next with error", function(test) {
        var middleware = function(method, request, next) {
            next(new Error('big exception here'));
        };
        createClient(middleware, this.mock).update_user({id: '42'}, 'plip', function(err, result) {
            assert.equal(err.message, 'big exception here');
            test.finished();
        });
    });
});

minitest.context("client with response middleware", function() {
    this.setup(function() {
        this.mock = httpmock.init();
    });

    function setupClient(middleware, mock) {
        var client = spore.createClient(middleware, __dirname +'/fixtures/test.json');
        client.httpClient = mock;
        mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html',
            statusCode: 200,
            response_headers: {'Content-Type': 'text/html',
                               'Server' : 'node'},
            response_data: 'plop'
        });
        return client;
    };

    this.assertion("should have a response param", function(test) {
        var called = 0;
        var middleware = function(method, request, next) {
            next(function(response, next) {
                called++;
                assert.equal(response.status, 200);
                assert.deepEqual(response.headers, {'Content-Type': 'text/html',
                                                    'Server' : 'node'});
                assert.equal(response.body, 'plop');
                next();
            });
        };
        setupClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called, 1);
            test.finished();
        });
    });

    this.assertion("response status and headers transform", function(test) {
        var middleware = function(method, request, next) {
            next(function(response, next) {
                response.headers.Server = 'nginx';
                response.status = 201;
                next();
            });
        };
        setupClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(result.headers.Server, 'nginx');
            assert.equal(result.status, 201);
            test.finished();
        });
    });

    this.assertion("response body transform", function(test) {
        var middleware = function(method, request, next) {
            next(function(response, next) {
                response.headers.Server = 'nginx';
                next();
            });
        };
        setupClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(result.headers.Server, 'nginx');
            test.finished();
        });
    });

    this.assertion("can shortcut response", function(test) {
        var mock_response = {status: 200, headers: {}, body: 'plop'};
        var called = 0;
        var middleware1 = function(method, request, next) {
            next(function(response, next) {
                next(mock_response);
            });
        };
        var middleware2 = function(method, request, next) {
            next(function(response) {
                called++;
            });
        };
        var client = setupClient(middleware2, this.mock);
        client.enable(middleware1);
        client.public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called, 0);
            assert.strictEqual(result, mock_response);
            test.finished();
        });
    });

    this.assertion("can throw exception", function(test) {
        var middleware = function(method, request, next) {
            next(function(response, next) {
                throw new Error('big exception here');
            });
        };
        setupClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err.message, 'big exception here');
            assert.notEqual(result, null);
            test.finished();
        });
    });

    this.assertion("can call next with error", function(test) {
        var middleware = function(method, request, next) {
            next(function(response, next) {
                next(new Error('big exception here'));
            });
        };
        setupClient(middleware, this.mock).public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err.message, 'big exception here');
            assert.notEqual(result, null);
            test.finished();
        });
    });
});

minitest.context("middlewares", function() {
    function addHttpRequest (mock) {
        mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html',
            statusCode: 200,
            response_headers: {'Content-Type': 'text/html',
                               'Server' : 'node'},
            response_data: 'plop'
        });
    }

    this.assertion("cannot modify method object", function(test) {
        var mock = httpmock.init();
        addHttpRequest(mock);
        var middleware = function(method, request, next) {
            assert.ok(Object.isFrozen(method));
            next();
        };
        var client = spore.createClient(middleware, __dirname +'/fixtures/test.json');
        client.httpClient = mock;
        client.public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            test.finished();
        });
    });

    this.assertion("can be enabled after init", function(test) {
        var mock = httpmock.init();
        addHttpRequest(mock);
        var called = 0;
        var middleware = function(method, request, next) {
            called++;
            next();
        };
        var client = spore.createClient(__dirname +'/fixtures/test.json');
        client.enable(middleware);
        client.httpClient = mock;
        client.public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called, 1);
            test.finished();
        });
    });

    this.assertion("can be disabled after init", function(test) {
        var mock = httpmock.init();
        addHttpRequest(mock);
        var called_1 = 0;
        var called_2 = 0;
        var middleware1 = function(method, request, next) {
            called_1++;
            next();
        };
        var middleware2 = function(method, request, next) {
            called_2++;
            next();
        };
        var client = spore.createClient(__dirname +'/fixtures/test.json');
        client.enable(middleware1);
        client.enable(middleware2);
        client.disable(middleware1);
        client.httpClient = mock;
        client.public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called_1, 0);
            assert.equal(called_2, 1);
            test.finished();
        });
    });

    this.assertion("can be enabled if", function(test) {
        var mock = httpmock.init();
        addHttpRequest(mock);
        var called = 0;
        var middleware = function(method, request, next) {
            called++;
            next();
        };
        var client = spore.createClient(__dirname +'/fixtures/test.json');
        client.enable_if(function(method, request) {
            called++;
            return true;
        }, middleware);
        client.httpClient = mock;
        client.public_timeline({format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called, 2);
            test.finished();
        });
    });

    this.assertion("can have middleware per method", function(test) {
        var mock = httpmock.init();
        addHttpRequest(mock);
        var called = 0;
        var middleware = function(method, request, next) {
            called++;
            next();
        };
        var client = spore.createClient(__dirname +'/fixtures/test.json');
        client.httpClient = mock;
        client.public_timeline(middleware, {format: 'html'}, function(err, result) {
            assert.equal(err, null);
            assert.equal(called, 1);
            test.finished();
        });
    });

    this.assertion("are called in order for request and in reverse order for response", function(test) {
        var mock = httpmock.init();
        var request  = [];
        var response = [];
        var middleware1  = function(method, r, next) {
            request.push(1);
            next(function(r, next) {
                response.push(1);
                next();
            });
        };
        var middleware2 = function(method, r, next) {
            request.push(2);
            next(function(r, next) {
                response.push(2);
                next();
            });
        };
        var client = spore.createClient(middleware1, middleware2, __dirname +'/fixtures/test.json');
        client.httpClient = mock;

        addHttpRequest(mock);
        mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.json',
            statusCode: 200,
            response_headers: {'Content-Type': 'text/html',
                               'Server' : 'node'},
            response_data: 'plop'
        });

        client.public_timeline({format: 'html'}, function(err, result) {
            assert.deepEqual(request, [1, 2]);
            assert.deepEqual(response, [2, 1]);
            client.public_timeline({format: 'json'}, function(err, result) {
                assert.deepEqual(request, [1, 2, 1, 2]);
                assert.deepEqual(response, [2, 1, 2, 1]);
                test.finished();
            });
        });
    });
});

minitest.context("Client with spore shortcut", function() {
    this.setup(function() {
        this.client = spore.createClient(__dirname +'/fixtures/authentication.json');
    });

    this.assertion("method inherits: authentication, formats, expected_status, unattended_params", function(test) {
        var method = this.client.spec.methods.update_user;
        assert.ok(method.authentication);
        assert.ok(method.unattended_params);
        assert.deepEqual(method.formats, ["json", "html"]);
        assert.deepEqual(method.expected_status, [200, 500]);
        test.finished();
    });

    this.assertion("method override: authentication, formats, expected_status, unattended_params", function(test) {
        var method = this.client.spec.methods.public_timeline;
        assert.strictEqual(method.authentication, false);
        assert.strictEqual(method.unattended_params, false);
        assert.deepEqual(method.formats, ["xml"]);
        assert.deepEqual(method.expected_status, [200, 204, 503]);
        test.finished();
    });
});

minitest.context("Client with https", function () {
    this.setup(function () {
        this.client = spore.createClient(__dirname +'/fixtures/ssl.json');
        this.mock = httpmock.init();
        this.client.httpClient = this.mock;
    });

    this.assertion("port 443, scheme https, secure = true", function(test) {
        this.mock.adds({
            port: 443,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html'
        });
        this.client.enable(function(method, request, next) {
            assert.equal(request.port, 443);
            assert.equal(request.scheme, 'https');
            next();
        });
        this.client.public_timeline(function(err, response) {
            assert.equal(err, null);
            test.finished();
        });
    })
});


minitest.context("Create client from url", function () {
    this.assertion("should have a public timeline method", function (test) {
        fs.readFile(__dirname +'/fixtures/test.json', function(err, data) {
            assert.equal(err, null);
            var server = http.createServer(function(req, res) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(data);
            });
            server.listen(5678, function() {
                spore.createClientWithUrl('http://localhost:5678/test.json',
                                          function(err, client) {
                                              server.close();
                                              assert.equal(err, null);
                                              assert.ok(client.public_timeline),
                                              test.finished();
                                          });
            });
        });
    });

});

minitest.context("client with utility methods", function ()  {
    this.setup(function() {
        this.mock = httpmock.init();
    });

    function createClient(middleware, mock) {
        var client = spore.createClient(middleware, __dirname +'/fixtures/authentication.json');
        client.httpClient = mock;
        return client;
    }

    this.assertion("should have a get method", function (test) {
        var called = 0;
        this.mock.add({
            port: 80,
            host: 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html?test=p',
        });
        var middleware = function(method, request, next) {
            called++;
            assert.ok(method.authentication);
            assert.ok(method.unattended_params);
            assert.deepEqual(method.formats, ["json", "html"]);
            assert.deepEqual(method.expected_status, [200, 500]);
            next();
        };
        var client = createClient(middleware, this.mock);
        client.get('http://api.twitter.com/1/statuses/public_timeline.html?test=p', function(err, result) {
            assert.equal(err, null);
            assert.equal(1, called);
            test.finished();
        });
    });
});
