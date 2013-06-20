var DCaseTree = require("./DCaseTree")
function outputError(o) {
    console.log("error: " + o);
}
function splitByLines(text) {
    return text.split(/\r\n|\r|\n/g);
}
function isNumber(text) {
    return /\d+/.test(text);
}
function isBoolean(text) {
    return /true|false/.test(text);
}
var Converter = (function () {
    function Converter() {
        this.usedNodeIdList = [];
        this.currentNodeId = 0;
    }
    Converter.prototype.isUsedNodeId = function (nodeId) {
        for(var i = 0; i < this.usedNodeIdList.length; i++) {
            if(nodeId == this.usedNodeIdList[i]) {
                return true;
            }
        }
        return false;
    };
    Converter.prototype.initUsedNodeIdList = function (text) {
        var lines = splitByLines(text);
        for(var i = 0; i < lines.length; i++) {
            var nodeIdMacher = /\*+.+\s.+\s/g;
            nodeIdMacher.exec(lines[i]);
            if(nodeIdMacher.lastIndex > 0) {
                var nodeIdText = lines[i].substring(nodeIdMacher.lastIndex);
                if(!isNumber(nodeIdText)) {
                    outputError("node id must be number");
                }
                var nodeId = parseInt(nodeIdText);
                if(!this.isUsedNodeId(nodeId)) {
                    this.usedNodeIdList.push(nodeId);
                }
            }
        }
    };
    Converter.prototype.createNewNodeId = function () {
        while(true) {
            this.currentNodeId += 1;
            if(!this.isUsedNodeId(this.currentNodeId)) {
                return this.currentNodeId;
            }
        }
    };
    Converter.prototype.parseNodeData = function (text, node) {
        var lines = splitByLines(text);
        if(lines.length < 2) {
            outputError("node doesn't include enough data");
        }
        if(lines[0] != "") {
            var nodeIdMacher = /\s.*\s/g;
            nodeIdMacher.exec(lines[0]);
            if(nodeIdMacher.lastIndex <= 0) {
                outputError("syntax is incorrect (nodeid)");
            }
            var nodeIdText = lines[0].substring(nodeIdMacher.lastIndex);
            if(!isNumber(nodeIdText)) {
                outputError("node id must be number");
            }
            var nodeId = parseInt(nodeIdText);
            node.ThisNodeId = nodeId;
        }
        node.Description = lines[1];
        if(lines.length == 2) {
            return;
        }
        var MetaData = [];
        var metaDataElem = null;
        for(var i = 2; i < lines.length; i++) {
            if(lines[i] == "") {
                continue;
            } else if(lines[i] == "---") {
                if(metaDataElem != null && "Type" in metaDataElem && "Visible" in metaDataElem) {
                    MetaData.push(metaDataElem);
                }
                metaDataElem = {
                };
                continue;
            }
            var keyValPair = lines[i].split(":");
            if(keyValPair.length != 2) {
                outputError("you must put meta data in key-value format");
            }
            var key = keyValPair[0];
            var valText = keyValPair[1];
            var val;
            if(isNumber(valText)) {
                val = parseInt(valText);
            } else if(isBoolean(valText)) {
                val = Boolean(valText);
            } else {
                val = valText;
            }
            metaDataElem[key] = val;
        }
        node.MetaData = MetaData;
    };
    Converter.prototype.parseContext = function (text, depth, parentNode) {
        if(parentNode == null) {
            outputError("context node must be child node");
        }
        var separator = new RegExp("\n\\*{" + depth + "}Context", "g");
        var contextBlocks = text.split(separator);
        var contextMacher = new RegExp("\\*{" + depth + "}Context", "g");
        contextMacher.exec(contextBlocks[0]);
        contextBlocks[0] = contextBlocks[0].substring(contextMacher.lastIndex);
        for(var i = 0; i < contextBlocks.length; i++) {
            var contextNode = new DCaseTree.ContextNode(null, null, null);
            var nodeDataText = contextBlocks[i];
            this.parseNodeData(nodeDataText, contextNode);
            if(contextNode.ThisNodeId == null) {
                contextNode.ThisNodeId = this.createNewNodeId();
            }
            parentNode.Contexts.push(contextNode);
        }
    };
    Converter.prototype.parseStrategy = function (text, depth, parentNode) {
        if(parentNode == null) {
            outputError("strategy node must be child node");
        }
        var separator = new RegExp("\n\\*{" + depth + "}Strategy", "g");
        var strategyBlocks = text.split(separator);
        var strategyMacher = new RegExp("\\*{" + depth + "}Strategy", "g");
        strategyMacher.exec(strategyBlocks[0]);
        strategyBlocks[0] = strategyBlocks[0].substring(strategyMacher.lastIndex);
        for(var i = 0; i < strategyBlocks.length; i++) {
            var strategyNode = new DCaseTree.StrategyNode(null, null, null);
            var indexOfAsteriskChar = strategyBlocks[i].indexOf("*");
            var nodeDataText;
            var childBlockText;
            if(indexOfAsteriskChar == -1) {
                nodeDataText = strategyBlocks[i];
                childBlockText = null;
            } else {
                nodeDataText = strategyBlocks[i].substring(0, indexOfAsteriskChar);
                childBlockText = strategyBlocks[i].substring(indexOfAsteriskChar);
            }
            this.parseNodeData(nodeDataText, strategyNode);
            if(strategyNode.ThisNodeId == null) {
                strategyNode.ThisNodeId = this.createNewNodeId();
            }
            parentNode.Children.push(strategyNode);
            if(childBlockText != null) {
                if(splitByLines(childBlockText)[0].match("Goal") != null) {
                    this.parseGoal(childBlockText, depth, strategyNode);
                } else if(splitByLines(childBlockText)[0].match("Context") != null) {
                    this.parseContext(childBlockText, depth, strategyNode);
                }
            }
        }
    };
    Converter.prototype.parseSolution = function (text, depth, parentNode) {
        if(parentNode == null) {
            outputError("solution node must be child node");
        }
        var separator = new RegExp("\n\\*{" + depth + "}Solution", "g");
        var solutionBlocks = text.split(separator);
        var solutionMacher = new RegExp("\\*{" + depth + "}Solution", "g");
        solutionMacher.exec(solutionBlocks[0]);
        solutionBlocks[0] = solutionBlocks[0].substring(solutionMacher.lastIndex);
        for(var i = 0; i < solutionBlocks.length; i++) {
            var solutionNode = new DCaseTree.SolutionNode(null, null, null);
            var nodeDataText = solutionBlocks[i];
            this.parseNodeData(nodeDataText, solutionNode);
            if(solutionNode.ThisNodeId == null) {
                solutionNode.ThisNodeId = this.createNewNodeId();
            }
            parentNode.Children.push(solutionNode);
        }
    };
    Converter.prototype.parseGoal = function (text, depth, parentNode) {
        depth++;
        var goalNodes = [];
        var separator = new RegExp("\n\\*{" + depth + "}Goal", "g");
        var goalBlocks = text.split(separator);
        var goalMacher = new RegExp("\\*{" + depth + "}Goal", "g");
        goalMacher.exec(goalBlocks[0]);
        goalBlocks[0] = goalBlocks[0].substring(goalMacher.lastIndex);
        for(var i = 0; i < goalBlocks.length; i++) {
            var goalNode = new DCaseTree.GoalNode(null, null, null);
            var indexOfAsteriskChar = goalBlocks[i].indexOf("*");
            var nodeDataText;
            var childBlockText;
            if(indexOfAsteriskChar == -1) {
                nodeDataText = goalBlocks[i];
                childBlockText = null;
            } else {
                nodeDataText = goalBlocks[i].substring(0, indexOfAsteriskChar);
                childBlockText = goalBlocks[i].substring(indexOfAsteriskChar);
            }
            this.parseNodeData(nodeDataText, goalNode);
            if(goalNode.ThisNodeId == null) {
                goalNode.ThisNodeId = this.createNewNodeId();
            }
            goalNodes.push(goalNode);
            if(childBlockText == null) {
                continue;
            } else if(splitByLines(childBlockText)[0].match("Strategy") != null) {
                this.parseStrategy(childBlockText, depth, goalNode);
            } else if(splitByLines(childBlockText)[0].match("Solution") != null) {
                this.parseSolution(childBlockText, depth, goalNode);
            } else if(splitByLines(childBlockText)[0].match("Context") != null) {
                this.parseContext(childBlockText, depth, goalNode);
            }
        }
        if(parentNode == null) {
            if(goalNodes.length != 1) {
                outputError("root node must be one node");
            }
            return goalNodes[0];
        } else {
            parentNode.Children = goalNodes;
            return parentNode;
        }
    };
    Converter.prototype.parseMarkdown = function (markdownText) {
        this.initUsedNodeIdList(markdownText);
        var rootNode = this.parseGoal(markdownText, 0, null);
        return rootNode;
    };
    return Converter;
})();
exports.Converter = Converter;
