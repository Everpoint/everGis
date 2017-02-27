sGis.module('sp.DataAccessService', [
    'sp.Controller'
], function(Controller) {
    'use strict';

    /**
     * Object for interactions with SpatialProcessor Data Access Service
     * @param {sGis.sp.Connector} serverConnector
     * @param {String} name - name of the service on server
     * @constructor
     */
    var DataAccessService = function(serverConnector, name) {
        this._sp = serverConnector;
        this._spatialProcessor = serverConnector;

        this._url = this._spatialProcessor.url;
        this.name = this.id = this._id = name;

        this._operationQueue = [];

        this.initializationPromise = new Promise(resolve => { resolve(); });
    };

    //TODO: this operations should be united with controller operations
    DataAccessService.prototype = {
        type: 'DataAccessService',
        _operation: sGis.sp.Controller.prototype._operation,
        __operation: sGis.sp.Controller.prototype.__operation,
        query: sGis.sp.Controller.prototype.query,
        save: sGis.sp.Controller.prototype.save,
        createObject: sGis.sp.Controller.prototype.createObject,
        autoComplete: sGis.sp.Controller.prototype.autoComplete,
        reshape: sGis.sp.Controller.prototype.reshape,
        cut: sGis.sp.Controller.prototype.cut,
        serializeGeometry: sGis.sp.Controller.prototype.serializeGeometry,
        _createFeatures: sGis.sp.Controller.prototype._createFeatures,

        queryByGeometry: function(properties) {
            let { serviceName, geometry, resolution } = properties;
            let serialized = this.serializeGeometry(geometry);
            return this._operation('queryByGeometry', { serviceName, geometry: serialized, resolution }).then(response => {
                return this._createFeatures(response, geometry.crs);
            });
        },

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
                                templates.push(new sGis.sp.Template(response.content[i].Content, response.content[i].FileName));
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

        projectGeometry: sGis.sp.Controller.prototype.projectGeometry,

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
        },

        batchEdit: function({ serviceName, attribute, expression, condition, requested, success, error }) {
            let dataParameters = { serviceName, attribute, expression: encodeURIComponent(expression), condition };
            let paramString = Object.keys(dataParameters).filter(key => dataParameters[key]).map(key => `${key}=${dataParameters[key]}`).join('&');

            this.__operation(function() {
                return {
                    operation: 'batchFuncEdit',
                    dataParameters: paramString,
                    requested: requested,
                    error: error,
                    success: success
                };
            });
        },

        geocode: function({ query, crs, providers, requested, error, success }) {
            let dataParameters = { query: encodeURIComponent(query), sr: crs.stringDescription, providers: providers && JSON.stringify(providers) };
            let paramString = Object.keys(dataParameters).filter(key => dataParameters[key]).map(key => `${key}=${dataParameters[key]}`).join('&');

            this.__operation(function() {
                return {
                    operation: 'geocode',
                    dataParameters: paramString,
                    requested: requested,
                    error: error,
                    success: success
                };
            });
        },

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
        },

        /**
         * Build isochrone from the center of every object in the given storage
         * @param {Object} properties
         * @param {Number} properties.duration - time in seconds for isochrone limit
         * @param {String} properties.solver - name of the route builder backend
         * @param {String} properties.sourceServiceName - name of the service of the source geometries
         * @param {String} properties.targetServiceName - name of the service the isochrones will be saved to
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
                var sourceServiceName = 'sourceServiceName=' + properties.sourceServiceName;
                var targetServiceName = 'targetServiceName=' + properties.targetServiceName;

                var param = [duration, solver, sourceServiceName, targetServiceName].join('&');

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
    };
    
    return DataAccessService;
    
});
