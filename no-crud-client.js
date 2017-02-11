function NoCRUDClient(ns) {
	var namespace = ns,
		restClient = namespace.rest,
		config = namespace.config;

	function resolveUrl(ns, c, odata){
		console.log("resolveUrl", ns.name, c.tableName);

		var	restCfg = ns.config.rest,
			entity = ns.config.schema[c.tableName],
			pk = c.data[entity.primaryKey],
		 	url;

		if(entity.endpoint) {
			url = entity.endpoint.uri
		} else {
			if(restCfg.apiPrefix) {
				url = restCfg.apiPrefix;
			} else {
				url = ns.name ? "/" + ns.name + "/" : "/";
			}
		}

		if(restCfg.type === "MS-ODATA2") {
			switch(c.changeType) {
				case "U":
				case "D":
					url +=  c.tableName + "(guid'" + pk + "')";
					break;
				default:
					url +=  c.tableName + (odata || "");
			}
		} else{
			url +=  c.tableName + (odata || "");
		}





		 //.name, change ? change.table : ""
		 console.log("resolveUrl", url);
		 return url;
	}

	function resolveRestConfig(ns, c) {
		var entity = ns.config.schema[c.tableName];

		return entity.endpoint || namespace.config.rest;
	}

	function resolveContentTransferMethod(options, l) {

		if(l > 4000) {
			options.headers['Transfer-Encoding'] = 'chunked';
		} else {
			options.headers['Content-Length'] = l;
		}

		return options;
	}

	function restCreate(user, change) {
		console.log("restCreate", user);

		var	restCfg = resolveRestConfig(namespace, change),
			url = resolveUrl(namespace, change),
			payload = JSON.stringify(change.data),
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "POST",
				path: url,
				headers: {
					'Content-Type': 'application/json;odata=verbose',
					'strictSSL': false,
					'rejectUnauthorized': false,
					'agent': false,
					'Authorization': 'Bearer ' + user.jwt
				}
			};

		options = resolveContentTransferMethod(options, Buffer.byteLength(payload) );


		console.log("restCreate", namespace.name, "Requesting: ", url, "Paylaod size", payload ? Buffer.byteLength(payload) : 0);

		return restClient.request(options, payload, user)
			.then(function(data){
				return data;
			})
			.catch(function(err){
				throw err;
			});

	}
	this.create = restCreate;

	function restOne(user, change) {
		var url = resolveUrl(namespace, change),
			options = {
				host: config.rest.host,
				port: config.rest.port,
				method: "GET",
				path: url,
				headers: {
					'Content-Type': 'application/json'
				}
			};

		return restClient.request(options, undefined, user)
			.then(function (data) {

				return data.length ? data[0] : data;
			});

	}
	this.one = restOne;


	function restRead(user, tableName, odataFilter) {
		var url = resolveUrl(namespace, {tableName: tableName}, odataFilter),
			options = {
				host: config.rest.host,
				port: config.rest.port,
				method: "GET",
				path: url,
				headers: {
					'Content-Type': 'application/json'
				}
			};

		return restClient.request(options, undefined, user)
			.then(function (data) {
				return data;
			})
			.catch(function(err){
				console.error("restRead", err);
				throw err;
			});


	}
	this.read = restRead;

	function restValidate() {
		return new Promise(function (resolve, reject) {

			var resp = "",
				options = {
					host: config.rest.host,
					port: config.rest.port,
					method: "POST",
					path: "/ValidateToken",
					headers: {
						'Authorization': 'Bearer ' + user.access_token,
						'Content-Type': 'application/json'
					}
				},
				req = http.request(options, function (res) {

					res.on('data', function (chunk) {
						resp = resp + chunk;
					});

					res.on('end', function () {
						if(res.statusCode == 400 || res.statusCode == 401) {
							reject("Unauthorized");
						}
						resolve();
					});
				});
			req.on('error', reject);

			// write data to request body
			req.end();
		});
	}
	this.validate = restValidate;

	function restError() {
		user = undefined;

		return restAuthenticate();
	}
	this.error = restError;


	function restUpdate(user, change) {
		try{
			// var r
			// 	entity = namespace.config.schema[change.tableName],
			// 	pk = change.data[entity.primaryKey],
			// 	payload = JSON.stringify(change.data),
			// 	url = resolveUrl(namespace, change),
			var	restCfg = namespace.config.rest,
				url = resolveUrl(namespace, change),
				payload = JSON.stringify(change.data),
				options = {
					host: restCfg.host,
					port: restCfg.port,
					method: "PATCH",
					path: url,
					headers: {
						'Content-Type': 'application/json;odata=verbose',
						'strictSSL': false,
						'rejectUnauthorized': false,
						'agent': false,
						'Authorization': 'Bearer ' + user.jwt
					}
				};

			options = resolveContentTransferMethod(options, Buffer.byteLength(payload) );


			console.log("restUpdate", namespace.name, "Requesting: ", url, "Paylaod size", payload ? Buffer.byteLength(payload) : 0);
			return restClient.request(options, payload, user)
				.then(function(data){
					return data;
				})
				.catch(function(err){
					console.error("restUpdate:inner", err);
					throw err;
				});

		}catch(err) {
			console.error("restUpdate:outer", err);
			throw err;
		}
	}
	this.update = restUpdate;

	function restDelete(user, change) {
		function destroy(user, change) {
			var url = resolveUrl(namespace, change),
				options = {
					host: config.rest.host,
					port: config.rest.port,
					method: "DELETE",
					path: url,
					headers: {
						'Content-Type': 'application/json'
					}
				};

			return restClient.request(options, undefined, user)
				.then(function (data) {
					return data;
				})
				.catch(function(err){
					console.error("restDelete", err);
					throw err;
				});
		}

		return new Promise(function (resolve, reject) {
			restOne(user, change)
				.then(function (data) {
					change.before = data;
					return destroy(user, change);
				})
				.then(resolve)
				.catch(reject);
		});

	}
	this.delete = restDelete;
}

module.exports = function (namespace) {
	return new NoCRUDClient(namespace);
};
