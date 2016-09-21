function NoCRUDClient(ns) {
	var namespace = ns,
		restClient = namespace.rest,
		config = namespace.config;

	function resolveUrl(ns, c, odata){
		//console.log("resolveUrl", c);
		 var url = (ns.name ? "/" + ns.name + "/" : "/") + c.tableName + (odata || "");
		 //.name, change ? change.table : ""

		 return url;
	}

	function restCreate(user, change) {
		//console.log("change", change);
		var restCfg = namespace.config.rest,
			payload = JSON.stringify(change.data),
			url = resolveUrl(namespace, change),
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "POST",
				path: url,
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(payload),
					'strictSSL': false,
					'rejectUnauthorized': false,
					'agent': false
				}
			};

		console.log(namespace.name, "Requesting: ", url, "Paylaod size", payload ? Buffer.byteLength(payload) : 0);
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
		var resp = "",
			id = change.data[entity.primaryKey[0]],
			url = resolveUrl(namespace, change),
			options = {
				host: config.rest.host,
				port: config.rest.port,
				method: "GET",
				path: url + "/" + id, //"(guid'" + id + "')",
				headers: {
					'Content-Type': 'application/json'
				}
			};

		return restClient.request(options, undefined, user)
			.then(function (data) {
				return data.length ? data[0] : undefined;
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
				console.error(err);
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
		function update() {

			return new Promise(function (resolve, reject) {
				var entity = noDbSchema[change.tableName],
					resp = "",
					payload = JSON.stringify(change.data),
					id = change.data[entity.primaryKey[0]], //TODO: Fix this milti-part primary key issue
					options = {
						host: config.rest.host,
						port: config.rest.port,
						method: "PUT",
						path: url + "(guid'" + id + "')",
						headers: {
							'content-type': 'application/json;odata=verbose',
							'Content-Length': payload.length
						}
					},
					req;

				//console.log(change.data);

				req = http.request(options, function (res) {
					res.setEncoding('utf8');
					res.on('data', function (chunk) {
						resp = resp + chunk;
					});

					res.on('end', function () {
						if(res.statusCode === 500 || res.statusCode === 400) {
							reject(res.statusMessage);
						} else {
							info(entity.entityName + " " + res.statusCode + " " + res.statusMessage);
							//log(entity.entityName + " statusCode: ", JSON.stringify(res));
							resolve();
						}
					});
				});

				req.on('error', reject);

				// write data to request body
				req.write(payload);
				req.end();

			});

		}

		return new Promise(function (resolve, reject) {
			log(JSON.stringify(change));
			restOne(change)
				.then(function (data) {
					change.before = data;
					return update();
				})
				.then(resolve)
				.catch(reject);
		});
	}
	this.update = restUpdate;

	function restDelete(user, change) {
		function destroy() {
			return new Promise(function (resolve, reject) {
				var entity = noDbSchema[change.tableName],
					resp = "",
					id = change.data[entity.primaryKey[0]],
					options = {
						host: config.rest.host,
						port: config.rest.port,
						method: "DELETE",
						path: url + "(guid'" + id + "')",
						headers: {
							'Content-Type': 'application/json'
						}
					},
					req = http.request(options, function (res) {
						res.setEncoding('utf8');

						res.on('data', function (chunk) {
							resp = resp + chunk;
						});

						res.on('end', function () {
							resolve();
						});
					});

				req.on('error', reject);

				// write data to request body
				//req.write(payload);
				req.end();

			});
		}

		return new Promise(function (resolve, reject) {
			restOne(change)
				.then(function (data) {
					change.before = data;
					return destroy();
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
