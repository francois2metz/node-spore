"use strict";
/**
 * Auth Basic middleware
 * add Authorization header on each requests
 */
exports.basic = function(username, password) {
    var authorization = 'Basic '+ new Buffer(username +':'+ password, 'utf8').toString('base64');
    return function(method, request, next) {
        request.headers['Authorization'] = authorization;
        next();
    };
};
/**
 * OAuth1 middleware
 * Params:
 *  - oauth: oauth client
 *  - access_token
 *  - access_token_secret
 */
exports.oauth1 = function(oauth, access_token, access_token_secret) {
    return function(method, request, next) {
        if (method.authentication) {
            var authHeader = oauth.authHeader(request.scheme+'://'+ request.host + request.uri, access_token, access_token_secret, request.method);
            request.headers["Authorization"] = authHeader;
        }
        next();
    };
};
/**
 * OAuth2 middleware
 * Params:
 *  - access_token
 */
exports.oauth2 = function(access_token) {
    return function(method, request, next) {
        if (method.authentication) {
            request.headers["Authorization"] = 'OAuth '+ access_token;
        }
        next();
    };
};
/**
 * Json middleware
 */
exports.json = function() {
    return function(method, request, next) {
        next(function(response, next) {
            if (response.headers['content-type'] &&
                response.headers['content-type'].search(/application\/json/) != -1) {
                response.body = JSON.parse(response.body);
            }
            next();
        });
    };
};
/**
 * Status middleware
 */
exports.status = function() {
    return function(method, request, next) {
        next(function(response, next) {
            if (method.expected_status.indexOf(response.status) == -1) {
                throw Error(response.status +' is not an expected_status: '+ method.expected_status);
            }
            next();
        });
    };
};
/**
 * Runtime Middleware
 */
exports.runtime = function() {
    return function(method, request, next) {
        var time = new Date().getTime();
        next(function(response, next) {
            response.headers['X-Spore-Runtime'] = new Date().getTime() - time;
            next();
        });
    };
};
