"use strict";

var connect = require('./connect.js');
var request = require('request');
var mustache = require('mustache');

var message;
var objectStructure;
var qs = {};

module.exports = function(RED) {
    function MaximoCreate(config) {
        RED.nodes.createNode(this, config);

		this.on('input', function(msg) {
			message = msg;
			objectStructure = config.resource;
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
			
			if(objectStructure.indexOf("{{") != -1) {
				objectStructure = mustache.render(objectStructure, message);
			}

			if(body.indexOf("{{") != -1) {
				body = mustache.render(body, message);
			}

			// Check if we are already connected to Maximo
			if(sessionInfo.session === null) { // Connect
				connect(this, sessionInfo, localContext, connectionName, create, body);
			} else // Reuse the existing connection
				create(this, message, sessionInfo, body);
        });
    }

    RED.nodes.registerType('create', MaximoCreate);
}

function create(node, message, sessionInfo, createBody) {
	node.status({fill:"green",shape:"ring",text:"sending"});
	var url = sessionInfo.url + '/os/' + objectStructure;

	var opts = {
		method: 'POST',
		url: url,
		qs: qs,
		body: createBody,
		headers: {
			Cookie: sessionInfo.session,
			'x-public-uri': sessionInfo.url
		}
	};

	request(opts, function (error, response, body) {
		message.maximo = {};
		if(error != null) {
			node.status({fill:"red",shape:"dot",text:"error on create"});
			message.maximo.error = JSON.stringify(error);

			node.send(message);
			return;
		}

		message.maximo.payload = 'No content';
		message.maximo.headers = response.headers;
		message.maximo.statusCode = response.statusCode;
		
		if(response.statusCode !== 201)
			node.status({fill:"red",shape:"dot",text:"not created"});
		else
			node.status({fill:"green",shape:"dot",text:"sent"});

		node.send(message);
	});
}