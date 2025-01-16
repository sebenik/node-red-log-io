const dayjs = require('dayjs');
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

module.exports = {
  getTimestamp: ({ utc = false} = {}) => utc
    ? dayjs.utc().format()
    : dayjs.utc().local().format(),
};
