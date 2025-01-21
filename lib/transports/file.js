const winston = require('winston');
require('@zigasebenik/winston-daily-rotate-file');
const { lineFormat, jsonFormat } = require('../formats');

module.exports = function (ctx) {
  const fileTransport = new winston.transports.DailyRotateFile({
    level: ctx.config.logLevel,
    filename: ctx.config.fileFileName || 'logIO-%DATE%.log',
    dirname: ctx.config.fileDirName || '.',
    datePattern: ctx.config.fileDatePattern,
    zippedArchive: ctx.config.fileZippedArchive,
    maxSize: `${ctx.config.fileMaxSize}${ctx.config.fileMaxSizeUnit}`,
    maxFiles: `${ctx.config.fileMaxFiles}${ctx.config.fileMaxFilesUnit}`,
    format: (ctx.config.fileIsJsonFormat ? jsonFormat : lineFormat)({ isTimestampUTC: ctx.config.isTimestampUTC }),
    watchLog: true,
  });

  fileTransport.on('error', (error) => {
    console.error(error);
  });

  return fileTransport;
}
