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

function NoLoggerMongoDb(c) {
	var config = c,
		intercept = require("intercept-stdout"),
		bunyan = require('bunyan'),
		//colors = require('colors/safe'),
		mongoose = require('mongoose'),
		logger, LogEntryModel, LogEntryStream, db, unhook_intercept;

	mongoose.Promise = require('es6-promise').Promise;
	mongoose.connect(config.logging.mongo, {
		server: {
			reconnectTries: 100000,
			reconnectInterval: 15000
		}
	});


	/**
	 * The schema of the log entry
	 * @type {Mongoose.Schema}
	 */
	var LogEntrySchema = new mongoose.Schema({
	    msg: {
	        type: String,
	        required: true
	    },
	    level: {
	        type: Number,
	        required: true
	    },
	    name: {
	        type: String,
	        required: true
	    },
	    time: {
	        type: Date,
	        required: true
	    },
	    res : {
	        type: Object
	    },
	    req : {
	        type: Object
	    }
	});

	LogEntryModel = mongoose.model('log', LogEntrySchema);

	LogEntryStream = require('bunyan-mongodb-stream')({model: LogEntryModel});

	db = mongoose.connection;

	db.on('error', function(err){
		console.error("Failed to connect to MongoDB for loggin. will try in 15 seconds", err.message);
	});

	db.once('open', function() {
		console.log("noLogger conntected to MongoDB");
		config.logging.bunyan.streams.push({ stream: LogEntryStream});

		config.logging.bunyan.serializers = bunyan.stdSerializers;

		logger = new bunyan(config.logging.bunyan);

		unhook_intercept = intercept(handleOthers, handleError);

		if(!config.logging.bunyan.enabled) console.warn("WARNING: Bunyan is disabled");

	});


	function prefix(d) {
		var t = d ? new Date(d) : new Date();
		return "[" + config.logging.name + " " + t.toISOString() + "] ";
	}

	function message(m) {
		return prefix() + m;
	}

	function handleError(txt) {
		var m = message(txt);
		if(config.logging.bunyan.enabled) logger.error(txt);
		return m;
	}

	function handleOthers(txt){
		var m = message(txt);
		if(config.logging.bunyan.enabled) logger.info(txt);
		return m;
	}

}

module.exports = function(config) {
	var fs = require("fs");

	if(!fs.existsSync("./logs")) fs.mkdirSync("./logs");

	return config.logging.mongo ? new NoLoggerMongoDb(config) : new NoLogger(config);
};
