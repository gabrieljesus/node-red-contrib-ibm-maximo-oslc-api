var request = require('request');

function connect(node, message, sessionInfo, context, connectionName, cb, body) {
	node.status({fill:"yellow",shape:"ring",text:"connecting"});
	var url = sessionInfo.url + '/login';
	var qs = {};

	if(sessionInfo.lean === true)
		qs.lean = 1;

	if(sessionInfo.tenantCode !== undefined)
		qs._tenantCode = sessionInfo.tenantCode;

	//TODO: templated url
	var opts = {
		method: 'POST',
		url: url,
		qs: qs,
		headers: {
			maxauth: sessionInfo.maxauth
		},
	    rejectUnauthorized: sessionInfo.rejectUnauthorized,
	    resolveWithFullResponse: true
	};

	request(opts, function(error, response, respBody) {
		message.maximo = {
			request: opts,
			response: {}
		};

		if(error !== null) {
			node.status({fill:"red",shape:"dot",text:"error on connecting, check payload for error"});
			message.maximo.response.error = JSON.stringify(error);
			
			message.maximo.response.payload = "NOT CONNECTED. Check if the Maximo is up and running!";
			node.send(message);
		    node.error("NOT CONNECTED. " + error);
		    return;
		} else {
			node.status({fill:"yellow",shape:"dot",text:"connected"});
			message.maximo.response.payload = respBody;
			message.maximo.response.headers = response.headers;
			message.maximo.response.statusCode = response.statusCode;
			message.maximo.response.session = response.headers["set-cookie"][0];

			sessionInfo.session = response.headers["set-cookie"][0];

			context.set(connectionName, sessionInfo);
			cb(node, message, sessionInfo, body);
		}
	});
}

module.exports = connect;
