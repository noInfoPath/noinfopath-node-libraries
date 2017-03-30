var Promise = require('es6-promise').Promise,
	restClient = require("./no-rest-client");

function NoVersionManager(namespaceCfg, tm) {

	var namespace = namespaceCfg,
		transMan = tm,
		rest = namespace.rest,
		crud = namespace.crud,
		CUD = {
			"C": crud.create,
			"U": crud.update,
			"D": crud.delete
		}, user;

	function _check() {
		//console.log("check", !namespace.config.notSyncable);
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
		//console.log(restCfg);
		if(!!restCfg.versionUri) {
			//console.info(namespace.name + " Checking for change version");
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
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + version.jwt
				}
			}
		;

		//console.log("XXXX", options);

		//console.log("version.jwt", version.jwt);
		return namespace.rest.request(options)
			.then(function(data){
				//console.log(data);
				if(data.changes.length) console.info("Versioned Data Received: Version", data.version, ", contains", data.changes.length, "changes");

				return data;
			})
			.catch(function(err){
				console.error(err);
			})
			;
	}
	this.getDataByVersion = _getVersionedData;

	function _applyChange(trans, change) {
		console.info("Applying Change: ", change.changeType, change.namespace, change.tableName);

		var op = CUD[change.changeType];

		//return rest.authenticate()
		//	.then(function(user) {
				//console.log("user", user.userId);
			//})
		return op({jwt: trans.jwt}, change)
			.then(function (results) {
				//console.info("Change applied to: ", namespace.name, results ? results.length : 0);
				return results;
			})
			.catch(function (err) {
				throw {error: err, change: change};
			});
	}

	function _recurseChanges(trans, current, resolve, reject) {
		var change = trans.changes[--current];
		if(change) {
			_applyChange(trans, change)
				.then(_recurseChanges.bind(this, trans, current, resolve, reject))
				.catch(function(err){
					console.error("Error Occured Applying Change:", err);
					reject(err);
					//_recurseChanges.call(this, trans, current, resolve, reject);
				});
		}else{
			resolve();
		}

	}

	function _processTransaction(metadata, trans){
		var promises = [];

		console.info(trans.namespace, "Transaction ", trans.transactionId, " contains ", trans.changes.length, " changes.");

		return new Promise(_recurseChanges.bind(this, trans, trans.changes.length))
			.then(function(data){
				namespace.trans.markProcessed(metadata);
			})
			.catch(function(err){
				//console.error("Error occured processing transaction", err);
				metadata.error = err;
				namespace.trans.markError(metadata);
			});
	}

	function _recurseTransactions(transactions, current, resolve, reject) {
		try{
			var trans = transactions[current++];
			if(trans) {
				//console.log("Processing transaction ", trans.metadata.transactionId);

				transMan.getTransactionObject(trans)
					.then(_processTransaction.bind(null, trans))
					.then(function(){
						_recurseTransactions(transactions, current, resolve, reject);
					})
					.catch(function(err){
						console.error("_recurseTransactions error", err);
						_recurseTransactions(transactions, current, resolve, reject);
					});

			}else{
				resolve(current - 1);
			}
		} catch(err) {
			console.error(err);
		}

	}


	function _processTransactions(transactions) {
		var promises = [];
		//console.log("_processTransactions", namespace.name, " has ", transactions.length, " pending transactions.");
		return new Promise(_recurseTransactions.bind(this, transactions, 0));
	}
	this.pushChanges = _processTransactions;
}

module.exports = function (namespace, tm) {
	return new NoVersionManager(namespace, tm);
};
