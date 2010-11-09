"use strict";
// :(
require.paths.unshift(__dirname +"/minitest");
require.paths.unshift(__dirname +"/../lib");

var middlewares = require('middlewares');

var JsonMiddleware    = middlewares.json;
var StatusMiddleware  = middlewares.status;
var RuntimeMiddleware = middlewares.runtime;

var minitest = require("minitest");
var assert   = require("assert");

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
        this.middleware({}, {}, function(c) {c(response);});
        assert.equal(this.response.body.length, 1);
        assert.equal(this.response.body[0].text, 'node-spore is awesome');
        test.finished();
    });

    this.assertion("do nothing with other content type", function (test) {
        var response = this.response;
        this.middleware({}, {}, function(c) {c(response);});
        assert.equal(this.response.body.length, 48);
        test.finished();
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
            that.middleware({
                expected_status: [200, 500]
            }, {}, function(c) {c(that.response)});
        }, Error);
    });

    this.assertion("or not", function(test) {
        var that = this;
        this.response.status = 200;
        assert.doesNotThrow(function () {
            test.finished();
            that.middleware({
                expected_status: [200, 500]
            }, {}, function(c) {c(that.response); });
        }, Error);
    })
});

minitest.context("runtime middleware", function () {
    this.assertion("add X-Spore-Runtime", function(test) {
        var response = {
            headers: {},
            body: ''
        };
        RuntimeMiddleware({}, {}, function(c) {c(response) });
        assert.equal(response.headers['X-Spore-Runtime'], 0);
        test.finished();
    })
});
