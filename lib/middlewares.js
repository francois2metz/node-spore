"use strict";
/**
 * Oauth1 middleware
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
 * Json middleware
 */
exports.json = function(method, request, next) {
    next(function(response) {
        if (response.headers['content-type'] &&
            response.headers['content-type'].search(/application\/json/) != -1) {
            response.body = JSON.parse(response.body);
        }
    });
};
/**
 * Status middleware
 */
exports.status = function(method, request, next) {
    next(function(response) {
        if (method.expected_status.indexOf(response.status) == -1) {
            throw Error(response.status +' is not an expected_status: '+ method.expected_status);
        }
    });
};
/**
 * Runtime Middleware
 */
exports.runtime = function(method, request, next) {
    var time = new Date().getTime();
    next(function(response) {
        response.headers['X-Spore-Runtime'] = new Date().getTime() - time;
    });
};
