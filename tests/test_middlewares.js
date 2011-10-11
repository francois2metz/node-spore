"use strict";

var middlewares = require('../lib/middlewares');

var JsonMiddleware    = middlewares.json;
var StatusMiddleware  = middlewares.status;
var RuntimeMiddleware = middlewares.runtime;
var BasicMiddleware   = middlewares.basic;
var OAuth1Middleware  = middlewares.oauth1;
var OAuth2Middleware  = middlewares.oauth2;

var minitest = require("./minitest")
,   assert   = require("assert")
;

minitest.setupListeners();

minitest.context("json middleware", function () {
    this.setup(function () {
        this.middleware = JsonMiddleware;
        this.response = {
            headers: {},
            body: '[{"place":null,"text": "node-spore is awesome"}]'
        };
    });

    this.assertion("parse json if content type is application/json", function (test) {
        var response = this.response;
        response.headers['content-type'] = 'application/json; charset=utf-8';
        this.middleware()({}, {}, function(callback) {
            callback(response, function() {
                assert.equal(response.body.length, 1);
                assert.equal(response.body[0].text, 'node-spore is awesome');
                test.finished();
            });
        });
    });

    this.assertion("do nothing with other content type", function (test) {
        var response = this.response;
        this.middleware()({}, {}, function(callback) {
            callback(response, function() {
                assert.equal(response.body.length, 48);
                test.finished();
            });
        });
    });
});

minitest.context("status middleware", function () {
    this.setup(function () {
        this.middleware = StatusMiddleware;
        this.response = {
            headers: {},
            body: '[{"place":null,"text": "node-spore is awesome"}]'
        };
    });

    this.assertion("throw exception if status is not in expected_status array", function (test) {
        var that = this;
        this.response.status = 201;
        assert.throws(function () {
            test.finished();
            that.middleware()({
                expected_status: [200, 500]
            }, {}, function(c) {c(that.response);});
        }, Error);
    });

    this.assertion("or not", function(test) {
        var that = this;
        this.response.status = 200;
        assert.doesNotThrow(function () {
            that.middleware()({
                expected_status: [200, 500]
            }, {}, function(callback) {
                callback(that.response, function() {
                    test.finished();
                });
            });
        }, Error);
    })
});

minitest.context("runtime middleware", function () {
    this.assertion("add X-Spore-Runtime", function(test) {
        var response = {
            headers: {},
            body: ''
        };
        RuntimeMiddleware()({}, {}, function(callback) {
            callback(response, function() {
                assert.equal(response.headers['X-Spore-Runtime'], 0);
                test.finished();
            });
        });
    })
});

minitest.context("basic middleware", function() {
    this.assertion("add authorization header", function(test) {
        var request = {
            headers: {}
        };
        BasicMiddleware("user", "pwd")({}, request, function() {
            assert.ok(request.headers['Authorization'] !== undefined);
            test.finished();
        });
    });
});

minitest.context("oauth1 middleware", function () {
    this.setup(function() {
        this.request = {
            headers: {},
            scheme: 'https',
            host: 'example.net',
            uri: '/plop'
        };
    });

    this.assertion("add Authorization header", function(test) {
        var oauth = {
            authHeader: function(url, token, token_secret, method) {
                assert.equal(url, 'https://example.net/plop');
                assert.equal(token, "token");
                assert.equal(token_secret, "secret");
                return 'plop';
            }
        };
        OAuth1Middleware(oauth, "token", "secret")({authentication: true}, this.request, function() {});
        assert.equal(this.request.headers['Authorization'], 'plop');
        test.finished();
    })

    this.assertion("don't add Authorization header", function(test) {
        var oauth = {};
        OAuth1Middleware(oauth, "token", "secret")({authentication: false}, this.request, function() {});
        assert.equal(this.request.headers['Authorization'], undefined);
        test.finished();
    })
});

minitest.context("oauth2 middleware", function () {
    this.setup(function() {
        this.request = {
            headers: {},
            scheme: 'https',
            host: 'example.net',
            uri: '/plop'
        };
    });

    this.assertion("add Authorization header", function(test) {
        OAuth2Middleware("token")({authentication: true}, this.request, function() {});
        assert.equal(this.request.headers['Authorization'], 'OAuth token');
        test.finished();
    })

    this.assertion("don't add Authorization header", function(test) {
        OAuth2Middleware("token")({authentication: false}, this.request, function() {});
        assert.equal(this.request.headers['Authorization'], undefined);
        test.finished();
    })
});
