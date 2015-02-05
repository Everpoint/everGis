(function() {

    sGis.spatialProcessor.controller.DefinitionQuery = function(spatialProcessor, options) {
        this.__initialize(spatialProcessor);
    };

    sGis.spatialProcessor.controller.DefinitionQuery.prototype = new sGis.spatialProcessor.Controller({
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
        }
    });

})();