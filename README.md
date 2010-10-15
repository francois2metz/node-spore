# Spore on NodeJs #

node-spore is an implementation of spore in nodejs.

**Work in progress**: not working

## Client ##

var Client = require('spore').Client;

You can contruct client with json:

new Client({
        "api_base_url" : "http://api.twitter.com/1",
        "version" : "0.1",
        "methods" : {
        ....
        }});

Or with a file:
new Client('twitter.json');

### Usage ###

client.method_name(params, callback)

* params: hash with key/value
* callback: function with 2 arguments, err and result

If a required parameter is not defined, callback is immediatly called with err !== null.

## API ##

TODO

## Tests ##

$> git submodule update --init
$> make test

## Examples ##

NONE

## TODO ##

* Code, code, code
* test, test, test
* Finish Client implementation
* Write example with a twitter client (or statusnet :))
* API implementation

## Links ##

* [Spore specification](http://github.com/SPORE/specifications.git)

## License ##

BSD
