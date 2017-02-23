sGis.module('spatialProcessor.controller.ObjectSelector', [
    'sp.Controller',
    'sp.ControllerManager'
], function(Controller, ControllerManager) {
    'use strict';

    var ObjectSelector = function(spatialProcessor, options) {
        this._map = options.map;
        this.__initialize(spatialProcessor, {sync: true}, function() {
            this._setNotificationListener();
            this.initialized = true;
            this.fire('initialize');
        });


    };

    ObjectSelector.prototype = new sGis.sp.Controller({
        _type: 'objectSelector',

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
                        '&services=' + encodeURIComponent(JSON.stringify(properties.services)) +
                        '&sr=' + encodeURIComponent(JSON.stringify(this._map.crs.getWkidString())),
                    self = this;

                return {
                    operation: 'select',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        /**
         * Selection of objects by the geometry in specified storage
         * @param {Object} properties
         * @param {String} properties.geometryStorageId - storage id with the geometry to be used for selection
         * @param {String[]} [properties.searchStorageIds] - the list of storage is, in which search will be performed
         * @param {Number} [properties.mode} - mode of search. 0 - clear search tree before search, 1 - add to selection, 2 - remove from selection
         * @param {String} [properties.operation] - "contains" to find only objects, completely contained by search geometry.
         */
        selectByStorage: function(properties) {
            this.__operation(function() {
                var param = 'geometryService=' + properties.geometryService +
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&services=' + encodeURIComponent(JSON.stringify(properties.services)) +
                        '&mode=' + (properties.mode ? properties.mode : 0);
                if (properties.operation) param += '&operation=' + properties.operation;

                return {
                    operation: 'selectByStorage',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        search: function(properties) {
            this.__operation(function() {
                var param = 'query=' + encodeURIComponent(properties.string) +
                    '&services=' + encodeURIComponent(JSON.stringify(properties.services));

                return {
                    operation: 'search',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        pick: function(properties) {
            this.__operation(function() {
                var param = 'geom=' + this._serializeGeometry(properties.geometry) +
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&services=' + encodeURIComponent(JSON.stringify(properties.services)) +
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

        pickById: function({ ids, serviceName, mode = undefined, success, error, requested }) {
            this.__operation(function() {
                let params = {
                    ids: JSON.stringify([{ServiceName: serviceName, ObjectIds: ids }]),
                    mode: mode
                };

                let param = Object.keys(params).filter(key => params[key] !== undefined).map(key => `${key}=${params[key]}`).join('&');

                return {
                    operation: 'pickById',
                    dataParameters: param,
                    success: !success ? undefined : (response) => {
                        success(this._createFeatures(response, this._map && this._map.crs));
                    },
                    error: error,
                    requested: requested
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

    Object.defineProperties(ObjectSelector.prototype, {
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
    
    ControllerManager.registerController('objectSelector', ObjectSelector);

    return ObjectSelector;
    
});
