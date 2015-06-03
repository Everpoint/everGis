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
    }
};

Object.defineProperties(sGis.spatialProcessor.DataAccessService.prototype, {
    
});

})();