// :(
require.paths.unshift(__dirname +"/minitest");
require.paths.unshift(__dirname +"/../lib");

var JsonMiddleware = require('middlewares').json;

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
        this.response.headers['content-type'] = 'application/json; charset=utf-8';
        this.middleware.response({}, this.response);
        assert.equal(this.response.body.length, 1);
        assert.equal(this.response.body[0].text, 'node-spore is awesome');
        test.finished();
    });

    this.assertion("do nothing with other content type", function (test) {
        this.middleware.response({}, this.response);
        assert.equal(this.response.body.length, 48);
        test.finished();
    });
});
