# Spore on NodeJs #

node-spore is an implementation of spore in nodejs.

**Work in progress**: currently not working

## Client ##

You can contruct client with json:

        var Client = require('spore').Client;
        new Client({
                        "api_base_url" : "http://api.twitter.com/1",
                        "version" : "0.1",
                        "methods" : {
                        ....
        }});

Or with a file:

        var Client = require('spore').Client;
        new Client(__dirname +'/twitter.json');

### Usage ###

`client.method_name(params, callback)`

* params: hash with key/value
* callback: function with 2 arguments, err and result

If a required parameter is not defined, callback is immediatly called with err !== null.

## Server ##

TODO

* [Backbone](http://github.com/documentcloud/backbone/) + Spore ?

## Tests ##

        $> git submodule update --init
        $> make test

## Examples ##

NONE

## TODO ##

* test, test, test
* Code, code, code
* Finish Client implementation
* Write example with a twitter client (or statusnet :))
* API implementation

## Links ##

* [Spore specification](http://github.com/SPORE/specifications)

## License ##

BSD
