const { getTimestamp } = require('../utils');
const winston = require('winston');
const safeJSONStringify = require('json-stringify-safe');
require('winston-elasticsearch');

module.exports = function (ctx) {
  const esTransport = new winston.transports.Elasticsearch({
    clientOpts: {
      node: ctx.config.elkUrl,
      auth: {
        username: ctx.credentials.elkUsername,
        password: ctx.credentials.elkPassword
      },
      ssl: {
        rejectUnauthorized: false
      }
    },
    index: ctx.config.elkIndex,
    //indexSuffixPattern: 'YYYY.MM.DD',
    source: 'node-red',
    transformer: (logData) => {
      const transformed = {
        '@timestamp': getTimestamp({ utc: ctx.config.isTimestampUTC }),
        message: safeJSONStringify(logData.message || ''),
        severity: logData.level,
        level: logData.level,
        meta: {
          ...logData.meta?.meta,
        }
      };

      if (logData.meta['transaction.id']) transformed.transaction = { id: logData.meta['transaction.id'] };
      if (logData.meta['trace.id']) transformed.trace = { id: logData.meta['trace.id'] };
      if (logData.meta['span.id']) transformed.span = { id: logData.meta['span.id'] };

      return transformed;
    },
  });

  esTransport.on('error', (error) => {
    console.error('Error in esTransport caught', error);
  });

  return esTransport;
}
