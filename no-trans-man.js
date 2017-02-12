
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
			filter = namespaceName ? "?$filter=(namespace eq '" + namespaceName + "') and (state eq 'pending')&$orderby=timestamp desc"
				: "?$filter=state eq 'pending'&$orderby=timestamp desc",
			url = encodeURI(restCfg.changesUri + filter),
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
				console.error(err);
			})
			;

	}
	this.pendingTransactions = getPendingTransactions;

	function markTransactionState(transaction, state) {
		var data = transaction,
			restCfg = namespace.config.rest,
			options = {
				host: restCfg.host,
				port: restCfg.port,
				method: "PUT",
				path: restCfg.changesUri + "-metadata/" + transaction.ChangeID,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + namespace.jwt
				}
			},
			payload;

		data.state = state;

		payload = JSON.stringify(data);

		options = resolveContentTransferMethod(options, payload.length);

		console.log("markTransactionState", state, transaction.namespace, transaction.transactionId);

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
