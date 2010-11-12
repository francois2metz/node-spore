# Spore on Node

node-spore is an implementation of [Spore](https://github.com/SPORE/specifications) in [Node](http://nodejs.org/).

## Install

`npm install spore`

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

You can create client with multiple spec:

        var client = spore.createClient(__dirname +'/twitter1.json',
                                        __dirname +'/twitter2.json');

### Usage

`client.method_name(params, callback)`

* params: hash with key/value
* callback: function with 2 parameters, err (a string) and result (see *Response object*)

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

Middleware in spore-node are inspired from [connect](http://github.com/senchalabs/connect).

With middleware you can handle authentication, special body serialization or some special case. Because in real life, most API sucks.

Middleware is a function. Middleware should call *next*, with null (and next middleware will be called), a response (no more middleware will be called and request is abort) or a callback (will be called after response received).

        var middleware = function(method, request, next) {
            if (method.authentication) {
                request.headers['accept'] = 'text/html';
            }
            next(function(response, next) {
                response.status = 500;
                next();
            });
        };
        spore.createClient(middleware, __dirname +'/twitter.json');

You can many middlewares:

        spore.createClient(middleware1, middleware2, __dirname +'/twitter.json');

If a middleware throw exception, then the callback is immediatly called, and err param contain exception.

You can also enable middleware with client::enable

        var client = spore.createClient(__dirname +'/twitter.json');
        client.enable(middleware);

Or enable enable middleware only if:

        var client = spore.createClient(__dirname +'/twitter.json');
        client.enable_if(function(method, request) {
            if (!method.authentication) {
                return false;
            }
            return true;
        }, middleware);

Or disable a middleware:

        client.disable(middleware);

#### Method object

Method represent current method in spore description file.

If api required authentication for all methods and a method specify ''authentication'' to false, method.authentication is false.

Same for formats and expected_status.

#### Request object

* port : server port (80, 443, ...)
* host : host (example.com)
* scheme : scheme or the url (http, https)
* method : http method (GET, POST, ...)
* path_info : request uri with placeholder (/1/example/:id)
* uri :  *readonly* request uri without placehoder (/1/example/42)
* headers : http request headers as keys/values({'User-Agent': 'node-spore', 'Cookie': '...'})
* params : request params as keys/values ({id: 42})
* payload : payload

#### Response object

* status: status code (200, ...)
* headers: response headers as keys/values
* body

#### Modify request

Adding http headers:

            function(method, request, next) {
                request.headers['Content-Length'] = 42;
                next();
            }

Modify params:

            function(method, request, next) {
                request.params.id = 'myid';
                next();
            }

Return response:

            function(method, request, next) {
                next({
                    status   : 200,
                    headers : {},
                    body    : ''
                });
            }

#### Modify response

Adding http headers:

            function(method, request, next) {
                next(function(response, next) {
                    response.headers['Content-type'] = 'text/html';
                    next();
                });
            }

Transform body:

            function(method, request, next {
                next(function(response, next) {
                    response.data = JSON.parse(response.data);
                    next();
                });
            }

Interrupt response middlewares by return response:

            function(method, request, callback) {
                next(function(response, next) {
                    response.headers['Content-type'] = 'text/html';
                    next(response);
                });
            }

#### OAuth1 Middleware

Add oauth headers for each requests with authentication == true. Need [node-oauth](https://github.com/ciaranj/node-oauth/) with [patches](https://github.com/francois2metz/node-oauth).

                var OAuth = require('oauth');
                var oauth = new OAuth(requestUrl, accessUrl, consumerKey, consumerSecret, version, null, "HMAC-SHA1");
                var OAuthMiddleware = require('spore/middlewares').oauth1(oauth, access_token, access_token_secret);

#### Status Middleware

Check if response code match expected_status in spec. Throw exception if status is not expected.

                var StatusMiddleware = require('spore/middlewares').status`

#### FormatJson Middleware

Parse JSON response if content-type is application/json.

                var JsonMiddleware = require('spore/middlewares').json`

#### Runtime middleware

Add X-Spore-Runtime to the response headers. The value of the header is the time the request took to be executed.

                var RuntimeMiddleware = require('spore/middlewares').runtime`

## Server

Based on [connect](http://github.com/senchalabs/connect).

        var server = spore.createServer(__dirname +'/twitter.json');
        server.listen(9000);

Server with middleware:

        var server = spore.createServer(mymiddleware1, __dirname +'/twitter.json');
        server.listen(9000);

## Tests

        $> git submodule update --init
        $> make test

## Examples

See examples/.

## Spore spec compatibility

### API

* base_url : OK
* authentication : OK (via middleware)
* expected_status : OK (via middleware)

### Methods

* method : OK
* path : OK
* optional_params : OK
* required_params : OK
* expected_status : OK (via middleware)
* authentication : OK (via middleware)
* base_url : OK
* required_payload: OK
* deprecated : OK
* form-data: NOK
* headers : OK

## Compatibility

Tested with node 0.2.3, 0.2.4 and 0.3.0.

## TODO

* Construct with url
* Write example with a twitter client (or statusnet :))
* Server implementation

## Links

* [Spore specification](https://github.com/SPORE/specifications)

## License

BSD

## Changelog

* **0.0.3pre**

  Normalize HTTP verb to upper case.

  Handle headers with placeholder.

  Warning when you are using a deprecated method.

* **0.0.2**

  Middlewares are no more object but a function.

  Middlewares are also async. The third or second argument is a callback *next*.

  Response middlewares can return a response object and break the chain.

  Added some middlewares (json, status, runtime and oauth1).

  Added *enable*, *enable_if* and *disable* methods.

  Create client with multiple spec file.

  Added uri to request object.

  Handle http error.

* **0.0.1**

  Initial version.
