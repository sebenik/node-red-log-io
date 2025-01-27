const wLogger = require('./winstonLogger');

module.exports = class DefaultLogger {
  constructor(RED) {
    this.RED = RED;
    this.isFileOutput = false;
    this.config = {
      logLevel: 'debug',
      logMeta: 'none',
      logMetaOptions: '',
      logOutput: 'nr-debugger',
    };
    this.primaryLogger = wLogger({ config: this.config, RED });
    this.isError = false;
  }

  close(...args) {
    this.primaryLogger?.close(...args);
    this.primaryLogger = null;
  }

  log(...args) {
    if (this.isError) {
      this.isError = false;
      this.handleLoggerUpdate();
    }
    return this.primaryLogger.log(...args);
  }

  handleLoggerUpdate({ setError = false } = {}) {
    this.isError = setError;
    const nodesUsingThisLogger = this.config?._users || [];
    nodesUsingThisLogger.forEach((node) => {
      this.RED.nodes.getNode(node)?.handleLoggerUpdate?.();
    });
  }
};
