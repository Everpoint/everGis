sGis.module('spatialProcessor.controller.Routing', [
    'spatialProcessor.Controller'
], function(Controller) {
    'use strict';

    var Routing = function(connector, options) {
        this._map = options.map;
        this.__initialize(connector, {sync: true}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, connector, {map: options.map, display: this._display, queryLegend: false});
            this.initialized = true;
            this.fire('initialize');
        });
    };

    Routing.prototype = new sGis.spatialProcessor.Controller({
        _type: 'route',

        buildRoute: function(properties) {
            this.__operation(function() {
                var startPoint = 'startPoint=' + encodeURIComponent(JSON.stringify({x: properties.startPoint.x, y: properties.startPoint.y, spatialReference: this._map.crs.getWkidString()}));
                var endPoint = 'endPoint=' + encodeURIComponent(JSON.stringify({x: properties.endPoint.x, y: properties.endPoint.y, spatialReference: this._map.crs.getWkidString()}));
                var sr = 'spatialReference=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString()));
                var solver = 'solver=' + properties.solver;
                var param = [startPoint, endPoint, sr, solver].join('&');
                var self = this;
                return {
                    operation: 'buildRoute',
                    dataParameters: param,
                    success: !properties.success ? undefined : function(response) {
                        properties.success(self._createFeatures(response, properties.crs || properties.startPoint && properties.startPoint.crs || self._map && self._map.crs));
                    },
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

    return Routing;

})
