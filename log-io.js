const utils = require('./lib/utils');

module.exports = function (RED) {
  function LogIONode(config) {
    RED.nodes.createNode(this, config);

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
    this.setNodeStatus = setNodeStatus;
    this.logIOScope = this.logIOMode === 'inline'
      ? 'I'
      : (config.logIOScope || 'I');

    const node = this;

    function handleMsgEvent(eventName, msg, sourceNodeId) {
      try {
        const sourceNode = RED.nodes.getNode(sourceNodeId);
        if (sourceNode.type === 'logIO' && sourceNode.id !== node.id) {
          return;
        }

        let message = node.config.targetType === 'full'
          ? msg
          : RED.util.getMessageProperty(msg, node.config.complete);
        
        if (typeof message === 'undefined') {
          return;
        }

        const m = { _o: {} };
        if (node.logMeta !== 'none') {
          const lmAll = node.logMeta === 'all';
          m.meta = {
            ...(lmAll || node.logMetaOptions.includes('_msgid')) && { _msgid: msg?._msgid }, 
            ...(lmAll || node.logMetaOptions.includes('eventName')) && { eventName }, 
            ...(lmAll || node.logMetaOptions.includes('loggerNodeId')) && { loggerNodeId: node.id }, 
            ...(lmAll || node.logMetaOptions.includes('sourceNodeId')) && { sourceNodeId }, 
            ...(lmAll || node.logMetaOptions.includes('sourceNodeName')) && { sourceNodeName: sourceNode.name }, 
            ...(lmAll || node.logMetaOptions.includes('sourceNodeType')) && { sourceNodeType: sourceNode.type }, 
          }
        }
        if (node.logToNrDebugger) {
          m._o.sourceNode = sourceNode;
        }
        if (msg._logIO_ && typeof msg._logIO_ === 'object') {
          m._o._logIO_ = msg._logIO_;
        }

        let logLevel = msg?._logIO_?.logLevel || node.logger.config.logLevel;
        if (!node.logLevelOptions.includes(logLevel)) {
          const warnMsg = `[logIO] logLevel '${logLevel}' is not valid, replacing it with 'debug'.`;
          node.warn(warnMsg)
          console.warn(warnMsg);
          logLevel = 'debug';
        }

        node.logger.log(logLevel, message, m);
      } catch (err) {
        const errMsg = `[logIO] Unexpected error while logging messages: ${err}`;
        node.warn(errMsg)
        console.warn(errMsg);
      }
    }

    function activate() {
      node.isActivated = true;

      if (node.logIOScope.includes('O')) {
        RED.hooks.add(`onSend.msg-logIO-${node.id}`, (sendEvents) => {
          sendEvents.forEach((sendEvent) => {
            if (node.active && node.observedNodeIds.has(sendEvent.source.node.id)) {
              const message = RED.util.cloneMessage(sendEvent.msg);
              handleMsgEvent('OUTPUT', message, sendEvent.source.node.id);
            }
          });
        });
      }

      if (node.logIOScope.includes('I')) {
        RED.hooks.add(`onReceive.msg-logIO-${node.id}`, (receiveEvent) => {
          if (node.active && node.observedNodeIds.has(receiveEvent.destination.node.id)) {
            const message = RED.util.cloneMessage(receiveEvent.msg);
            handleMsgEvent('INPUT', message, receiveEvent.destination.node.id);
          }
        });
      }

      setNodeStatus();
    }

    function deactivate() {
      node.isActivated = false;
      RED.hooks.remove(`*.msg-logIO-${node.id}`);
      setNodeStatus();
    }

    function getNodeStatusFill(logLevel) {
      let fill = 'gray';
      if (!(node.active && node.isActivated)) {
        return fill;
      }
      switch (logLevel) {
        case 'error':
          fill = 'red';
          break;
        case 'warn':
          fill = 'yellow';
          break;
        case 'info':
          fill = 'green';
          break;
        case 'debug':
          fill = 'blue';
          break;
        default:
          break;
      }
      return fill;
    }

    function setNodeStatus() {
      const logLevel = node.logger?.config.logLevel;
      node.status({
        fill: getNodeStatusFill(logLevel),
        shape: 'ring',
        text: (node.active && node.isActivated) ? `Level: ${logLevel} | Mode: ${node.logIOMode}` : 'Logging paused',
      });
    }

    function init() {
      node.logger = RED.nodes.getNode(config.logger);

      if (!node.logger) {
        setNodeStatus();
        return;
      }

      node.logMeta = node.logger.config.logMeta;
      node.logMetaOptions = node.logger.config.logMetaOptions.split(',');
      node.logToNrDebugger = node.logger.config.logOutput.split(',').includes('nr-debugger');

      switch (node.logIOMode) {
        case 'inline':
          node.observedNodeIds = new Set([node.id]);
          break;
        case 'wired':
          node.observedNodeIds = utils.getAllWiredNodes(RED, node);
          break;
        case 'flow':
          node.observedNodeIds = new Set(Object.keys(node._flow.activeNodes));
          break;
        case 'select':
          node.observedNodeIds = new Set(config.scope || []);
          break;
        case 'all':
          node.observedNodeIds = utils.getAllNodes(RED);
          break;
      }

      node.autoStart && activate();
      setNodeStatus();
    };

    node.on('input', function (msg) {
      if (
        !node.active ||
        !msg._logIO_ ||
        typeof msg._logIO_.activate !== "boolean")
      {
        return node.send(msg);
      }

      if (msg._logIO_.activate) {
        if (node.isActivated) {
          node.warn('[logIO] logging is already active')
        } else {
          handleMsgEvent('INPUT', msg, node.id);
          activate();
        }
      } else {
        node.isActivated
          ? deactivate()
          : node.warn('[logIO] logging is not active');
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
    const isSateEnable = state === 'enable';
    if (state !== 'enable' && state !== 'disable') {
      res.sendStatus(404);
      return;
    }
    const nodes = req?.body?.nodes;
    if (Array.isArray(nodes)) {
      nodes.forEach(function(id) {
        const node = RED.nodes.getNode(id);
        if (node !== null && typeof node !== "undefined") {
          node.active = isSateEnable;
          node.setNodeStatus();
        }
      })
      res.sendStatus(isSateEnable ? 200 : 201);
    } else {
      res.sendStatus(400);
    }
  });

  RED.httpAdmin.post("/logIO/:id/:state", RED.auth.needsPermission("debug.write"), function (req, res) {
    const state = req.params.state;
    const isSateEnable = state === 'enable';
    if (state !== 'enable' && state !== 'disable') {
      res.sendStatus(404);
      return;
    }
    const node = RED.nodes.getNode(req.params.id);
    if (node !== null && typeof node !== "undefined") {
      node.active = isSateEnable;
      node.setNodeStatus();
      res.sendStatus(isSateEnable ? 200 : 201);
    } else {
      res.sendStatus(404);
    }
  });
}
