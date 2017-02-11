var Promise = require('es6-promise').Promise,
	http = require('http'),
	querystring = require('querystring')
	//colors = require('colors/safe')
;

function NoREST(namespaceCfg) {
	var namespace = namespaceCfg,
		config = namespace.config,
		user = null;

	function _parsePayload(i) {
		var o = i;

		if(i && ["{","["].indexOf(i[0]) > -1) {
			o = JSON.parse(i);
		}

		return o;
	}
	function _getNoDbSchema() {
		console.log("getNoDbSchema");
		var options = {
			host: config.rest.host,
			port: config.rest.port,
			method: "GET",
			path: config.rest.noDbSchemaUri,
			headers: {
				'Authorization': 'Bearer ' + user.access_token,
				'Content-Type': 'application/json'
			}
		};

		return this.request(options);
	}

	function _authReq(options, payload, noAuthReq) {
		console.info("HTTP Begin Request", options.host, options.port, options.method, options.path);
		return new Promise(function (resolve, reject) {
			var restCfg = namespace.rest,
				authCfg = restCfg.auth ? restCfg.auth.authorization : undefined,
				resp = "",
				req,
				data = _parsePayload(payload);

			if(!noAuthReq && !options.headers.Authorization && data && data.jwt ) {
				options.headers.Authorization = "Bearer "  + data.jwt
			}

			options.headers.connection = "keep-alive";

			req = http.request(options, function (res) {
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					resp = resp + chunk;
				});
				res.on('end', function () {
					console.info("HTTP End Request", res.statusCode, res.statusMessage);

					switch(res.statusCode) {
						case 400:
						case 500:
							reject({status: res.statusCode, message: res.statusMessage});
							break;
						case 401:
							reject({status: res.statusCode, message: res.statusMessage});
							//reject(401);
							break;
						default:
							if(resp.indexOf("<") === 0) {
								reject(resp);
							} else {
								resolve(!!resp ? JSON.parse(resp) : []);

							}
							break;
					}

				});
			});


			req.on('error', function (err) {
				console.error("HTTP Request Rrror", namespace.name, err);
				reject(err);
			});

			if(payload) {
				console.info("HTTP Sending", payload.length, "bytes of data");
				req.write(payload);

			}

			req.end();

		});
	}

	function _authenticate() {
		console.info("Authenticating access to", namespace.name, "REST API");

		var restCfg = namespace.rest;

		if(restCfg.auth) {
			var payload = querystring.stringify(restCfg.auth.payload),
				options = {
					host: restCfg.host,
					port: restCfg.port,
					method: "POST",
					path: restCfg.auth.tokenUri,
					headers: {
						'Content-Type': restCfg.auth.tokenContentType,
						'Content-Length': payload.length
					}
				};

			return _authReq(options, payload, true)
				.then(function (data) {
					console.log(namespace.name, "Authentication successful for", data.username);
					user = data;
					//console.log(user);
					return user;
				})
				.catch(function (err) {
					console.error("Authentication Failed.", namespace.name, err);
				});
		} else {
			console.log(namespace.name, "Debug Authentication successful.");
			return Promise.resolve({
				userId: "debug",
				access_token: "FAKEBEARERTOKEN"
			});
		}
	}

	function _authorized(ruser) {
		return new Promise(function (resolve, reject) {
			if(ruser){
				console.log(namespace.name, "Using request user.");
				resolve(ruser);
			} else if(user) {
				console.log(namespace.name, "Using cached user login.");
				resolve(user);
			} else {

				_authenticate()
					.then(resolve)
					.catch(reject);
			}
		});
	}

	function _request(options, payload) {
		return _authReq(options, payload)
			.then(function (results) {
				return results;
			})
			.catch(function (err) {
				throw err;
			});
	}

	this.request = _request;
	this.authorizedRequest = _authReq;
	this.authenticate = _authenticate;
	this.authorized = _authorized;
	this.noDbSchema = _getNoDbSchema;
	this.user = user;

}

module.exports = function (namespace) {
	return new NoREST(namespace);
};
