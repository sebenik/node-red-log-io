const winston = require('winston');
const { lineFormat } = require('./formats');

module.exports = function(ctx) {
  const transports = [];
  ctx.config.logOutput.split(',').forEach((lo) => {
    try {
      let t = require(`./transports/${lo}`);
      transports.push(t(ctx));
    } catch (error) {
      console.log(error);
    }
  });

  const logger = new winston.createLogger({
    level: ctx.config.logLevel,
    transports,
    exceptionHandlers: [new (winston.transports.Console)({ format: lineFormat() })],
    rejectionHandlers: [new (winston.transports.Console)({ format: lineFormat() })],
    exitOnError: false
  });

  logger.on('error', (error) => {
    ctx.node.handleLoggerUpdate?.({ setError: true });
    ctx.node.error(error);
    console.error(error);
  });

  return logger;
}
