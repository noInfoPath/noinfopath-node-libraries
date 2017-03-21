/*
*	# noinfopath-node-libraries
*
*	@version 2.0.20
*
*	## NoLogger
*
*	## NoLoggerMongoDb
*
*	## NoChangesMonitor
*	
*	## NoRemoteChangeMonitor
*
*	## NoCRUDClient
*
*	## NoREST
*
*	## NoTransactionManager
*
*	## NoVersionManager
*/

var logging = require("./no-logger"),
	crud = require("./no-crud-client"),
	rest = require("./no-rest-client"),
	trans = require("./no-trans-man"),
	version = require("./no-version-control"),
	changes = require("./no-changes"),
	remote = require("./no-remote");

module.exports = {
	logging: logging,
	crudClient: crud,
	restClient: rest,
	transactionManager: trans,
	versionManager: version,
	nativeChangeMonitor: changes,
	remoteChangeMonitor: remote
};
