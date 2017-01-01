var colors = require('colors/safe');

function NoRemoteChangeMonitor(namespace, cb) {
	var ns = namespace,
		callback = cb,
		timeLoop = 0,
		oneSecond = 1000,
		maxLoops = 10;

	function _getRemoteDatabaseVersion() {
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
					callback(data);
				})
				.catch(function(err){
					console.error(err);
					throw err;
				});
	}

	function _timeout() {

		var nextTimeout = Math.trunc(Math.exp(++timeLoop)) * 1000;
		console.info(colors.white.dim("RemoteChaneMonitor for "), colors.white.dim(ns.name), colors.white.dim("is in timeloop"), colors.white.dim((timeLoop-1)), colors.white.dim(", next loop in"), colors.white.dim(nextTimeout / 1000), colors.white.dim("seconds"));
		if(timeLoop>maxLoops) timeLoop = 1

		//do stuff.
		_getRemoteDatabaseVersion()
			.then(function(){
				setTimeout(_timeout, nextTimeout);
			})
			.catch(function(err){
				console.error(err);
			})
	}

	this.run = function (cb) {
		console.log("NoRemoteChangeMonitor::run", ns.name);
		setTimeout(_timeout, oneSecond);

	}.bind(null, callback);

}

module.exports = function (namespace, cb) {
	console.log("Initializing NoRemoteChangeMonitor for", namespace.name);
	var monitor = new NoRemoteChangeMonitor(namespace, cb);
	monitor.run();
	return monitor;
};
