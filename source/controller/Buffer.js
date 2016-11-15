sGis.module('spatialProcessor.controller.Buffer', [
    'spatialProcessor.Controller',
    'spatialProcessor.ControllerManager'
], function(Controller, ControllerlManager) {
    'use strict';

    class Buffer extends Controller {
        constructor(connector, options) {
            super();
            this._type = 'buffer';
            this.__initialize(connector, {sync: true});
        }

        /**
         * Calculates the buffers and displays them in the controller mapServer
         * @param {Object} properties
         * @param {Number|String[]} properties.distances - an array of buffer radiuses or attribute names, which should be used as a value for radius.
         * @param {Boolean} properties.unionResults - whether to unite buffers into one object.
         * @param {Boolean} properties.subtractObject - whether to subtract the source object from the resulting buffer.
         * @param {Number} [properties.processDelay] - server processes objects in batches of 200. This parameter is a sleep time in ms between batches. Use smaller value for quicker process.
         * @param {Boolean} properties.subtractInnerBuffer - whether to subtract inner buffer from outer buffer. This option has no effect if "unionResult" is true.
         * @param {String} properties.sourceServiceName - name of the service with source geometries
         * @param {String} properties.targetServiceName - name of the service to which to write calculated buffers
         * @param {Function} properties.requested
         * @param {Function} properties.success
         * @param {Function} properties.error
         */
        calculateBuffers(properties) {
            this.__operation(function() {
                let params = {
                    distances: JSON.stringify(properties.distances),
                    unionResults: properties.unionResults,
                    subtractObject: properties.subtractObject,
                    processDelay: properties.processDelay,
                    subtractInnerBuffer: properties.subtractInnerBuffer,
                    sourceServiceName: properties.sourceServiceName,
                    targetServiceName: properties.targetServiceName
                };

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

    ControllerlManager.registerController('buffer', Buffer);

    return Buffer;
});
