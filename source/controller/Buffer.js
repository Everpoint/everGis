sGis.module('spatialProcessor.controller.Buffer', [
    'spatialProcessor.Controller',
    'spatialProcessor.MapServer'
], function(Controller) {
    'use strict';

    class Buffer extends Controller {
        constructor(connector, options) {
            super();

            this._type = 'buffer';
            this._map = options.map;
            this.__initialize(connector, {sync: true}, function() {
                this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, connector, {map: options.map, display: this._display, queryLegend: false});
                this.initialized = true;
                this.fire('initialize');
            });
        }

        /**
         * Calculates the buffers and displays them in the controller mapServer
         * @param {Object} properties
         * @param {Number|String[]} properties.distances - an array of buffer radiuses or attribute names, which should be used as a value for radius.
         * @param {Boolean} properties.unionResults - whether to unite buffers into one object.
         * @param {String} properties.storageId - id of the server storage with target geometries
         * @param {Boolean} properties.subtractObject - whether to subtract the source object from the resulting buffer.
         * @param {Number} [properties.processDelay] - server processes objects in batches of 200. This parameter is a sleep time in ms between batches. Use smaller value for quicker process.
         * @param {sGis.Crs} properties.sr - spatial reference of the source geometry. If not specified, will be used spatial reference of the target layer.
         * @param {Boolean} properties.subtractInnerBuffer - whether to subtract inner buffer from outer buffer. This option has no effect if "unionResult" is true.
         * @param {Function} properties.requested
         * @param {Function} properties.success
         * @param {Function} properties.error
         */
        calculateBuffers(properties) {
            this.__operation(function() {
                var params = 'distances=' + JSON.stringify(properties.distances);
                params += '&unionResults=' + (properties.unionResults === true);
                params += '&sourceStorage=' + properties.storageId;
                params += '&subtractObject=' + (properties.subtractObject || false);
                if (properties.processDelay) params += '&processDelay=' + properties.processDelay;
                if (properties.sr) params += '&sr=' + JSON.stringify(properties.sr.getWkidString());
                if (properties.subtractInnerBuffer) params += '&subtractInnerBuffer=' + properties.subtractInnerBuffer;

                params += '&autoUpdate=false';
                return {
                    operation: 'buffer',
                    dataParameters: params,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }

        get mapServer() { return this._layer; }
    }

    return Buffer;
});
