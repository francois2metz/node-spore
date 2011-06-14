# Spore on Node

node-spore is an implementation of [Spore](https://github.com/SPORE/specifications) in [Node](http://nodejs.org/).

It provide a generic ReST client and server.

## Install

`npm install spore`

## Client

`spore.createClient(spore_spec)`

You can contruct a client with object:

    var spore = require('spore');
    spore.createClient({
                    "base_url" : "http://api.twitter.com/1",
                    "version" : "0.1",
                    "methods" : {
                    ....
                    }
    });

With a json string:

    spore.createClient('{"base_url": ...}');

With a file:

    var client = spore.createClient(__dirname +'/twitter.json');

With an url (asynchronous):

    spore.createClientWithUrl('http://example.net/spore.json', function(err, client) {
        // do something with client
    });

You can create a client with a spec splitted in multiple files:

    var client = spore.createClient(__dirname +'/twitter1.json',
                                    __dirname +'/twitter2.json');

To override/modify a spec:

    var client = spore.createClient(__dirname +'/twitter.json',
                                    {base_url: 'http://identi.ca/'});

### Usage

`client.method_name([middleware, ][params, ][payload, ]callback)`

* params: hash with key/value (optional)
* payload: content of the request (optional)
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

#### Misc.

If you just want to perform a *GET* request, use `client.get(url, callback)`:

    client.get('http://example.com/me', function(err, result) {

    });

Get the specification as object with `client.spec`:

    console.log(client.spec.base_url);

### Middlewares

Middleware in spore-node are inspired from [connect](http://github.com/senchalabs/connect).

With middleware you can handle authentication, special body serialization or some special case. Because in real life, most API sucks.

Middleware is a function. Middleware should call *next*, with null (and next middleware will be called), a response (no more middleware will be called and request is abort), a callback (will be called after response received), or an error.

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

If a middleware throw an exception, then the callback is immediatly called, and err param contain exception.

You can also enable middleware with client::enable:

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

You can have a middleware per method:

    client.method_name(middleware, [params, ][payload, ]callback)

#### Method object

Method represent the current method in spore description file.

If API required authentication for all methods and a method specify ''authentication'' to false, method.authentication is false.

Same for formats and expected_status.

#### Request object

* port: server port (80, 443, ...)
* host: host (example.com)
* scheme: scheme or the url (http, https)
* method: http method (GET, POST, ...)
* path_info: request uri with placeholder (/1/example/:id)
* uri: *readonly* request uri without placehoder (/1/example/42)
* query_string: query string as key/value (empty, except path have a query string)
* headers: http request headers as keys/values({'User-Agent': 'node-spore', 'Cookie': '...'})
* params: request params as keys/values ({id: 42})
* payload: payload

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

    function(method, request, next) {
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

#### AuthBasic middleware

HTTP Basic auth for all requests.

    var AuthBasic = require('spore').middlewares.basic(username, password);

#### OAuth1 middleware

Sign each requests with authentication == true. Require [node-oauth](https://github.com/ciaranj/node-oauth/).

    var OAuth = require('oauth');
    var oauth = new OAuth(requestUrl, accessUrl, consumerKey, consumerSecret, version, null, "HMAC-SHA1");
    var OAuthMiddleware = require('spore').middlewares.oauth1(oauth, access_token, access_token_secret);

#### OAuth2 middleware

Sign each requests with authentication == true.

    var oauth2 = require('spore').middlewares.oauth2(access_token);

#### Status middleware

Check if response code match expected_status in spec. Throw exception if status is not expected.

    var StatusMiddleware = require('spore').middlewares.status()`

#### FormatJson middleware

Parse JSON response if content-type is application/json.

    var JsonMiddleware = require('spore').middlewares.json()`

#### Runtime middleware

Add X-Spore-Runtime to the response headers. The value of the header is the time the request took to be executed.

    var RuntimeMiddleware = require('spore').middlewares.runtime()`

## Server

[Connect](http://github.com/senchalabs/connect) middleware:

    var spore = require('spore');
    var middleware = spore.middleware(__dirname +'/twitter.json', {
        public_timeline: function(req, res) {
            res.send('Hello word !');
        }
    });
    var app = require('connect').createServer(middleware);
    app.listen(3000);

## Tests

    $> git submodule update --init
    $> make test

## Examples

See examples/.

## Spore spec compatibility

### API

* base_url: OK
* authentication: OK (via middleware)
* expected_status: OK (via middleware)

### Methods

* method: OK
* path: OK
* optional_params: OK
* required_params: OK
* expected_status: OK (via middleware)
* authentication: OK (via middleware)
* base_url: OK
* required_payload: OK
* deprecated: OK
* headers: OK
* unattended_params: OK
* form-data: NOK

## Compatibility

0.1.x run on node >= 0.4.0.

0.0.3 run on node 0.2.x.

## Links

* [Spore specification](https://github.com/SPORE/specifications)
* [node-spore and IndexTank](https://gist.github.com/1023154)
* [node-spore and node-intervals](https://github.com/francois2metz/node-intervals)

## License

BSD

## Changelog

* **0.1.5** (not yet released)

  Remove node-base64 dependency for auth basic middleware.

  Add middleware per method.

* **0.1.4**

  Fix: GET and HEAD methods can have a payload.

* **0.1.3**

  Set content-length header when a payload is provided.

* **0.1.2**

  Add client.get(url, callback).

  Fix requests and missing 'var'.

* **0.1.1**

  Fix npm publish.

  No more include tests/* in npm package.

  You should use require('spore').middlewares for using build-in middlewares.

* **0.1.0**

  Initial server support with connect. Feedback is welcome.

  Construct client with an url.

  Middlewares can now call next with an error.

  Some internal refactoring.

  Now work on node 0.4. Support of node 0.2.x have been dropped.

* **0.0.3**

  Normalize HTTP verb to upper case.

  Handle headers with placeholder.

  Warning when you are using a deprecated method.

  Handle unattended_params.

  Added request.query_string.

  Added AuthBasic and OAuth2 middlewares.

  Fixed https support.

  Runtime, status and json middlewares are function. **incompatible change**

* **0.0.2**

  Middlewares are no more object but a function. **incompatible change**

  Middlewares are also async. The third or second argument is a callback *next*. **incompatible change**

  Response middlewares can return a response object and break the chain.

  Added some middlewares (json, status, runtime and oauth1).

  Added *enable*, *enable_if* and *disable* methods.

  Create client with multiple spec file.

  Added uri to request object.

  Handle http error.

* **0.0.1**

  Initial version.
