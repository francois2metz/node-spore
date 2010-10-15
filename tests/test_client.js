// :(
require.paths.unshift(__dirname +"/../lib");

var assert = require('assert');

// we test that
var Client = require('spore').Client;

var twitterClient = new Client({
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

assert.ok(twitterClient.public_timeline, "twitterClient have a public_timeline method");

twitterClient.public_timeline('', function(err, result) {
    
});



