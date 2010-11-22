require.paths.unshift(__dirname +"/../lib");
var spore = require('spore'),
    json  = require('middlewares').json();

var twitterClient = spore.createClient(json, {
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
            }
        });

twitterClient.public_timeline({
    format      : 'json',
}, function(err, result) {
    if (err) {
        console.error(err);
        return;
    }
    var r = result.body;
    for (var e in r)
    {
        console.log(r[e].user.screen_name +' - '+ r[e].text);
    }
});
