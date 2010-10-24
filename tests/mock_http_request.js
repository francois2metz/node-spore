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
function createClient(request, port, host) {
    assert.equal(port, request.port);
    assert.equal(host, request.host);
    return {
        request: function(method, path, headers) {
            assert.equal(method, request.method);
            assert.equal(path, request.path);
            assert.equal(headers.host, request.host);
            if (request.headers)
                assert.deepEqual(headers, request.headers);
            return {
                _events: {},
                on: function(name, callback) {
                    this._events[name] = callback;
                },
                write: function(data) {
                    this.data = data;
                },
                end: function() {
                    var that = this;
                    if (request.data)
                        assert.equal(this.data, request.data);
                    setTimeout(function() {
                        that._events.response({
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
    };
}

exports.http = {
    mock: [],
    createClient: function(port, host) {
        var request = this.mock.shift();
        return createClient(request, port, host);
    },
    addMock: function(mock) {
        this.mock.push(mock);
    }
};
