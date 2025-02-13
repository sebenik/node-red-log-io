const winston = require('winston');

module.exports = function (ctx) {
  class NodeRedTransport extends winston.Transport {
    log(info, cb) {
      const sourceNode = info._o.sourceNode;
      if (!sourceNode) { return; }
      const msg = ctx.RED.util.encodeObject({
        id: sourceNode.id,
        z: sourceNode.z,
        _alias: sourceNode._alias,
        path: sourceNode._flow.path,
        name: sourceNode.name,
        topic: info.message.topic,
        msg: info.message,
      }, {
        maxLength: ctx.RED.settings.debugMaxLength || 1000
      });

      ctx.RED.comms.publish('debug', msg);
      cb && setImmediate(cb);
    }
  };

  return new NodeRedTransport();
}
