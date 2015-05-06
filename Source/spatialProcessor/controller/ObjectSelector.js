'use strict';

(function() {

    sGis.spatialProcessor.controller.ObjectSelector = function(spatialProcessor, options) {
        this._map = options.map;
        this.__initialize(spatialProcessor, {sync: true}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: options.map, display: this._display});
            this.initialized = true;
            this.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.ObjectSelector.prototype = new sGis.spatialProcessor.Controller({
        _type: 'maxtroller',

        maxidentify: function(properties) {
            this.__operation(function() {
                var param = 'geom=' + encodeURIComponent(JSON.stringify({rings: properties.geometry.coordinates, spatialReference: this._map.crs.getWkidString()})) + //TODO: spatial reference should be fixed
                        '&res=' + encodeURIComponent(this._map.resolution) +
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