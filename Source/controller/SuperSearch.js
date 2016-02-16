(function() {

    sGis.spatialProcessor.controller.SuperSearch = function(spatialProcessor, options) {
        if (options.map) {
            this._map = options.map;
        } else if (options.crs) {
            this._crs = options.crs;
        } else {
            this._crs = sGis.CRS.webMercator;
        }

        this.__initialize(spatialProcessor, {}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: this._map, display: this._display, queryLegend: false});
            this.initialized = true;
            this.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.SuperSearch.prototype = new sGis.spatialProcessor.Controller({
        _type: 'superSearch',

        superSearch: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string),
                    self = this;

                param += '&sr=' + encodeURIComponent(JSON.stringify(this._map ? this._map.crs.getWkidString() : this._crs.getWkidString()));
                if (properties.storageIds) param += '&searchType=parametrizedSearch&mapItemIds=' + encodeURIComponent(JSON.stringify(properties.storageIds));

                return {
                    operation: 'superSearch',
                    dataParameters: param,
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (tree && tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                tree.addListener('ready.controller', function() {
                                    tree.removeListener('ready.controller');
                                    properties.success(tree);
                                });
                            }
                        }
                    },
                    error: properties.error,
                    requested: function(data) {
                        if (data && data.initializationData) {
                            tree = new sGis.spatialProcessor.DataTree(data.initializationData.TreeId, self._spatialProcessor);
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                        }
                    }
                };
            });
        },

        addressSearch: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string),
                    self = this;

                if (this._map) {
                    param += '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString()));
                } else {
                    param += '&sr=' + encodeURIComponent(JSON.stringify(sGis.CRS.webMercator.getWkidString()));
                }

                if (properties.providers) param += '&providers=' + encodeURIComponent(JSON.stringify(properties.providers));

                return {
                    operation: 'addressSearch',
                    dataParameters: param,
                    requested: function(data) {
                        if (data && data.initializationData) {
                            tree = new sGis.spatialProcessor.DataTree(data.initializationData.TreeId, self._spatialProcessor);
                            if (properties.requested) properties.requested(data);
                        } else {
                            if (properties.error) properties.error('Request failed');
                        }
                    },
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (tree && tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                tree.addListener('ready.controller', function() {
                                    tree.removeListener('ready.controller');
                                    properties.success(tree);
                                });
                            }
                        }
                    },
                    error: properties.error
                };
            });
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.SuperSearch.prototype, {
        tree: {
            get: function() {
                return this._tree;
            }
        }
    });

})();