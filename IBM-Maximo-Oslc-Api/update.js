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
		}
	};

	request(opts, function (error, response, responseBody) {
		message.maximo = {
			request: opts,
			response: {}
		};

		var jsonBody;
		if(responseBody != null && responseBody.length > 0)
			jsonBody = JSON.parse(responseBody);
		else
			jsonBody = {}

		if(error != null || jsonBody.Error != null) {
			if(jsonBody.Error.reasonCode === "BMXAA0021E") {
				var localContext = node.context().flow.global;
				var connectionName;
				for(let element of localContext.keys()) {
					if(element !== "get" && element !== "set" && element !== "keys") {
						if(localContext.get(element).session === sessionInfo.session) {
							connectionName = element;
							break;
						}
					}
				}
				connect(node, message, sessionInfo, localContext, connectionName, update, body);
				return;
			} else {
				node.status({fill:"red",shape:"dot",text:"error on update"});
				message.maximo.response.error = JSON.stringify(error);

				node.send(message);
				return;
			}
		}

		message.maximo.response.payload = 'No content';
		message.maximo.response.headers = response.headers;
		message.maximo.response.statusCode = response.statusCode;
		
		if(response.statusCode !== 204)
			node.status({fill:"red",shape:"dot",text:"not updated"});
		else
			node.status({fill:"green",shape:"dot",text:"updated"});

		node.send(message);
	});
}