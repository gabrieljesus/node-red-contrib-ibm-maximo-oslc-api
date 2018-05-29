"use strict";

var connect = require('./connect.js');
var request = require('request');
var mustache = require('mustache');

var message;
var resourceUrl;
var qs = {};

module.exports = function(RED) {
    function MaximoUpdate(config) {
        RED.nodes.createNode(this, config);

		this.on('input', function(msg) {
			message = msg;
			resourceUrl = config.resourceUrl;
			var localContext = this.context().flow.global;
			var connectionName = RED.nodes.getNode(config.maximoConnection).name.replace(' ', '');
			var sessionInfo = localContext.get(connectionName);
			var lean = sessionInfo.lean;
			var tenantCode = sessionInfo.tenantCode;
			var body = config.body;

			if(lean === true)
				qs.lean = 1;

			if(tenantCode) {
				if(tenantCode.indexOf("{{") != -1)
					tenantCode = mustache.render(tenantCode, message);

				qs._tenantcode = tenantCode;
			}
			
			if(resourceUrl.indexOf("{{") != -1) {
				resourceUrl = mustache.render(resourceUrl, message);
			}

			console.log("Resource URL: " + resourceUrl);

			if(body.indexOf("{{") != -1) {
				body = mustache.render(body, message);
			}

			// Check if we are already connected to Maximo
			if(sessionInfo.session === null) { // Connect
				connect(this, message, sessionInfo, localContext, connectionName, update, body);
			} else // Reuse the existing connection
				update(this, message, sessionInfo, body);
        });
    }

    RED.nodes.registerType('update', MaximoUpdate);
}

function update(node, message, sessionInfo, body) {
	node.status({fill:"green",shape:"ring",text:"sending"});
	var url = resourceUrl;

	node.warn(url);
	
	var opts = {
		method: 'POST',
		url: url,
		qs: qs,
		body: body,
		headers: {
			Cookie: sessionInfo.session,
			'x-public-uri': sessionInfo.url,
			'x-method-override': 'PATCH',
			'patchtype': 'MERGE'
		},
	    rejectUnauthorized: sessionInfo.rejectUnauthorized
	};

	request(opts, function (error, response, responseBody) {
		message.maximo = {
			request: opts,
			response: {}
		};

		node.warn(JSON.stringify(opts));

		if(error != null) {
			node.status({fill:"red",shape:"dot",text:"error on update"});
			message.maximo.response.error = JSON.stringify(error);
			node.warn(error);
			node.send(message);
			return;
		}


		message.maximo.response.headers = response.headers;
		message.maximo.response.statusCode = response.statusCode;
		
		if(response.statusCode > 400) {
			message.maximo.response.payload = responseBody;
			node.status({fill:"red",shape:"dot",text:"not updated"});
		} else {
			node.status({fill:"green",shape:"dot",text:"updated"});
			switch(responseBody.statusCode) {
				case 200:
					message.maximo.response.payload = 'OK';
					break;
				case 200:
					message.maximo.response.payload = 'Created';
					break;
				case 204:
					message.maximo.response.payload = 'No content';
					break;
				case 204:
					message.maximo.response.payload = 'access issue';
					break;
				default: 
					message.maximo.response.payload = 'No content';
				
			}
		}
			
		node.send(message);
	});
}
