var MongoOplog = require('mongo-oplog');

function NoChangesMonitor(namespace, cb) {
	var oplog, ns = namespace, callback = cb;


	//console.log(Robe);
	//, ns.config

	this.run = function (cb) {
		console.log("NoChangesMonitor::run");
		var oplog = MongoOplog(ns.config.noChanges).tail(function () {
			console.log("NoChangesMonitor::tailing");

		});

		oplog.on('op', function (cb, data) {
			console.log("NoChangesMonitor::op", arguments);
			cb({
				namespace: namespace.name,
				version: data.ts.toNumber()
			});
		}.bind(null, cb));

		oplog.on('error', function (error) {
			console.log("NoChangesMonitor::error", error);
		});

		oplog.on('end', function () {
			console.log('NoChangesMonitor::Stream ended');
		});

		oplog.stop(function () {
			console.log('NoChangesMonitor::server stopped');
		});
	}.bind(null, callback);

}

module.exports = function (namespace, cb) {
	console.log("Initializing NoChangesMonitor");
	var monitor = new NoChangesMonitor(namespace, cb);
	monitor.run();
	return monitor;
};
