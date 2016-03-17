'use strict';

(function() {

/**
 * Object for interactions with SpatialProcessor Data Access Service
 * @param {sGis.spatialProcessor.Connector} serverConnector
 * @param {String} name - name of the service on server
 * @constructor
 */
sGis.spatialProcessor.DataAccessService = function(serverConnector, name) {
    this._sp = serverConnector;
    this._spatialProcessor = serverConnector;

    this._url = this._spatialProcessor.url;
    this._id = name;

    this._operationQueue = [];
};

    //TODO: this operations should be united with controller operations
sGis.spatialProcessor.DataAccessService.prototype = {
    __operation: sGis.spatialProcessor.Controller.prototype.__operation,
    query: sGis.spatialProcessor.Controller.prototype.query,
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
                dataParameters: 'storageId=' + properties.storageId + '&query=' + properties.query,
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

    copy: function(properties) {
        var dataParameters = 'id=' + properties.targetStorageId + '&sourceStorage=' + properties.sourceStorageId;
        if (properties.items) dataParameters += '&items=' + encodeURIComponent(JSON.stringify(properties.items));

        this.__operation(function() {
            return {
                operation: 'copy',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },
};

Object.defineProperties(sGis.spatialProcessor.DataAccessService.prototype, {
    
});

})();