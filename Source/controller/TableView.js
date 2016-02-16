(function() {

    sGis.spatialProcessor.controller.TableView = function(serverConnector, options) {
        this._map = options && options.map;

        this.__initialize(serverConnector, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, { map: this._map, display: this._display, queryLegend: false });
            this.initialized = true;
            this.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.TableView.prototype = new sGis.spatialProcessor.Controller({
        _type: 'tableView',

        runQuery: function(properties) {
            var self = this;
            this.__operation(function() {
                var queryDescription = {
                        PrevQueryId: properties.prevQueryId,
                        PageIndex: properties.pageIndex || -1,
                        SortDescriptions: properties.sortDescriptions || [],
                        GroupDescriptions: properties.groupDescriptions || [],
                        FilterDescriptions: properties.filterDescriptions || []
                    },
                    param = 'storageId=' + properties.storageId +
                        '&query=' + encodeURIComponent(JSON.stringify(queryDescription));
                var errorNotified;

                return {
                    operation: 'runQuery',
                    dataParameters: param,
                    success: function(data) {
                        if (data.content && data.content.VisualObjects) {
                            var objects = sGis.spatialProcessor.parseXML(data.content.VisualObjects);
                            objects.pagingInfo = data.content.PagingInfo;
                            objects.queryId = data.content.QueryId;
                            objects.tableAttributesDefinition = data.content.AttributesDefinition;

                            if (properties.success) properties.success(objects);
                        } else if (!errorNotified) {
                            if (properties.error) properties.error('Could not parse the response');
                        }
                    },
                    error: properties.error,
                    requested: function(data) {
                        if (data && data.operationId) {
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                            errorNotified = true;
                        }
                    }
                }
            });
        },

        highlight: function(properties) {
            var idsString = properties.ids ? '&ids=' + encodeURIComponent(JSON.stringify(properties.ids)) : '';
            this.__operation(function() {
                return {
                    operation: 'tableView.highlight',
                    dataParameters: 'queryId=' + properties.queryId + idsString,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        save: function(properties) {
            if (!properties.added && !properties.updated && !properties.deleted) utils.error('Edit description must contain at least one feature');

            var edit = {added: properties.added, updated: properties.updated, deleted: properties.deleted},
                xmlString = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + sGis.spatialProcessor.serializeGeometryEdit(edit, true));

            this.__operation(function() {
                return {
                    operation: 'tableView.save',
                    dataParameters: 'queryId=' + properties.queryId + '&changes=' + xmlString,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        createDrawingLayer: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.createDrawingLayer',
                    dataParameters: 'queryId=' + properties.queryId + '&storageId=' + properties.storageId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }
            });
        },

        applyAttributeDefinition: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.applyAttributeDefinition',
                    dataParameters: 'queryId=' + properties.queryId + '&changes=' + encodeURIComponent(JSON.stringify(properties.changes)),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        setAttributeDefinition: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.setAttributeDefinition',
                    dataParameters: 'queryId=' + properties.queryId + '&changes=' + encodeURIComponent(JSON.stringify(properties.changes)) + '&attributeDefinition=' + encodeURIComponent(JSON.stringify(properties.attributesDefinition)),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        validateExpression: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.validateFunc',
                    dataParameters: 'queryId=' + properties.queryId + '&expression=' + encodeURIComponent(properties.expression) + '&resultType=' + encodeURIComponent(properties.resultType),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        batchEdit: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.batchEdit',
                    dataParameters: 'queryId=' + properties.queryId + '&attribute=' + encodeURIComponent(properties.attribute) + '&newValue=' + encodeURIComponent(properties.value),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }
            });
        },

        batchFuncEdit: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.batchFuncEdit',
                    dataParameters: 'queryId=' + properties.queryId + '&attribute=' + encodeURIComponent(properties.attribute) + '&expression=' + encodeURIComponent(properties.expression),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }
            });
        },

        removeAll: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.removeAll',
                    dataParameters: 'queryId=' + properties.queryId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        /**
         * Removes the query from the server memory
         * @param properties
         */
        removeQuery: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'removeQuery',
                    dataParameters: 'queryId=' + properties.queryId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        /**
         * Returns the id of a temporary file, that contains exported xlsx table
         * @param {Object} properties
         * @param {String} properties.queryId - table query id
         */
        export: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.export',
                    dataParameters: 'queryId=' + properties.queryId + '&resultAsUrl=true',
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        getOperatorInfo: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'tableView.getOperatorInfo',
                    dataParameters: 'queryId=' + properties.queryId,
                    success: function(response) {
                        if (response.operation && response.operation.status === 'Success') {
                            if (properties.success) properties.success(response.content);
                        } else {
                            if (properties.error) properties.error(response);
                        }
                    },
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

})();