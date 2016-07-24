var Promise = require('es6-promise').Promise,
	http = require('http'),
	querystring = require('querystring');

function NoREST(namespaceCfg) {
	var namespace = namespaceCfg,
		config = namespace.config,
		user;

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

	function _authReq(options, payload) {

		return new Promise(function (resolve, reject) {
			var restCfg = namespace.rest,
				authCfg = restCfg.auth ? restCfg.auth.authorization : undefined,
				resp = "",
				req;


			if(authCfg && user) {
				options.headers[authCfg.key] = authCfg.value.replace("userToken", user[authCfg.userToken]);
			}



			req = http.request(options, function (res) {
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					resp = resp + chunk;
				});
				res.on('end', function () {

					switch(res.statusCode) {
						case 400:
						case 500:
							reject(res.statusMessage);
							break;
						case 401:
							//reauthenticate and then retry.
							// restAuthenticate()
							// 	.then(create)
							// 	.catch(reject);
							break;
						default:
							//console.info(change.tableName + " " + res.statusCode + " " + res.statusMessage);
							//log(entity.entityName + " statusCode: ", JSON.stringify(res));
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
				console.error(namespace.name, err);
			});

			if(payload) {
				req.write(payload);
			}

			req.end();
		});
	}

	function _authenticate() {
		console.info(namespace.name, "Authenticating access to REST API");

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

			return _authReq(options, payload)
				.then(function (data) {
					user = data;
					console.log(namespace.name, "Authentication successful.");
					//console.log(user);
				})
				.catch(function (err) {
					console.error(namespace.name, err);
				});
		} else {
			return Promise.resolve({
				userId: "fake",
				access_token: "FAKE BEARER TOKEN"
			});
		}
	}

	function _authorized() {
		return new Promise(function (resolve, reject) {
			if(user) {
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
		return _authorized()
			.then(_authReq.bind(this, options, payload))
			.then(function (results) {
				//console.log(namespace.name, results);
				return results;
			})
			.catch(function (err) {
				console.error(err);
			});
	}

	this.request = _request;
	this.authorizedRequest = _authReq;
	this.authenticate = _authenticate;
	this.authorized = _authorized;
	this.noDbSchema = _getNoDbSchema;
}

module.exports = function (namespace) {
	return new NoREST(namespace);
	// this.user = undefined;
	// this.namespace = namespace;
	// this.restRequest = restRequest.bind(this);
	// this.authorize = authorize.bind(this);
	// this.authenticate = restAuthenticate.bind(this);
	// this.restRequest = restRequest.bind(this);
	// //this.validateToken = validateToken.bind(null, namespace, user);
};
