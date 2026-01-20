const WinstonDailyRotateFile = require('@zigasebenik/winston-daily-rotate-file');
const { lineFormat, jsonFormat } = require('../formats');

module.exports = function (ctx) {
  const filename = ctx.config.fileFileName || 'logIO-%DATE%.log';
  const fileTransport = new WinstonDailyRotateFile({
    level: ctx.config.logLevel,
    filename,
    dirname: ctx.config.fileDirName || '.',
    datePattern: filename.includes('%DATE%') ? ctx.config.fileDatePattern : "[]",
    zippedArchive: ctx.config.fileZippedArchive,
    maxSize: `${ctx.config.fileMaxSize}${ctx.config.fileMaxSizeUnit}`,
    maxFiles: `${ctx.config.fileMaxFiles}${ctx.config.fileMaxFilesUnit}`,
    format: (ctx.config.fileIsJsonFormat ? jsonFormat : lineFormat)({ isTimestampUTC: ctx.config.isTimestampUTC }),
    utc: ctx.config.isTimestampUTC,
    watchLog: true,
  });

  return fileTransport;
}
