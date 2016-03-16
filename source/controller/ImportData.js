(function() {

    'use strict';

    var ImportData = function(connector, options) {
        this.__initialize(connector, {}, function() {

        });
    };

    ImportData.prototype = new sGis.spatialProcessor.Controller({
        _type: 'importData',

        load: function(properties) {
            this.__operation(function() {
                var param = 'uploadSlot=' + properties.fileId + '&type="Всё что угодно"';
                if (properties.configuration) {
                    param += '&configuration=' + encodeURIComponent(JSON.stringify(properties.configuration));
                }


                return {
                    operation: 'load',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        import: function(properties) {
            this.__operation(function() {
                var param = 'storageId=' + properties.storageId + '&attributeMapping=' + encodeURIComponent(JSON.stringify(properties.attributeMapping));
                if (properties.configuration) {
                    param += '&configuration=' + encodeURIComponent(JSON.stringify(properties.configuration));
                }
                return {
                    operation: 'import',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        getProgress: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'getProgress',
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });

    sGis.spatialProcessor.controller.ImportData = ImportData;

})();