"use strict";

var connect = require('./connect.js');
var request = require('request');
var mustache = require('mustache');

var message;
var objectStructure;
var qs = {};

module.exports = function(RED) {
    function MaximoRetrieve(config) {
        RED.nodes.createNode(this, config);

		this.on('input', function(msg) {
			message = msg;
			objectStructure = config.resource;
			var localContext = this.context().flow.global;
			var connectionName = RED.nodes.getNode(config.maximoConnection).name.replace(' ', '');
			var sessionInfo = localContext.get(connectionName);
			var lean = sessionInfo.lean;
			var tenantCode = sessionInfo.tenantCode;

			var select = config.select;
			var where = config.where;
			var orderBy = config.orderBy;
			var pageSize = config.pageSize;
			var pageNumber = config.pageNumber;
			var searchAttributes = config.searchAttributes;
			var searchTerms = config.searchTerms;
			var respFormat = config.respFormat;
			var addSchema = config.addSchema;
			var collectionCount = config.collectionCount;
			
			if(lean === true)
				qs.lean = 1;

			if(tenantCode !== undefined)
				qs._tenantcode = tenantCode;

			if(objectStructure.indexOf("{{") != -1)
				objectStructure = mustache.render(objectStructure, message);
			
			if(select !== undefined)
				qs['oslc.select'] = select;
			
			if(where !== undefined)
				qs['oslc.where'] = where;
			
			if(orderBy !== undefined)
				qs['oslc.orderBy'] = orderBy;
			
			if(pageSize !== undefined)
				qs['oslc.pageSize'] = pageSize;
			
			if(pageNumber !== undefined)
				qs.pageno = pageNumber;
			
			if(searchAttributes !== undefined)
				qs.searchAttributes = searchAttributes;
			
			if(searchTerms !== undefined)
				qs['oslc.searchTerms'] = searchTerms;
			
			if(respFormat !== undefined) {
				if(respFormat != 'json')
					qs._format = respFormat;
			}
			
			if(addSchema === true)
				qs.addSchema = 1;
			
			if(collectionCount === true)
				qs.collectioncount = 1;

			// Check if we are already connected to Maximo
			if(sessionInfo.session === null) { // Connect
				connect(this, sessionInfo, localContext, connectionName, retrieve);
			} else // Reuse the existing connection
				retrieve(this, message, sessionInfo);
        });
    }

    RED.nodes.registerType('retrieve', MaximoRetrieve);
}

function retrieve(node, message, sessionInfo) {
	node.status({fill:"green",shape:"ring",text:"sending"});
	var url = sessionInfo.url + '/os/' + objectStructure;

	var opts = {
		method: 'GET',
		url: url,
		qs: qs,
		headers: {
			Cookie: sessionInfo.session,
			'x-public-uri': sessionInfo.url
		}
	};

	request(opts, function (error, response, body) {
		message.maximo = {};
		if(error != null) {
			node.status({fill:"red",shape:"dot",text:"error on retrieve"});
			message.maximo.error = JSON.stringify(error);

			node.send(message);
			return;
		}

		node.status({fill:"green",shape:"dot",text:"sent"});
		message.maximo.payload = JSON.parse(body);
		message.maximo.headers = response.headers;
		message.maximo.statusCode = response.statusCode;

		node.send(message);
	});
}