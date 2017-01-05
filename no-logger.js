function NoLogger(c) {
	var config = c,
		intercept = require("intercept-stdout"),
		bunyan = require('bunyan'),
		logger = new bunyan(config.logging.bunyan),
		colors = require('colors/safe')
		;

	function prefix(d) {
		var t = d ? new Date(d) : new Date();
		return "[" + config.logging.name + " " + t.toISOString() + "] ";
	}

	function message(m) {
		return prefix() + m;
	}

	function handleError(txt) {
		var m = message(txt);
		if(config.logging.bunyan.enabled) logger.error(m);
		return colors.red(m);
	}

	function handleOthers(txt){
		var m = message(txt);
		if(config.logging.bunyan.enabled) logger.info(m);
		return m;
	}
	var unhook_intercept = intercept(handleOthers, handleError);

}

module.exports = function(config) {
	if(!config.logging.bunyan.enabled) console.warn("WARNING: Bunyan is disabled");
	return new NoLogger(config);
};
