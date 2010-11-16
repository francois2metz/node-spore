require.paths.unshift(__dirname +"/../lib");
var spore = require('spore');
var express  = require("express");

var app = express.createServer();

spore.createServer(app, __dirname +'/../tests/fixtures/test.json', {
            public_timeline: function(req, res) {
                console.dir(req);
                res.send('Hello '+ req.params.format);
                res.end();
                test.finished();
            }
        });

app.listen(3000);
