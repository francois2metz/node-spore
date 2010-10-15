// :(
require.paths.unshift(__dirname +"/minitest");
require.paths.unshift(__dirname +"/../lib");

// we test that
var Client = require('spore').Client;

var minitest = require("minitest");
var assert   = require("assert");

minitest.setupListeners();

minitest.context("Create client with filename", function () {
    this.setup(function () {
        this.client = new Client(__dirname +'/fixtures/test.json');
    });

    this.assertion("client should have a public_timeline method", function (test) {
        assert.ok(this.client.public_timeline,
                  "clientWithFile should have a public_timeline method");
        test.finished();
  });
});

minitest.context('Create client with json object', function() {
    this.setup(function() {
        this.client = new Client({
            "api_base_url" : "http://api.twitter.com/1",
            "version" : "0.1",
            "methods" : {
                "public_timeline" : {
                    "params" : [
                        "trim_user",
                        "include_entities"
                    ],
                    "required" : [
                        "format"
                    ],
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
            assert.equal(null, result, 'result should be null');
            assert.equal(err, 'format param is required');
            test.finished();
        });
    });

    this.assertion("err if unknow param ", function(test) {
        this.client.public_timeline({format: 'json',
                                     unknowparam: 'foo'}, function(err, result) {
                                           assert.equal(result, result, 'result should be null');
                                           assert.equal(err, 'unknowparam param is unknow'); // very funny
                                         test.finished();
                                       });
    });
});
