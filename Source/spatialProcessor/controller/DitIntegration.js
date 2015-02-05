'use strict';

(function() {

    sGis.spatialProcessor.controller.DitIntegration = function(spatialProcessor, options) {
        this._map = options.map;

        var self = this;
        this.__initialize(spatialProcessor, {}, function() {
            self._mapServer = options.sp.addService('VisualObjectsRendering/' + this._mapServiceId);
            self._layer = self._mapServer;

            self.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.DitIntegration.prototype = new sGis.spatialProcessor.Controller({
        _type: 'integrationLayer',

        loadLayerData: function(properties) {
            var self = this;
            this.__operation(function() {
                properties.operation = 'loadLayerData';
                return properties;
            });
        },

        disintegrate: function(properties) {
            var self = this;
            this.__operation(function() {
                var param = 'layerId=' + encodeURIComponent(properties.layerId) + '&moduleId=' + encodeURIComponent(properties.moduleId) + '&shitId=' + encodeURIComponent(properties.queryId);
                return {operation: 'disintegrate',
                    dataParameters: param,
                    requested: properties.requested,

                    success: function() {
//                        everGis.addMapItem(self._mapItem);
                        if (properties.success) {
                            properties.success();
                        }
                    }};
            });
        },

        fullyDisintegrate: function(properties) {
            var self = this;
            this.__operation(function() {
                var param = 'layerId=' + encodeURIComponent(properties.layerId) + '&moduleId=' + encodeURIComponent(properties.moduleId) + '&shitId=' + encodeURIComponent(properties.queryId);
                return {operation: 'fullyDisintegrate',
                    dataParameters: param,
                    requested: properties.requested,

                    success: function() {
//                        everGis.addMapItem(self._mapItem);
                        if (properties.success) {
                            properties.success();
                        }
                    }};
            });
        }
    });

    Object.defineProperties(sGis.spatialProcessor.controller.DitIntegration.prototype, {
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
                return this._mapServer;
            }
        }
    });

})();