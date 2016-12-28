var Promise = require('es6-promise').Promise,
	http = require('http'),
	querystring = require('querystring');

function NoREST(namespaceCfg) {
	var namespace = namespaceCfg,
		config = namespace.config,
		user = null;

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
		console.log("_authReq::begin", options.host, options.port, options.method, options.path);

		return new Promise(function (resolve, reject) {
			var restCfg = namespace.rest,
				authCfg = restCfg.auth ? restCfg.auth.authorization : undefined,
				resp = "",
				req,
				data = payload ? JSON.parse(payload) : undefined;

			//console.log("restCfg", (namespace.name ?   namespace.name + "/" : ""));

			// if(ruser) {
			// 	options.headers.Authorization = ruser.sec.jwt.token_type + " " + ruser.sec.jwt.id_token;
			// }else if(authCfg && user) {
			// 	options.headers[authCfg.key] = authCfg.value.replace("userToken", user[authCfg.userToken]);
			// }
			if(!options.headers.Authorization && data && data.jwt ) {
				options.headers.Authorization = "Bearer "  + data.jwt
			}
			
			options.headers.connection = "keep-alive";

			//console.log("XXXXXXX",options.headers);
			//console.log("request", options);

			req = http.request(options, function (res) {
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					resp = resp + chunk;
					//console.log('data');
				});
				res.on('end', function () {
					// console.log('data');
					console.log("_authReq::end", res.statusCode, res.statusMessage);

					switch(res.statusCode) {
						case 400:
						case 500:
							reject({status: res.statusCode, message: res.statusMessage});
							break;
						case 401:
							//reauthenticate and then retry.
							// restAuthenticate()
							// 	.then(create)
							// 	.catch(reject);
							reject({status: res.statusCode, message: res.statusMessage});
							//reject(401);
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
				console.error("_authReq::error", namespace.name, err);
				reject(err);
			});

			if(payload) {
				console.log("_authReq::write", payload);
				//console.log(" payload", payload);
				req.write(payload);
			}

			req.end();
			console.log("_authReq: req.end called.");

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
					return user;
				})
				.catch(function (err) {
					console.error(namespace.name, err);
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
			//_authorized(ruser)
			//.then(_authReq.bind(this, options, payload))
			.then(function (results) {
				console.log("_authReq::success", namespace.name, {status: 1, message:  "Operation Successful", results: results});
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
	// this.user = undefined;
	// this.namespace = namespace;
	// this.restRequest = restRequest.bind(this);
	// this.authorize = authorize.bind(this);
	// this.authenticate = restAuthenticate.bind(this);
	// this.restRequest = restRequest.bind(this);
	// //this.validateToken = validateToken.bind(null, namespace, user);
};
