sGis.module('spatialProcessor.controller.Identify', [
    'spatialProcessor.Controller',
    'spatialProcessor.MapServer',
    'spatialProcessor.DataTree'
], function(Controller, MapServer, DataTree) {
    'use strict';
    
    var Identify = function(spatialProcessor, options) {
        this._map = options.map;
        this.__initialize(spatialProcessor, {sync: true}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: options.map, display: this._display, queryLegend: false});
            this.initialized = true;
            this.fire('initialize');
        });
    };

    Identify.prototype = new sGis.spatialProcessor.Controller({
        _type: 'identify',

        identify: function(properties) {
            var tree;
            this.__operation(function() {
                var param = 'geom=' + encodeURIComponent(JSON.stringify({rings: properties.geometry.coordinates, spatialReference: this._map.crs.getWkidString()})) + //TODO: spatial reference should be fixed
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString())),
                    self = this;

                return {
                    operation: 'identify',
                    dataParameters: param,
                    success: function(data) {
                        self._tree = tree;
                        if (properties.success) {
                            if (self._tree && self._tree.state === 'complete') {
                                properties.success(tree);
                            } else {
                                self._tree.addListener('ready.controller', function() {
                                    self._tree.removeListener('ready.controller');
                                    properties.success(tree);
                                });
                                self._tree.addListener('error.controller', function(text) {
                                    self._tree.removeListener('error.controller');
                                    if (properties.error) properties.error(text);
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

        activate: function() {
            if (this._layer && !this._layer.map) this._layer.map = this._map;
        },

        deactivate: function() {
            if (this._layer) this._layer.map = null;
        }
    });

    Object.defineProperties(Identify.prototype, {
        tree: {
            get: function() {
                return this._tree;
            }
        },

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
    
    return Identify;
    
});
