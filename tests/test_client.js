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
// required param missing
var called = 0;
twitterClient.public_timeline({}, function(err, result) {
    called++;
    assert.equal(null, result);
    assert.equal(err, 'format param is required');
});
assert.equal(called, 1, "callback should be called");
// unknow params
called = 0;
twitterClient.public_timeline({format: 'json',
                               unknowparam: 'foo'}, function(err, result) {
    called++;
    assert.equal(null, result);
    assert.equal(err, 'unknowparam param is unknow'); // very funny
});
assert.equal(called, 1, "callback should be called");
