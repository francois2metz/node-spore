/**
 * port
 * host
 * path
 * request headers
 * http status
 * response headers
 * data
 */

var assert = require('assert');
/**
 *
 */
function _request(request, options, callback) {
    assert.equal(options.port, request.port);
    assert.equal(options.host, request.host);
    assert.equal(options.method, request.method);
    assert.equal(options.path, request.path);
    assert.equal(options.headers.host, request.host);
    if (request.headers)
        assert.deepEqual(options.headers, request.headers);
    if (request.secure !== undefined)
        assert.equal(secure, request.secure);
    return {
        _events: {},
        data: "",
        on: function(name, callback) {
            this._events[name] = callback;
        },
        write: function(data) {
            this.data += data;
        },
        end: function() {
            var that = this;
            if (request.error) {
                setTimeout(function() {
                    that._events['error'](request.error);
                }, 100);
                return;
            }
            if (request.payload)
                assert.equal(this.data, request.payload);
            setTimeout(function() {
                callback({
                    statusCode: request.statusCode,
                    headers: request.response_headers,
                    _events: {},
                    on: function(name, callback){
                        this._events[name] = callback;
                        if (name == 'end')
                        {
                            var that = this;
                            setTimeout(function() {
                                var data = request.response_data;
                                that._events.data(data);
                                that._events.end();
                            }, 100);
                        }
                    }
                });
            }, 1000);
        }
    };
}

exports.init = function() {
    var mocks = [];
    return {
        http : {
            request: function(options, callback) {
                var request = mocks.shift();
                return _request(request, options, callback);
            }
        },
        add: function(mock) {
            mocks.push(mock);
        }
    };
};
