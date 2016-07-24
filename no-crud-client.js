function NoCRUDClient(ns) {
	var namespace = ns,
		restClient = namespace.rest,
		config = namespace.config;


	function restCreate(user, change) {
		var restCfg = namespace.config.rest,
			payload = JSON.stringify(change.data),
			options = {
				host: host,
				port: port,
				method: "POST",
				path: (restCfg.apiPrefix || "/") + change.tableName,
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': payload.length
				}
			};

		return rest.request(options);

	}
	this.create = restCreate;

	function restOne(user, change) {
		var entity = noDbSchema[change.tableName],
			resp = "",
			id = change.data[entity.primaryKey[0]],
			options = {
				host: config.rest.host,
				port: config.rest.port,
				method: "GET",
				path: "/odata/" + entity.entityName + "(guid'" + id + "')",
				headers: {
					'Authorization': 'Bearer ' + user.access_token,
					'Content-Type': 'application/json'
				}
			};

		return rest.request(options)
			.then(function (data) {
				return data.length ? data[0] : undefined;
			});

		// return new Promise(function (resolve, reject) {
		// 	req = http.request(options, function (res) {
		// 		log("restOne: " + change.tableName + "/" + id);
		// 		res.setEncoding('utf8');
		//
		// 		res.on('data', function (chunk) {
		// 			resp = resp + chunk;
		// 		});
		//
		// 		res.on('end', function () {
		// 			if(res.statusCode === 500) {
		// 				reject(res.statusMessage);
		// 			} else {
		// 				info(entity.entityName + " " + res.statusCode + " " + res.statusMessage);
		// 				//log(entity.entityName + " statusCode: ", JSON.stringify(res));
		// 				resolve(res.statusCode === 404 ? {} : JSON.parse(resp));
		// 			}
		//
		// 		});
		// 	});
		//
		// 	req.on('error', reject);
		//
		// 	// write data to request body
		// 	//req.write(payload);
		// 	req.end();
		//
		// });

	}
	this.one = restOne;

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
						path: "/odata/" + entity.entityName + "(guid'" + id + "')",
						headers: {
							'Authorization': 'Bearer ' + user.access_token,
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
						path: "/odata/" + entity.entityName + "(guid'" + id + "')",
						headers: {
							'Authorization': 'Bearer ' + user.access_token,
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

module.exports = function (host, port, namespace) {
	return new NoCRUDClient(host, port, namespace);
};
