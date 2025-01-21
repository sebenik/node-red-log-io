module.exports = function(RED) {

  function LogIOLoggerNode(config) {
    RED.nodes.createNode(this, config);
    const hash = require('object-hash');
    const wLogger = require('./lib/winstonLogger');
    const primaryLogger = wLogger({ config, RED });
    const isFileOutput = config.logOutput.split(',').includes('file');
    const loggerInstances = new Map();

    this.config = config;

    this.log = (...args) => {
      const _o = args[2]._o;
      const logger = getLoggerInstance(config, _o);
      return logger.log(...args);
    }

    this.close = (...args) => {
      primaryLogger.close(...args);
      loggerInstances.forEach((logger) => logger.close(...args));
      loggerInstances.clear();
    }

    function getLoggerInstance(config, options) {
      if (!options?._logIO_) {
        return primaryLogger;
      }
      const dynamicConfiguration = options._logIO_;
      const cConfig = {
        ...JSON.parse(JSON.stringify(config)),
        ...(isFileOutput && dynamicConfiguration.fileName) && { fileFileName: dynamicConfiguration.fileName }, 
        ...(isFileOutput && dynamicConfiguration.dirName) && { fileDirName: dynamicConfiguration.dirName }, 
      }

      const loggerKey = hash(cConfig, { algorithm: 'md5' });
      if (loggerInstances.has(loggerKey)) {
        return loggerInstances.get(loggerKey);
      }
      const logger = wLogger({ config: cConfig, RED });
      loggerInstances.set(loggerKey, logger);
      return logger;
    }
  }

  RED.nodes.registerType("logIO-logger", LogIOLoggerNode, {
    credentials: {
      elkUsername: { type: "text" },
      elkPassword: { type: "password" },
    }
  });
}
