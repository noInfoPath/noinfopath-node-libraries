var Promise = require('es6-promise').Promise,
	restClient = require("./no-rest-client");

function NoVersionManager(namespaceCfg) {
	var namespace = namespaceCfg;

	function _check() {
		if(namespace.config.notSyncable) return Promise.resolve({version: 0, changes: []});
		var restCfg = namespace.config.rest,
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "GET",
				path: restCfg.versionUri,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		;

		if(!!restCfg.versionUri) {
			console.info(namespace.name + " Checking for change version");
			return namespace.rest.request(options);
		}else{
			return Promise.resolve({version: 0, changes: []});
		}
	}
	this.check = _check;

	function _applyChange(change) {
		console.log(change);
		var CUD = {
				"C": restClient.restCreate,
				"U": restClient.restUpdate,
				"D": restClient.delete
			},
			op = CUD[change.changeType];

		return op(change);
	}

	function _applyChanges(changes) {
		var promises = [];
		console.log("changes", this);

		for(var c = 0; c < changes.length; c++) {
			var change = changes[c];
			console.log(change);
			//promises.push(_applyChange(change));
		}

		return Promises.all(promises);//This may not work. May need to reverse the order.
	}
	this.applyChanges = _applyChanges.bind(this);
}

module.exports = function (namespace) {
	return new NoVersionManager(namespace);
};
