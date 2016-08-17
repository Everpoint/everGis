sGis.module('spatialProcessor.controller.ObjectSelector', [
    'spatialProcessor.Controller',
    'spatialProcessor.ControllerManager'
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

    ObjectSelector.prototype = new sGis.spatialProcessor.Controller({
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
                var param = 'geometryStorageId=' + properties.geometryStorageId +
                        '&res=' + encodeURIComponent(this._map.resolution) +
                        '&mode=' + (properties.mode ? properties.mode : 0);
                if (properties.searchStorageIds) param += '&searchStorageIds=' + JSON.stringify(properties.searchStorageIds);
                if (properties.operation) param += '&operation=' + properties.operation;
                var self = this;

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
                var param = 'geom=' + this._serializeGeometry(properties.geometry) +
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
