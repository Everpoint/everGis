'use strict';

(function() {

    var instructionLimit = 10000000;

    sGis.spatialProcessor.DataTree = function(id, spatialProcessor, options) {
        this._url = spatialProcessor.url + 'DataTree/' + id + '/';
        this._spatialProcessor = spatialProcessor;
        if (options) this._wrapper = options.wrapper;

        this.__initialize();
    };

    sGis.spatialProcessor.DataTree.prototype = {
        __initialize: function() {
            this._instructions = {};
            this._childrenList = {};
            this._state = 'initializing';
            this._lastInstruction = 0;

            this.__requestInstructions();
        },

        __requestInstructions: function() {
            var self = this;
            sGis.utils.ajax({
                url: this._url + '?_sb=' + this._spatialProcessor.sessionId + '&ts=' + new Date().getTime(),
                cache: false,
                success: function(data) {
                    try {
                        var instructionList = JSON.parse(data);
                    } catch(e) {

                    } finally {
                        if (sGis.utils.isArray(instructionList) && instructionList.length > 0) {
                            self._state = 'loading';
                            self.__setInstructions(instructionList);
                            if (!self._currentInstruction) self._currentInstruction = instructionList[0].SequenceId;
                            self.__performInstructions();
                        } else {
                            self._state = 'error';
                            self._root = null;
                            self.fire('error');
                        }
                    }
                }
            });
        },

        __setInstructions: function(instructionList) {
            for (var i in instructionList) {
                this._instructions[instructionList[i].SequenceId] = instructionList[i];
                if (instructionList[i].type === 2) {
                    this._loadingComplete = true;
                    this._state = 'complete';
                    if (this._lastInstruction === 0 && instructionList.length === 1) this.__completeTree(0);
                } else if (instructionList[i].SequenceId > this._lastInstruction) {
                    this._lastInstruction = instructionList[i].SequenceId;
                }
            }
        },

        __performInstructions: function() {
            while(true) {
                if (this._instructions[this._currentInstruction]) {
                    this.__performInstruction(this._currentInstruction);
                    this._currentInstruction++;
                } else if (!this._loadingComplete) {
                    this.__requestInstructions();
                    break;
                } else {
                    if (this._currentInstruction > this._lastInstruction) {
                        this.__completeTree();
                        return;
                    } else {
                        this._currentInstruction++;
                    }
                }

                if (this._currentInstruction > instructionLimit && this._state !== 'complete') sGis.utils.error('Number of instruction exceeded the limit');
            }
        },

        __performInstruction: function(n) {
            var instruction = this._instructions[n];
            if (instruction.type === 0) {
                var row = getRow(instruction);
                if (instruction.pid.Id === -1) {
                    this._root = row;
                } else {
                    addChild(this._childrenList[row.parentId], row);
                }
                this._childrenList[row.id] = row;
            } else if (instruction.type === 1) {
                var row = this._childrenList[instruction.id.Id];

                if (row) {
                    if (instruction.data) row.data = instruction.data;
                    if (instruction.dataType) row.dataType = instruction.dataType;
                    if (instruction.status) row.status = instruction.status;
                }
            } else if (instruction.type === 2) {

            }
        },

        __completeTree: function() {
            this._state = 'complete';
            if (this._wrapper) {
                this.__setDisplayedTree();
            }

            this.fire('ready');
        },

        __setDisplayedTree: function() {
//        var nodes = getDynatreeRow(this.root, this),
//            self = this;
//        $(function() {
//            $('#' + self._wrapper).dynatree({
//                children: nodes.children,
//                debugLevel: 0,
//                idPrefix: self._wrapper + '-',
//                clickFolderMode: 1,
//                onClick: function(node, event) {
//                    if (node.getEventTargetType(event) === 'title') {
//                        if (self._onClick) self._onClick(node.data.treeRow);
//                    }
//                }
//            });
//        });
        }
    };

    Object.defineProperties(sGis.spatialProcessor.DataTree.prototype, {
        id: {
            get: function() {
                return /DataTree\/(.*)\//.exec(this._url)[1];
            }
        },

        state: {
            get: function() {
                return this._state;
            }
        },

        root: {
            get: function() {
                return this._root;
            }
        },

        onClick: {
            get: function() {
                return this._onClick;
            },

            set: function(callback) {
                this._onClick = callback;
            }
        },

        rows: {
            get: function() {
                return this._childrenList;
            }
        },

        wrapper: {
            get: function() {
                return this._wrapper;
            },

            set: function(wrapperId) {
                var $wrapper = $('#' + wrapperId);
                if ($wrapper.length === 0) sGis.utils.error('DOM element with id ' + wrapperId + ' could not be found');
                if (this._wrapper) {
                    $wrapper.html('');
                }
                this._wrapper = wrapperId;
                this.__setDisplayedTree();
            }
        }
    });

    sGis.utils.proto.setMethods(sGis.spatialProcessor.DataTree.prototype, sGis.IEventHandler);

    function getDynatreeRow(row, tree) {
        var displayedRow = {title: getRowTitle(row, tree), treeRow: row};
        if (row.children.length > 0) {
            displayedRow.isFolder = true;
            displayedRow.children = [];
            displayedRow.expand = true;
            for (var i in row.children) {
                displayedRow.children.push(getDynatreeRow(row.children[i], tree));
            }
        }
        return displayedRow;
    }

    function getRowTitle(row, tree) {
        if (row.dataType === 'System.String') return row.data;
        if (row.dataType === 'ServiceGroup') {
            var mapItem = tree._spatialProcessor.getMapItemById(row.data.Id);
            return mapItem ? mapItem.name : row.id;
        }
        if (row.dataType === 'LeafNode') return row.data.Header;
    }

    function addChild(parent, child) {
        var index = 0;
        for (var i in parent.children) {
            if (parent.children[i].id ===  child.previousId) {
                index = i + 1;
                break;
            }
        }
        parent.children.splice(index, 0, child);
    }

    function getRow(instruction) {
        return {id: instruction.id.Id, parentId: instruction.pid.Id, previousId: instruction.prid.Id, dataType: instruction.dataType, data: instruction.data, status: instruction.status, children: []};
    }


})();