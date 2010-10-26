# Spore on NodeJs

node-spore is an implementation of [Spore](http://github.com/SPORE/specifications) in nodejs.

**Work in progress**: currently not working

## Client

`spore.createClient(spore_spec)`

You can contruct client with object:

        var spore = require('spore');
        spore.createClient({
                        "base_url" : "http://api.twitter.com/1",
                        "version" : "0.1",
                        "methods" : {
                        ....
        }});

With a json string:

        spore.createClient('{"base_url": ...}');

Or with a file:

        var client = spore.createClient(__dirname +'/twitter.json');

### Usage

`client.method_name(params, callback)`

* params: hash with key/value
* callback: function with 3 parameters, err, result and response

If a required parameter is not defined, callback is immediatly called with err !== null.

Method with payload:

`client.method_name(params, payload, callback)`

Example:

        client.method_name({id: 42}, 'payload', function(err, result) {
           ...
        });

Method without params:

        client.method_name(callback)
        client.method_name(payload, callback)

### Middlewares

Middleware in spore-node are inspired from [connect](http://github.com/senchalabs/connect) and [django](http://www.djangoproject.com/).

With middleware you can handle authentication, special body serialization or handle some special case. Because in real life, most API sucks.

Middleware is an object instance, all methods are optionnal.

        var middleware = {
            request : function(method, request) {
                if (method.authentication) {
                    request.headers['accept'] = 'text/html';
                }
                return null;
            },
            response : function(method, response) {}
        };

        spore.createClient(middleware, __dirname +'/twitter.json');

You can many middlewares:

        var auth = new HttpAuthMiddleware();
        var xmlserializer = new XmlSerializerMiddleware();
        spore.createClient(auth, xmlserializer __dirname +'/twitter.json');

#### Method object

Method represent current method in spore description file.

If api required authentication for all methods and a method specify ''authentication'' to false, method.authentication is false.

Same for formats and expected_status.

#### Request object

* port : server port (80, 443, ...)
* host : host (example.com)
* scheme : scheme or the url (http, https)
* method : http method (GET, POST, ...)
* path_info : request uri with placeholder
* headers : http request headers as keys/values
* params : request params as keys.values
* payload : payload

#### Modify request

Adding http headers:

            request : function(method, request) {
                return request.headers['Content-Length'] = 42;
            }

Modify params:

            request : function(method, request) {
                return request.params.id = 'myid';
            }

#### Modify response

TODO

## Server

Based on [connect](http://github.com/senchalabs/connect).

        var server = spore.createServer(__dirname +'/twitter.json');
        server.listen(9000);

Server with middleware:

        var server = spore.createServer(mymiddleware1, __dirname +'/twitter.json');
        server.listen(9000);

* [Backbone](http://github.com/documentcloud/backbone/) + Spore ?

## Tests

        $> git submodule update --init
        $> make test

## Examples

See examples/.

## Spore spec compatibility

### API

* base_url : OK
* formats  : NOK (via middleware)
* authentication : NOK (via middleware)
* expected_status : NOK (via middleware)

### Methods

* method : OK
* path : OK
* optional_params : OK
* required_params : OK
* expected_status : NOK (via middleware)
* authentication : NOK (via middleware)
* base_url : OK
* formats : NOK (via middleware)
* form-data: NOK
* required_payload: OK

### Middlewares

* request object: partial
* disable middleware at runtine: NOK
* return value: NOK

## Compatibility

Tested with node 0.2.3.

## TODO

* Finish client implementation
* Construct with url
* Write example with a twitter client (or statusnet :))
* Server implementation

## Links

* [Spore specification](http://github.com/SPORE/specifications)

## License

BSD
