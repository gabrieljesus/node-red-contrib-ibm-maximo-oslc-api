"use strict";

var mustache = require('mustache');

module.exports = function(RED) {
    function MaximoConnection(config) {
		RED.nodes.createNode(this, config);
		var tenantCode = config.tenantCode;
		var lean = config.lean;
		var url = config.maximourl;

		if(tenantCode) {
			if(tenantCode.indexOf("{{") != -1)
				tenantCode = mustache.render(tenantCode, message);
		}

		if(lean) {
			if(typeof lean == "string" && lean.indexOf("{{") != -1)
				lean = mustache.render(lean, message);
		}

		if(url) {
			if(url.indexOf("{{") != -1)
				url = mustache.render(url, message);
		}

        var maxObject = {
			tenantCode: config.tenantCode,
			maxauth: Buffer.from(this.credentials.username + ':' + this.credentials.password, 'utf8').toString('base64'),
        	lean: config.lean,
        	url: config.maximourl + '/oslc',
        	session: null
        };
        this.context().global.set(config.name.replace(/ /g, ''), maxObject);
    }

    RED.nodes.registerType('maximoConnection', MaximoConnection,
	    {
	    	credentials: {
	            username: {type:"text"},
	            password: {type: "password"}
	        }
	    }
    );
}