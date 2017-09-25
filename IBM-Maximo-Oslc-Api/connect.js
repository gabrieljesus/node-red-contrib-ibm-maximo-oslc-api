var request = require('request');

function connect(node, sessionInfo, context, connectionName, cb, body) {
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
		resolveWithFullResponse: true
	};

	var msg = {};

	request(opts, function(error, response, respBody) {
		if(error !== null) {
			node.status({fill:"red",shape:"dot",text:"error on connecting"});
			msg.maximo = {
				error: JSON.stringify(error),
			}
			
			msg.maximo.payload = "NOT CONNECTED. Check if the Maximo is up and running!";
			node.send(msg);
			node.error("NOT CONNECTED. Check if the Maximo is up and running!");
			return;
		} else {
			node.status({fill:"yellow",shape:"dot",text:"connected"});
			msg.maximo = {
				payload: respBody,
				headers: response.headers,
				statusCode: response.statusCode,
				session: response.headers["set-cookie"][0]
			};
			node.warn(msg);

			sessionInfo.session = response.headers["set-cookie"][0];

			context.set(connectionName, sessionInfo);
			cb(node, msg, sessionInfo, body);
		}
	});
}

module.exports = connect;