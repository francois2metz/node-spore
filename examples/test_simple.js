require.paths.unshift(__dirname +"/../lib");
var spore = require('spore'),
    sys   = require('sys');

var twitterClient = spore.createClient({
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
    var r = JSON.parse(result);
    for (var e in r)
    {
        sys.log(r[e].user.screen_name +' - '+ r[e].text);
    }
});
