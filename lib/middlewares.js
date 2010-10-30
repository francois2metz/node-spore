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
/**
 * Status middleware
 */
exports.status = {
    response: function(method, response) {
        if (method.expected_status.indexOf(response.status) == -1) {
            throw Error(response.status +' is not an expected_status: '+ method.expected_status);
        }
    }
};

exports.runtime = {
    request: function(method, request, env) {
        env.m_runtime = new Date().getTime();
    },
    response: function(method, response, env) {
        response.headers['X-Spore-Runtime'] = new Date().getTime() - env.m_runtime;
    }
};
