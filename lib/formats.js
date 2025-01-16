const winston = require('winston');
const safeJSONStringify = require('json-stringify-safe');
const { getTimestamp } = require('./utils');

const lineFormat = function ({ isTimestampUTC = false } = {}) {
  return winston.format.printf(({ level, message, ...metadata }) => {
    let msg = `${getTimestamp({ utc: isTimestampUTC })} [${level}] ${safeJSONStringify(message)}`;
    if (metadata?.meta && Object.entries(metadata.meta).length > 0) {
      msg += ` ${safeJSONStringify(metadata.meta)}`;
    }
    return msg;
  });
};

const lineColoredFormat = function ({ isTimestampUTC = false } = {}) {
  return winston.format.combine(
    winston.format.colorize({ level: true }),
    lineFormat({ isTimestampUTC }),
  )
};

const jsonFormat = function ({ isTimestampUTC = false } = {}) {
  return winston.format.combine(
    winston.format((info) => {
      info.timestamp = getTimestamp({ utc: isTimestampUTC });
      delete info?._o;
      return info;
    })(),
    winston.format.json(),
  )
};

module.exports = { lineFormat, lineColoredFormat, jsonFormat }
