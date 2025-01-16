const winston = require('winston');
const { lineColoredFormat, jsonFormat } = require('../formats');

module.exports = function (ctx) {
  const config = ctx.config;
  return new winston.transports.Console({
    level: config.logLevel,
    format: (config.consoleIsJsonFormat
      ? jsonFormat
      : lineColoredFormat)({ isTimestampUTC: config.isTimestampUTC }),
  });
}
