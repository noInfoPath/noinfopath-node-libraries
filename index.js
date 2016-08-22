var logging = require("./no-logger"),
	crud = require("./no-crud-client"),
	rest = require("./no-rest-client"),
	trans = require("./no-trans-man"),
	version = require("./no-version-control");
	changes = require("./no-changes");

module.exports = {
	logging: logging,
	crudClient: crud,
	restClient: rest,
	transactionManager: trans,
	versionManager: version,
	changeMonitor: changes
};
