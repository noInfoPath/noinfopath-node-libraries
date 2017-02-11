
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
				path: restCfg.changesUri + "/" + transaction.ChangeID,
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

		// return new Promise(function(resolve, reject) {
		// 	MongoClient.connect(url)
		// 		.then(function(db) {
		// 			db.collection('changes')
		// 				.update({
		// 					_id: transaction._id
		// 				}, transaction)
		// 				.then(resolve)
		// 				.catch(reject)
		// 				.then(function() {
		// 					db.close();
		// 					console.info("markTransactionProcessed::dbclosed");
		// 				});
		// 		})
		// 		.catch(reject);
		// });
	}

	function markTransactionProcessed(transaction) {
		return markTransactionState(transaction, "processed");
	}
	this.markProcessed = markTransactionProcessed;

	function markTransactionError(transaction) {
		return markTransactionState(transaction, "error");
	}
	this.markError = markTransactionError;

// 	function processPendingTransactions(transactions) {
// 		log(transactions.length + " pending transactions found.");
//
// 		function applyChanges(transaction) {
//
// 			return new Promise(function(resolve, reject) {
// 				//Transaction may affect one or more rows in one or more tables.
// 				//All calls to the rest api must be executed in the order they
// 				//appear in the transaction's changes property.
// 				function recurse() {
// 					var change = transaction.changes.pop();
//
// 					if (change) {
// 						var op = CUD[change.changeType];
// 						console.info("calling CUD operation " + op.name + " on " + change.tableName);
// 						op(change)
// 							.then(recurse)
// 							.catch(function(err) {
// 								reject({
// 									error: err,
// 									data: change
// 								});
// 							});
// 					} else {
// 						resolve(transaction);
// 					}
// 				}
//
// 				recurse();
// 			});
// 		}
//
// 		return new Promise(function(resolve, reject) {
// 			var t = 0;
//
// 			function recurse() {
// 				var transaction = transactions[t++];
//
// 				if (!transaction) {
// 					resolve(true);
// 					return;
// 				}
//
// 				console.log(namespace.name, "Processing transaction " + t + ": \n\t TransactionId: " + transaction.transactionId + "\n\t originally occured @ " + (new Date(transaction.timestamp)).toISOString() + "\n\t by userId " + transaction.userId);
//
// 				applyChanges(transaction)
// 					.then(function() {
// 						return markTransactionProcessed(transaction);
// 					})
// 					.then(function() {
// 						if (t < transactions.length) {
// 							recurse();
// 						} else {
// 							resolve();
// 						}
// 					})
// 					.catch(function(err) {
// 						console.error("applyChanges");
// 						error(JSON.stringify(err));
// 						markTransactionError(transaction)
// 							.then(recurse)
// 							.catch(function(err) {
// 								console.error("applyChanges::markTransactionError");
// 								console.error(namespace.name, err);
// 								start();
// 							});
//
// 					});
// 			}
//
// 			if (transactions.length) {
// 				recurse();
// 			} else {
// 				resolve(true);
// 			}
// 		});
// 	}
}

module.exports = function (namespace, jwt) {
	return new NoTransactionManager(namespace, jwt);
};
