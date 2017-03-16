var Promise = require('es6-promise').Promise;
	//colors = require('colors/safe');

function NoRemoteChangeMonitor(namespace, cb, errCb) {
	var ns = namespace,
		callback = cb,
		errorCb = errCb,
		timeLoop = 0,
		oneSecond = 1000,
		maxLoops = 3,
		lastVersion = {namespace: ns.name, version: 0};

	function _getRemoteDatabaseVersion() {
		console.log(ns.config.rest.versionUri);
		var url = ns.config.rest.versionUri,
			options = {
				host: ns.config.rest.host,
				port: ns.config.rest.port,
				method: "GET",
				path: url,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + ns.msjwt
				}
			},
			user = {
				"jwt": ns.msjwt
			};

			return ns.rest.request(options, undefined, user)
				.then(function (data) {
					data.namespace = ns.name;
					console.info("Change update received:", "Last Version", lastVersion, "Current Version", data);
					lastVersion.version = data.version;
					return data;
				});
	}


	function run(cb, errCb) {
		//var nextTimeout = Math.trunc(Math.exp(++timeLoop)) * 1000;
		console.info("RemoteChangeMonitor: checking for change at", ns.name); //, colors.white.dim("is in timeloop"), colors.white.dim((timeLoop-1)), colors.white.dim(", next loop in"), colors.white.dim(nextTimeout / 1000), colors.white.dim("seconds"));
		//if(timeLoop>maxLoops) timeLoop = 0

		//do stuff.
		return _getRemoteDatabaseVersion()
			.then(callback)
			.catch(errorCb);

	}
	this.run = run.bind(null, callback, errCb);
}

module.exports = function (namespace, cb, errCb) {
	console.log("Initializing NoRemoteChangeMonitor for", namespace.name);
	var monitor = new NoRemoteChangeMonitor(namespace, cb);
	//monitor.run();
	return monitor;
};
