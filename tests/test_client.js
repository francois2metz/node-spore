// :(
require.paths.unshift(__dirname +"/minitest");
require.paths.unshift(__dirname +"/../lib");

// we test that
var spore = require('spore');

var minitest = require("minitest");
var assert   = require("assert");
var httpmock = require("./mock_http_request");

minitest.setupListeners();

minitest.context("Create client with filename", function () {
    this.setup(function () {
        this.client = spore.createClient(__dirname +'/fixtures/test.json');
    });

    this.assertion("client should have a public_timeline method", function (test) {
        assert.ok(this.client.public_timeline,
                  "clientWithFile should have a public_timeline method");
        test.finished();
  });
});

minitest.context('Create client with json object', function() {
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
                },
                "public_timeline2" : {
                    "optional_params" : [
                        "trim_user",
                        "include_entities"
                    ],
                    "required_params" : [
                        "format"
                    ],
                    "base_url" : "http://api2.twitter.com/2",
                    "path" : "/statuses/public_timeline.:format",
                    "method" : "GET"
                },
            }
        });
    });

    this.assertion("client should have a public_timeline method", function(test) {

        assert.ok(this.client.public_timeline,
                  "client should have a public_timeline method");
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
            assert.equal(err, 'unknowparam param is unknow'); // very funny
            test.finished();
        });
    });

    this.assertion("call remote server", function(test) {
        httpmock.http.addMock({
            port: 80,
            host : 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.json',
            data: '[{"place":null,"text": "node-spore is awesome"}, {}]'
        });
        this.client.httpClient = httpmock.http;
        this.client.public_timeline({format: 'json'}, function(err, result) {
            assert.equal(err, null, "err should be null");
            assert.equal('[{"place":null,"text": "node-spore is awesome"}, {}]' , result);
            test.finished();
        });
    });

    this.assertion("call with other parameter ", function(test) {
        httpmock.http.addMock({
            port: 80,
            host : 'api.twitter.com',
            method: 'GET',
            path: '/1/statuses/public_timeline.html?trim_user=1&include_entities=1',
            data: '[{"place":null,"text": "node-spore is awesome"}, {}]'
        });
        this.client.httpClient = httpmock.http;
        this.client.public_timeline({format: 'html', 'trim_user': 1, 'include_entities': 1}, function(err, result) {
            test.finished();
        });
    });

    this.assertion("method with specific base_url", function(test) {
        httpmock.http.addMock({
            port: 80,
            host : 'api2.twitter.com',
            method: 'GET',
            path: '/2/statuses/public_timeline.html',
            data: '[{"place":null,"text": "node-spore is awesome"}, {}]'
        });
        this.client.httpClient = httpmock.http;
        this.client.public_timeline2({format: 'html'}, function(err, result) {
            test.finished();
        });
    });
});
