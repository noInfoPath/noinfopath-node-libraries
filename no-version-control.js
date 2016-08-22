var Promise = require('es6-promise').Promise,
	restClient = require("./no-rest-client");

function NoVersionManager(namespaceCfg) {
	var namespace = namespaceCfg,
		rest = namespace.rest,
		crud = namespace.crud,
		CUD = {
			"C": crud.create,
			"U": crud.update,
			"D": crud.delete
		}, user;

	function _check() {
		console.log("check", !namespace.config.notSyncable);
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
		console.log(restCfg);
		if(!!restCfg.versionUri) {
			console.info(namespace.name + " Checking for change version");
			return namespace.rest.request(options);
		}else{
			return Promise.resolve({version: 0, changes: []});
		}
	}
	this.check = _check;

	function _getVersionedData(version) {
		var restCfg = namespace.config.rest,
			//filter = "?$filter=(startswith(ns, '" + version.namespace + "')) and (v gt " + version.lastSyncVersion + ")&$orderby=v",
			url = restCfg.changesUri + "/" + version.lastSyncVersion,
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "GET",
				path: url,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		;

		return namespace.rest.request(options)
			.then(function(data){
				console.log("_getVersionedData", data);

				return data;
			})
			.catch(function(err){
				console.error(err);
			})
			;
	}
	this.getDataByVersion = _getVersionedData;

	function _applyChange(change) {
		console.log("Change type: ", change.changeType);

		var op = CUD[change.changeType];

		return rest.authenticate()
			.then(function(user) {
				console.log("user", user.userId);
				return op(user, change);
			})
			.then(function (results) {
				console.log(namespace.name, results ? results.length : 0);
				return results;
			})
			.catch(function (err) {
				console.error(err);
			});
	}

	function _recurseChanges(changes, current, resolve, reject) {
		var change = changes[current++];

		if(change) {
			_applyChange(change)
				.then(_recurseChanges.bind(null, changes, current, resolve, reject))
				.catch(function(err){
					_recurseChanges(changes, current, resolve, reject);
				});
		}else{
			resolve();
		}


	}

	function _processTransaction(trans){
		var promises = [];

		console.log("Transaction ", trans.transactionId, " contains ", trans.changes.length, " changes.");

		return new Promise(_recurseChanges.bind(null, trans.changes, 0))
			.then(function(data){
				console.log("transaction processed.");
				namespace.trans.markProcessed(trans);
			})
			.catch(function(err){
				namespace.trans.markError(trans);
			});
	}

	function _recurseTransactions(transactions, current, resolve, reject) {
		var trans = transactions[current++];
		if(trans) {
			console.log("Processing transaction ", trans.transactionId);
			_processTransaction(trans)
				.then(function(){
					_recurseTransactions(transactions, current, resolve, reject);
				})
				.catch(function(err){
					console.error(err);
					_recurseTransactions(transactions, current, resolve, reject);
				});

		}else{
			resolve();
		}
	}

	function _processTransactions(transactions) {
		var promises = [];
		console.log(namespace.name, " has ", transactions.length, " pending transactions.");

		return new Promise(_recurseTransactions.bind(this, transactions, 0));
	}
	this.pushChanges = _processTransactions.bind(this);
}

module.exports = function (namespace) {
	return new NoVersionManager(namespace);
};