module.exports = function(RED) {

  function LogIOLoggerNode(config) {
    const wLogger = require('./lib/winstonLogger');
    RED.nodes.createNode(this, config);
    this.config = config;
    this.logger = wLogger({...this, RED });
    this.log = (...args) => this.logger.log(...args)
    this.close = (...args) => this.logger.close(...args)
  }

  RED.nodes.registerType("logIO-logger", LogIOLoggerNode, {
    credentials: {
      elkUsername: { type: "text" },
      elkPassword: { type: "password" },
    }
  });
}
