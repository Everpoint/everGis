sGis.module('spatialProcessor.DataAccessService', [
    'spatialProcessor.Controller'
], function(Controller) {
    'use strict';

    /**
     * Object for interactions with SpatialProcessor Data Access Service
     * @param {sGis.spatialProcessor.Connector} serverConnector
     * @param {String} name - name of the service on server
     * @constructor
     */
    var DataAccessService = function(serverConnector, name) {
        this._sp = serverConnector;
        this._spatialProcessor = serverConnector;

        this._url = this._spatialProcessor.url;
        this._id = name;

        this._operationQueue = [];
    };

    //TODO: this operations should be united with controller operations
    DataAccessService.prototype = {
        __operation: sGis.spatialProcessor.Controller.prototype.__operation,
        query: sGis.spatialProcessor.Controller.prototype.query,
        queryByGeometry: sGis.spatialProcessor.Controller.prototype.queryByGeometry,
        save: sGis.spatialProcessor.Controller.prototype.save,
        createObject: sGis.spatialProcessor.Controller.prototype.createObject,
        autoComplete: sGis.spatialProcessor.Controller.prototype.autoComplete,
        reshape: sGis.spatialProcessor.Controller.prototype.reshape,
        cut: sGis.spatialProcessor.Controller.prototype.cut,

        /**
         * Requests the information about the available services from the server
         * @param {Object} properties
         * @param {String} [properties.filter] - filtering string for the query
         * @param {Function} [properties.requested], [properties.success], [properties.error]
         */
        getServicesCatalog: function(properties) {
            var dataParameters = properties.filter ? 'filter=' + properties.filter : '';

            this.__operation(function() {
                return {
                    operation: 'getServicesCatalog',
                    dataParameters: dataParameters,
                    requested: properties.requested,
                    error: properties.error,
                    success: function(response) {
                        if (properties.success) {
                            properties.success(response.content);
                        }
                    }
                }
            });
        },

        getTemplates: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'getTemplates',
                    dataParameters: 'StorageId=' + properties.storageId,
                    cache: false,
                    requested: properties.requested,
                    error: properties.error,
                    success: function(response) {
                        if (properties.success) {
                            var templates = [];
                            for (var i = 0; i < response.content.length; i++) {
                                templates.push(new sGis.spatialProcessor.Template(response.content[i].Content, response.content[i].FileName));
                            }

                            properties.success(templates);
                        }
                    }
                }
            });
        },

        clientMapInfo: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'clientMapInfo',
                    dataParameters: 'info=' + encodeURIComponent(JSON.stringify({sr: properties.map.crs.getWkidString()})),
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        projectGeometry: sGis.spatialProcessor.Controller.prototype.projectGeometry,

        getScalarValue: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'selectScalarValue',
                    dataParameters: 'serviceName=' + properties.serviceName + '&query=' + properties.query,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        subtractStorage: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'storageDiff',
                    dataParameters: 'a=' + properties.source + '&b=' + properties.deduction + '&target=' + properties.target,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        clearStorage: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'clear',
                    dataParameters: 'id=' + properties.storageId,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        /**
         * Copies objects from one service to another
         * @param {String} sourceServiceName
         * @param {String} targetServiceName
         * @param {Number[]} [objectIds=null] - object ids to be copied. If not specified, all objects will be copied.
         * @param {Function} requested
         * @param {Function} success
         * @param {Function} error
         */
        copy: function({ sourceServiceName, targetServiceName, objectIds = null, requested, success, error}) {
            let dataParameters = {
                sourceServiceName: sourceServiceName,
                targetServiceName: targetServiceName,
                objectIds: objectIds ? JSON.stringify(objectIds) : null
            };

            let paramString = Object.keys(dataParameters).filter(key => dataParameters[key]).map(key => `${key}=${dataParameters[key]}`).join('&');

            this.__operation(function() {
                return {
                    operation: 'copy',
                    dataParameters: paramString,
                    requested: requested,
                    error: error,
                    success: success
                };
            });
        },

        /**
         * Requests data aggregation
         * @param {String} geometrySourceServiceName - name of data view service that contains source geometry. The objects of this service will be copied to the target service with aggregated attributes.
         * @param {String} dataSourceServiceName - name of data view service that contains aggregation data.
         * @param {String} targetServiceName - name of data view service where new features will be saved.
         * @param {Object[]} aggregations - aggregation parameters given in format [{ targetAttributeName: 'min', aggregationQuery: 'min("gid")' }, ...]
         * @param {Function} requested
         * @param {Function} success
         * @param {Function} error
         */
        aggregate: function({ geometrySourceServiceName, dataSourceServiceName, targetServiceName, aggregations, requested, success, error }) {
            let dataParameters = {
                geometrySourceServiceName: geometrySourceServiceName,
                dataSourceServiceName: dataSourceServiceName,
                targetServiceName: targetServiceName,
                aggregations: JSON.stringify(aggregations)
            };

            let paramString = Object.keys(dataParameters).filter(key => dataParameters[key]).map(key => `${key}=${dataParameters[key]}`).join('&');

            this.__operation(function() {
                return {
                    operation: 'aggregate',
                    dataParameters: paramString,
                    requested: requested,
                    error: error,
                    success: success
                };
            });
        }
    };
    
    return DataAccessService;
    
});
