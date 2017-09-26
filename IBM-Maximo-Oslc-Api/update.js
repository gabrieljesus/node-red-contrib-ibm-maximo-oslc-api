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

			if(tenantCode !== undefined)
				qs._tenantcode = tenantCode;
			
			if(resourceUrl.indexOf("{{") != -1) {
				resourceUrl = mustache.render(resourceUrl, message.maximo);
			}

			if(body.indexOf("{{") != -1) {
				body = mustache.render(body, message);
			}

			// Check if we are already connected to Maximo
			if(sessionInfo.session === null) { // Connect
				connect(this, sessionInfo, localContext, connectionName, update, body);
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
		if(error != null) {
			node.status({fill:"red",shape:"dot",text:"error on update"});
			message.maximo.error = JSON.stringify(error);

			node.send(message);
			return;
		}

		message.maximo.payload = 'No content';
		message.maximo.headers = response.headers;
		message.maximo.statusCode = response.statusCode;
		
		if(response.statusCode !== 204)
			node.status({fill:"red",shape:"dot",text:"not updated"});
		else
			node.status({fill:"green",shape:"dot",text:"sent"});

		node.send(message);
	});
}