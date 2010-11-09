"use strict";
/**
 * Json middleware
 */
exports.json = function(method, request, callback) {
    callback(function(response) {
        if (response.headers['content-type'] &&
            response.headers['content-type'].search(/application\/json/) != -1) {
            response.body = JSON.parse(response.body);
        }
    });
};
/**
 * Status middleware
 */
exports.status = function(method, request, callback) {
    callback(function(response) {
        if (method.expected_status.indexOf(response.status) == -1) {
            throw Error(response.status +' is not an expected_status: '+ method.expected_status);
        }
    });
};
/**
 * Runtime Middleware
 */
exports.runtime = function(method, request, callback) {
    var time = new Date().getTime();
    callback(function(response) {
        response.headers['X-Spore-Runtime'] = new Date().getTime() - time;
    });
};
