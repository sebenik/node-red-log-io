module.exports = function(RED) {

  function LogIOLoggerNode(config) {
    RED.nodes.createNode(this, config);
    const hash = require('object-hash');
    const wLogger = require('./lib/winstonLogger');
    const isFileOutput = config.logOutput.split(',').includes('file');
    const loggerInstances = new Map();
    const node = this;
    let primaryLogger;
    this.config = config;
    this.isError = false;

    this.log = (...args) => {
      if (node.isError) {
        node.isError = false;
        node.handleLoggerUpdate();
      }
      const _o = args[2]._o;
      const logger = getLoggerInstance(config, _o);
      return logger.log(...args);
    }

    this.close = (...args) => {
      primaryLogger?.close(...args);
      primaryLogger = null;
      loggerInstances.forEach((logger) => logger.close(...args));
      loggerInstances.clear();
    }

    this.handleLoggerUpdate =({ setError = false } = {}) => {
      node.isError = setError;
      const nodesUsingThisLogger = node.config?._users || [];
      nodesUsingThisLogger.forEach((node) => {
        RED.nodes.getNode(node)?.handleLoggerUpdate?.();
      });
    }

    function getLoggerInstance(config, options) {
      if (!options?._logIO_) {
        return primaryLogger || wLogger({ config, RED, node });
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
      const logger = wLogger({ config: cConfig, RED, node });
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
