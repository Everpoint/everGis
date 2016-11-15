sGis.module('spatialProcessor.controller.DefinitionQuery', [
    'spatialProcessor.Controller'
], function(Controller) {
    'use strict';

    var DefinitionQuery = function(spatialProcessor, options) {
        this.__initialize(spatialProcessor, {}, function() {
            this.initialized = true;
            this.fire('initialize');
        });
    };

    DefinitionQuery.prototype = new sGis.spatialProcessor.Controller({
        _type: 'definitionQuery',

        setDefinitionQuery: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'setDefinitionQuery',
                    dataParameters: 'storageId=' + properties.storageId + '&definitionQuery=' + encodeURIComponent(properties.definitionQuery),
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        getAttributes: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'getAttributes',
                    dataParameters: 'storageId=' + properties.storageId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

    return DefinitionQuery;
    
});
