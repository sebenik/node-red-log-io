const {
  getAllNodes,
  getAllWiredNodes,
  getNodesInSameGroup,
  logLevelStatusColors,
} = require('./lib/utils');
const DefaultLogger = require('./lib/defaultLogger');

module.exports = function (RED) {
  function LogIONode(config) {
    RED.nodes.createNode(this, config);

    this.numOfLoggedMessages = 0;
    this.autoStart = config.autoStart;
    this.logIOMode = config.logIOMode;
    this.active = config.active;
    this.observedNodeIds = null;
    this.logger = null;
    this.logMeta = '';
    this.logMetaOptions = [];
    this.logToNrDebugger = false;
    this.config = config;
    this.logLevelOptions = ['error', 'warn', 'info', 'debug'];
    this.logIOScope = this.logIOMode === 'inline'
      ? 'I'
      : (config.logIOScope || 'I');

    const node = this;

    function getAdditionalMessageData(eventName, msg, sourceNode) {
      const m = {};
      const lmAll = node.logMeta === 'all';
      if (node.logMeta !== 'none') {
        m.meta = {
          ...(lmAll || node.logMetaOptions.includes('_msgid')) && { _msgid: msg?._msgid },
          ...(lmAll || node.logMetaOptions.includes('eventName')) && { eventName },
          ...(lmAll || node.logMetaOptions.includes('loggerNodeId')) && { loggerNodeId: node.id },
          ...(lmAll || node.logMetaOptions.includes('sourceNodeId')) && { sourceNodeId: sourceNode.id },
          ...(lmAll || node.logMetaOptions.includes('sourceNodeName')) && { sourceNodeName: sourceNode.name },
          ...(lmAll || node.logMetaOptions.includes('sourceNodeType')) && { sourceNodeType: sourceNode.type },
        }
      }
      m._o = {
        ...(node.logToNrDebugger) && { sourceNode },
        ...(msg._logIO_ && typeof msg._logIO_ === 'object') && { _logIO_: msg._logIO_ },
      }
      return m;
    }

    function handleMsgEvent(eventName, msg, sourceNodeId) {
      try {
        const sourceNode = RED.nodes.getNode(sourceNodeId);
        if (!sourceNode || (sourceNode.type === 'logIO' && sourceNode.id !== node.id)) {
          return;
        }

        const message = node.config.targetType !== 'full'
          ? RED.util.getMessageProperty(msg, node.config.complete)
          : msg;

        if (typeof message === 'undefined') { return; }

        let logLevel = node.logger.config.logLevel;
        const msgLogLevel = msg?._logIO_?.logLevel;
        if (msgLogLevel) {
          if (!node.logLevelOptions.includes(msgLogLevel)) {
            const warnMsg = `[logIO] logLevel '${msgLogLevel}' is not valid, replacing it with '${logLevel}'.`;
            node.warn(warnMsg)
            console.warn(warnMsg);
          } else {
            logLevel = msgLogLevel;
          }
        }

        node.logger.log(logLevel, message, getAdditionalMessageData(eventName, msg, sourceNode));

        node.numOfLoggedMessages++;
        node.setNodeStatus();
      } catch (err) {
        const errMsg = `[logIO] Unexpected error while logging messages: ${err}`;
        node.warn(errMsg)
        console.warn(errMsg);
      }
    }

    function handleOutputEvent(sendEvents) {
      sendEvents.forEach((sendEvent) => {
        if (node.active && node.observedNodeIds.has(sendEvent.source.node.id)) {
          const message = RED.util.cloneMessage(sendEvent.msg);
          handleMsgEvent('OUTPUT', message, sendEvent.source.node.id);
        }
      });
    }

    function handleInputEvent(receiveEvent) {
      if (node.active && node.observedNodeIds.has(receiveEvent.destination.node.id)) {
        const message = RED.util.cloneMessage(receiveEvent.msg);
        handleMsgEvent('INPUT', message, receiveEvent.destination.node.id);
      }
    }

    function activate() {
      node.isActivated = true;

      if (node.logIOScope.includes('O')) {
        RED.hooks.add(`onSend.msg-logIO-${node.id}`, handleOutputEvent);
      }

      if (node.logIOScope.includes('I')) {
        RED.hooks.add(`onReceive.msg-logIO-${node.id}`, handleInputEvent);
      }

      node.setNodeStatus();
    }

    function deactivate() {
      node.isActivated = false;
      RED.hooks.remove(`*.msg-logIO-${node.id}`);
      node.setNodeStatus();
    }

    function getNodeStatusFill(logLevel) {
      if (node.logger?.isError) {
        return 'red';
      }
      if (!(node.active && node.isActivated)) {
        return 'gray';
      }
      return logLevelStatusColors.get(logLevel) || 'gray';
    }

    function getNodeStatusShape() {
      return node.logger?.isError ? 'dot' : 'ring';
    }

    function getNodeStatusText(logLevel) {
      if (node.logger?.isError) {
        return 'Logger error! Please check logs.';
      }
      return (node.active && node.isActivated)
        ? `Level: ${logLevel} | Mode: ${node.logIOMode} | #: ${node.numOfLoggedMessages}`
        : 'Logging paused';
    }

    function init() {
      node.logger = RED.nodes.getNode(config.logger);
      if (!node.logger) {
        node.logger = new DefaultLogger(RED);
      }

      node.logMeta = node.logger.config.logMeta;
      node.logMetaOptions = node.logger.config.logMetaOptions.split(',');
      node.logToNrDebugger = node.logger.config.logOutput.split(',').includes('nr-debugger');
      node.observedNodeIds = node.getObservedNodeIds(node.logIOMode);

      node.autoStart && activate();
      node.setNodeStatus();
    }

    node.setNodeStatus = function() {
      const logLevel = node.logger?.config.logLevel;
      node.status({
        fill: getNodeStatusFill(logLevel),
        shape: getNodeStatusShape(),
        text: getNodeStatusText(logLevel),
      });
    }

    node.handleLoggerUpdate = function() {
      node.setNodeStatus();
    }

    node.getObservedNodeIds = function(logIOMode) {
      switch (logIOMode) {
        case 'inline':
          return new Set([node.id]);
        case 'wired':
          return getAllWiredNodes(RED, node);
        case 'group':
          return getNodesInSameGroup(RED, node);
        case 'flow':
          return new Set(Object.keys(node._flow.activeNodes));
        case 'select':
          return new Set(config.scope || []);
        case 'all':
          return getAllNodes(RED);
        default:
          return new Set([]);
      }
    }

    node.on('input', function (msg) {
      if (!node.active || !msg._logIO_ || typeof msg._logIO_.activate !== "boolean") {
        return node.send(msg);
      }

      if (msg._logIO_.activate && !node.isActivated) {
        handleMsgEvent('INPUT', msg, node.id);
        activate();
      } else if (!msg._logIO_.activate && node.isActivated) {
        deactivate();
      } else if (msg._logIO_.activate && node.isActivated) {
        node.warn('[logIO] logging is already active')
      } else {
        node.warn('[logIO] logging is not active');
      }

      node.send(msg);
    });

    node.on('close', function () {
      deactivate();
      this.logger?.close();
    });

    setImmediate(init);
  }

  RED.nodes.registerType('logIO', LogIONode);

  RED.httpAdmin.post("/logIO/:state", RED.auth.needsPermission("debug.write"), function (req, res) {
    const state = req.params.state;
    const isStateEnable = state === 'enable';
    const nodes = req?.body?.nodes;
    if (!['enable', 'disable'].includes(state) || !Array.isArray(nodes)) {
      res.sendStatus(404);
      return;
    }
    nodes.forEach(function (id) {
      const node = RED.nodes.getNode(id);
      if (!node) { return; }
      node.active = isStateEnable;
      node.setNodeStatus();
    })
    res.sendStatus(isStateEnable ? 200 : 201);
  });

  RED.httpAdmin.post("/logIO/:id/:state", RED.auth.needsPermission("debug.write"), function (req, res) {
    const state = req.params.state;
    const node = RED.nodes.getNode(req.params.id);
    if (!['enable', 'disable'].includes(state) || !node) {
      return res.sendStatus(404);
    }
    const isStateEnable = state === 'enable';
    node.active = isStateEnable;
    node.setNodeStatus();
    res.sendStatus(isStateEnable ? 200 : 201);
  });

  RED.httpAdmin.get("/logIO-observed-nodes/:id/:mode", function (req, res) {
    const logIOMode = req.params.mode;
    const node = RED.nodes.getNode(req.params.id);
    if (!node) { return res.sendStatus(404); }
    res.status(200).json({ nodes: Array.from(node.getObservedNodeIds(logIOMode)) });
  });
}
