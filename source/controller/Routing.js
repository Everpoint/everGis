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
        },

        /**
         * Build isochrone from the center of given geometry object
         * @param {Object} properties
         * @param {Number} properties.duration - time in seconds for isochrone limit
         * @param {String} properties.solver - name of the route builder backend
         * @param {sGis.Feature} properties.geometry - base geometry from which isochrone will be build
         * @param {Number} [properties.resolutionK] - the resolution coefficient of isochrone. 0.1 would mean, that 20x20 grid will be used, 0.5 -> 4x4.
         * @param {Function} properties.requested
         * @param {Function} properties.success
         * @param {Function} properties.error
         */
        buildIsochrone: function(properties) {
            this.__operation(function() {
                var duration = 'duration=' + properties.duration;
                var solver = 'solver=' + properties.solver;
                var geometry = 'geom=' + this._serializeGeometry(properties.geometry);
                var resolutionK = 'resolutionK=' + properties.resolutionK;

                var param = [duration, solver, geometry, resolutionK].join('&');
                return {
                    operation: 'isochrone',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                }; 
            });
        },

        /**
         * Build isochrone from the center of every object in the given storage
         * @param {Object} properties
         * @param {Number} properties.duration - time in seconds for isochrone limit
         * @param {String} properties.solver - name of the route builder backend
         * @param {String} properties.storageId - storage ID with the target geometry
         * @param {Number} [properties.resolutionK] - the resolution coefficient of isochrone. 0.1 would mean, that 20x20 grid will be used, 0.5 -> 4x4.
         * @param {Boolean} [properties.uniteResults] - whether to unite the isochrones from different objects
         * @param {Function} properties.requested
         * @param {Function} properties.success
         * @param {Function} properties.error
         */
        buildIsochroneByStorage: function(properties) {
            this.__operation(function() {
                var duration = 'duration=' + properties.duration;
                var solver = 'solver=' + properties.solver;
                var storageId = 'storageId=' + properties.storageId;

                var param = [duration, solver, storageId].join('&');

                if (properties.resolutionK) param += '&resolutionK=' + properties.resolutionK;
                if (properties.uniteResults !== undefined) param += '&uniteResults=' + properties.uniteResults;
                return {
                    operation: 'isochroneByStorage',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

    return Routing;

});
