
function NoTransactionManager(namespaceCfg, jwt) {
	var namespace = namespaceCfg;

	function resolveContentTransferMethod(options, l) {

		if(l > 4000) {
			options.headers['Transfer-Encoding'] = 'chunked';
		} else {
			options.headers['Content-Length'] = l;
		}

		return options;
	}

	function _savePendingTransactions(transaction){
		transaction.changeCount = transaction.changes.length;

		var restCfg = namespace.config.rest,
			payload = JSON.stringify(transaction),
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "POST",
				path: restCfg.changesUri,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': "Bearer "  + namespace.jwt
				}
			};

		options = resolveContentTransferMethod(options, payload.length);

		return namespace.rest.request(options, payload);
	}
	this.savePending = _savePendingTransactions;

	function getPendingTransactions(namespaceName) {
		//if(namespace.config.notSyncable) return;
		console.info(namespace.name, " checking pending transactions for " + namespaceName);
		var restCfg = namespace.config.rest,
			filter = namespaceName ? "?$filter=(metadata_namespace eq '" + namespaceName + "') and (metadata_state eq 'pending')&$orderby=timestamp desc"
				: "?$filter=metadata_state eq 'pending'&$orderby=timestamp desc",
			url = encodeURI(restCfg.changesUri + "-metadata" + filter),
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "GET",
				path: url,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': "Bearer "  + namespace.jwt
				}
			}
		;

		return namespace.rest.request(options)
			.then(function(data){
				return data;
			})
			.catch(function(err){
				return err;
			})
			;

	}
	this.pendingTransactions = getPendingTransactions;


	function _getTransactionObject(metadata) {
		var restCfg = namespace.config.rest,
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "GET",
				path: restCfg.changesUri + '/' + metadata.metadata.ChangeID,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': "Bearer "  + namespace.jwt,
					'Transfer-Encoding': 'chunked'
				}
			};

		return namespace.rest.request(options)
			.then(function(data){
				return data;
			});
	}
	this.getTransactionObject = _getTransactionObject;

	function markTransactionState(transaction, state) {
		//console.log("markTransactionState", state, transaction.metadata.ChangeID);
		var data = transaction,
			restCfg = namespace.config.rest,
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "PUT",
				path: restCfg.changesUri + "-metadata/" + transaction.metadata.ChangeID,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + namespace.jwt
				}
			},
			payload;

		data.metadata.state = state;

		payload = JSON.stringify(data);

		options = resolveContentTransferMethod(options, payload.length);

		console.log("markTransactionState", state, transaction.metadata.namespace, transaction.metadata.transactionId);

		return namespace.rest.request(options, payload);
	}

	function markTransactionProcessed(transaction) {
		return markTransactionState(transaction, "processed");
	}
	this.markProcessed = markTransactionProcessed;

	function markTransactionError(transaction) {
		return markTransactionState(transaction, "error");
	}
	this.markError = markTransactionError;

}

module.exports = function (namespace, jwt) {
	return new NoTransactionManager(namespace, jwt);
};
