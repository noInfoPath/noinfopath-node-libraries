var Robe = require('robe');
function NoChangesMonitor(namespace) {
	var db, oplog,
		ns = namespace;


	//console.log(Robe);


	this.run = function() {
		console.log("run", ns);
		//db = Robe.connect(ns.config);

		//console.log("NoChangesMonitor", db);
		//   	// get the oplog
		//   	oplog = yield db.oplog();
		//
		// // start it
		// yield oplog.start();

		// listen for any operation on any collection
		// oplog.onAny(function(collectionName, operationType, data, metaData) {
		//   console.log(collectionName, operationType, data, metaData);
		// });
	};
}

module.exports = function(namespace) {
	console.log("Initializing NoChangesMonitor", namespace);
	var monitor = new NoChangesMonitor(namespace);
	monitor.run();
	return monitor;
};
