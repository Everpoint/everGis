sGis.module('spatialProcessor.controller.ImportData', [
    'spatialProcessor.Controller',
    'spatialProcessor.ControllerManager'
], function(Controller, ControllerMangager) {
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
                var param = 'serviceName=' + properties.serviceName + '&attributeMapping=' + encodeURIComponent(JSON.stringify(properties.attributeMapping));
                if (properties.configuration) {
                    param += '&configuration=' + encodeURIComponent(JSON.stringify(properties.configuration));
                }
                return {
                    operation: 'import',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested,
                    onProgress: properties.onProgress
                };
            });
        }
    });

    ControllerMangager.registerController('importData', ImportData);

    return ImportData;

});
