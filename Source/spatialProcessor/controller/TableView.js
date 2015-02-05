(function() {

    sGis.spatialProcessor.controller.TableView = function(serverConnector, options) {
        this._map = options && options.map;

        this.__initialize(serverConnector, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, { map: this._map, display: this._display });
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
            var self = this;
            this.__operation(function() {
                return {
                    operation: 'tableView.highlight',
                    dataParameters: 'queryId=' + properties.queryId + '&ids=' + encodeURIComponent(JSON.stringify(properties.ids)),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        save: function(properties) {
            var serializedAttributes = sGis.spatialProcessor.serializeAttributes(properties.attributes);
            this.__operation(function() {
                return {
                    operation: 'tableView.save',
                    dataParameters: 'queryId=' + properties.queryId + '&changes=' + encodeURIComponent(serializedAttributes),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }
            });
        }
    });

})();