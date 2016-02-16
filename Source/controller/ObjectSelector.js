'use strict';

(function() {

    sGis.spatialProcessor.controller.ObjectSelector = function(spatialProcessor, options) {
        this._map = options.map;
        this.__initialize(spatialProcessor, {sync: true}, function() {
            this._setNotificationListener();
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: options.map, display: this._display, queryLegend: false});
            this.initialized = true;
            this.fire('initialize');
        });


    };

    sGis.spatialProcessor.controller.ObjectSelector.prototype = new sGis.spatialProcessor.Controller({
        _type: 'maxtroller',

        _setNotificationListener: function() {
            var self = this;
            this._spatialProcessor.addObjectSelectorListener(function(data) {
                self.fire('update', {data: data});
            });
        },

        identify: function(properties) {
            this.__operation(function() {
                var param = 'geom=' + encodeURIComponent(JSON.stringify({rings: properties.geometry.coordinates, spatialReference: this._map.crs.getWkidString()})) + //TODO: spatial reference should be fixed
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&mode=' + (properties.mode ? properties.mode : 0) +
                        '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString())),
                    self = this;

                return {
                    operation: 'maxidentify',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        search: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string),
                    self = this;

                param += '&sr=' + encodeURIComponent(JSON.stringify(this._map ? this._map.crs.getWkidString() : this._crs.getWkidString()));
                if (properties.storageIds) param += '&searchType=parametrizedSearch&mapItemIds=' + encodeURIComponent(JSON.stringify(properties.storageIds));

                return {
                    operation: 'maxsearch',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        pick: function(properties) {
            this.__operation(function() {
                var param = 'geom=' + encodeURIComponent(JSON.stringify({rings: properties.geometry.coordinates, spatialReference: this._map.crs.getWkidString()})) + //TODO: spatial reference should be fixed
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString())),
                    self = this;

                return {
                    operation: 'pick',
                    dataParameters: param,
                    success: !properties.success ? undefined : function(response) {
                        properties.success(self._createFeatures(response, properties.crs || properties.geometry && properties.geometry.crs || self._map && self._map.crs));
                    },
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        pickById: function(properties) {
            this.__operation(function() {
                var param = 'ids=' + encodeURIComponent(JSON.stringify([{StorageId: properties.storageId, ObjectIds: properties.objectIds}]));

                var self = this;
                return {
                    operation: 'pickById',
                    dataParameters: param,
                    success: !properties.success ? undefined : function(response) {
                        properties.success(self._createFeatures(response, properties.crs || properties.geometry && properties.geometry.crs || self._map && self._map.crs));
                    },
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        highlight: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'highlight2',
                    dataParameters: 'ids=' + JSON.stringify(properties.ids) + '&reset=' + properties.reset,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        activate: function() {
            if (this._layer && !this._layer.map) this._layer.map = this._map;
        },

        deactivate: function() {
            if (this._layer) this._layer.map = null;
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.ObjectSelector.prototype, {
        isActive: {
            get: function() {
                return this._layer.map === null;
            }
        },

        mapServer: {
            get: function() {
                return this._layer;
            }
        }
    });

})();