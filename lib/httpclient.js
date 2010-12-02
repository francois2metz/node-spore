/**
 * Simple http client
 * make request and callback with response or error
 */
/**
 * request server
 * Params:
 *  - httpClient : require('http')
 *  - request : see client.js#request
 *  - callback
 */
exports.request = function(httpClient, request, callback) {
    var client      = httpClient.createClient(request.port, request.host, request.scheme == 'https');
    var httpRequest = client.request(request.method, request.uri, request.headers);
    client.on('error', function(e) {
        callback(e, null);
    });
    if (request.payload !== null)
        httpRequest.write(request.payload);
    var data = "";
    httpRequest.on('response', function(response) {
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            var c = {
                status  : response.statusCode,
                headers : response.headers,
                body    : data
            };
            callback(null, c);
        });
    });
    httpRequest.end();
};
