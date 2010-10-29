/**
 * Json middleware
 */
exports.json =  {
        response: function(method, response) {
            if (response.headers['content-type'] &&
                response.headers['content-type'].search(/application\/json/) != -1) {
                response.body = JSON.parse(response.body);
            }
        }
};
