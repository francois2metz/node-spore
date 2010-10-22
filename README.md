# Spore on NodeJs

node-spore is an implementation of spore in nodejs.

**Work in progress**: currently not working

## Client

`spore.createClient(spore_spec)`

You can contruct client with json:

        var spore = require('spore');
        spore.createClient({
                        "api_base_url" : "http://api.twitter.com/1",
                        "version" : "0.1",
                        "methods" : {
                        ....
        }});

Or with a file:

        var spore = require('spore');
        var client = spore.createClient(__dirname +'/twitter.json');

### Usage

`client.method_name(params, callback)`

* params: hash with key/value
* callback: function with 3 parameters, err, result and response

If a required parameter is not defined, callback is immediatly called with err !== null.

### Middlewares

Middleware in spore-node are inspired from [connect](http://github.com/senchalabs/connect) and [django](http://www.djangoproject.com/).

With middleware you can handle authentification, special body serialization or handle some special case. Because in real life, most API sucks.

Middleware is an object instance, all methods are optionnal.

        function HttpAuthMiddleware() {
        }
        HttpAuthMiddleware.prototype = {
                process_headers: function(method, params) {
                },
                process_body: function(method, data) {
                },
                process_response: function(response) {
                }
        };

        var auth = new HttpAuthMiddleware();
        spore.createClient(auth, __dirname +'/twitter.json');

You can many middlewares:

        var auth = new HttpAuthMiddleware();
        var xmlserializer = new XmlSerializerMiddleware();
        spore.createClient(auth, xmlserializer __dirname +'/twitter.json');

## Server

TODO

* [connect](http://github.com/senchalabs/connect)
* [Backbone](http://github.com/documentcloud/backbone/) + Spore ?

## Tests

        $> git submodule update --init
        $> make test

## Examples

See examples/.

## Spore spec compatibility

### API

* base_url : OK
* formats  : NOK
* api_authentication : NOK

### Methods

* method : partialy
* path : OK
* optional_params : OK
* required_params : OK
* expected_status : NOK
* authentication : NOK
* base_url : OK
* formats : NOK

## Compatibility

Tested with node 0.2.3.

## TODO

* test, test, test
* Code, code, code
* Finish Client implementation
* Write example with a twitter client (or statusnet :))
* API implementation

## Links

* [Spore specification](http://github.com/SPORE/specifications)

## License

BSD
