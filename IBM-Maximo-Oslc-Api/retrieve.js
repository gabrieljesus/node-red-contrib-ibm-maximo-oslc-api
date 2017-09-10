"use strict";

var request = require('request');

module.exports = function(RED) {
    function MaximoRetrieve(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var isTemplatedUrl = (config.maximourl || "").indexOf("{{") != -1;

		node.on('input', function(msg) {

			if(msg.maximo.error != null) {
				node.send(msg);
				return;
			}

			var url = config.maximourl || msg.url;
			
			if (isTemplatedUrl) {
				url = mustache.render(url, msg);
			}

			url = url + '/oslc/os/' + config.resource;
			if(msg.maximo.lean === true) {
				url = url + '?lean=1';
			}

			var opts = {
				method: 'GET',
				url: url,
				headers: {
					Cookie: msg.maximo.session
				}
			};

			request(opts, function (error, response, body) {
				if(error != null) {
					msg.maximo = {
						error: JSON.stringify(error)
					}

					node.send(msg);
					return;
				}

				node.status({});
				msg.payload = {
					response_body: JSON.parse(body)
				}
				msg.headers = response.headers;
				msg.statusCode = response.statusCode;

				node.send(msg);
			});
        });
    }

    RED.nodes.registerType('retrieve', MaximoRetrieve);
}