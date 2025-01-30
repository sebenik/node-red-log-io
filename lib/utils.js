const dayjs = require('dayjs');
const utc = require("dayjs/plugin/utc");

const ignoredNodeTypes = ['tab', 'subflow', 'comment'];
const logLevelStatusColors = new Map([
  ['error', 'red'],
  ['warn', 'yellow'],
  ['info', 'green'],
  ['debug', 'blue'],
]);

dayjs.extend(utc);

const getSetIntersection = function (setA, setB) {
  return new Set([...setA].filter((e) => setB.has(e)));
}

const getTimestamp = function ({ utc = false } = {}) {
  return utc ? dayjs.utc().format() : dayjs.utc().local().format();
}

const getWiredOutNodeIds = function (RED, n, wiredOutNodeIds = new Set([])) {
  n.wires?.forEach((wireArray) => {
    wireArray.forEach((connectedNodeId) => {
      if (!wiredOutNodeIds.has(connectedNodeId) && n.id !== connectedNodeId) {
        wiredOutNodeIds.add(connectedNodeId);
        let connectedNode = RED.nodes.getNode(connectedNodeId);
        connectedNode && getWiredOutNodeIds(RED, connectedNode, wiredOutNodeIds);
      }
    });
  });
  return wiredOutNodeIds;
};

const getAllWiredNodes = function (RED, node) {
  let wiredNodeIds = new Set([node.id]);
  RED.nodes.eachNode((n) => {
    if (ignoredNodeTypes.includes(n.type) || wiredNodeIds.has(n.id)) {
      return;
    }
    const outWiredNodeIds = getWiredOutNodeIds(RED, n, new Set([n.id]))
    const intersection = getSetIntersection(wiredNodeIds, outWiredNodeIds);
    if (intersection.size > 0) {
      wiredNodeIds = new Set([...wiredNodeIds, ...outWiredNodeIds])
    }
  });

  return wiredNodeIds;
}

const getAllNodes = function (RED) {
  const nodes = new Set();
  RED.nodes.eachNode((n) => {
    if (!ignoredNodeTypes.includes(n.type)) {
      nodes.add(n.id);
    }
  });
  return nodes;
}

module.exports = {
  getTimestamp,
  getWiredOutNodeIds,
  getAllWiredNodes,
  getAllNodes,
  logLevelStatusColors,
};
