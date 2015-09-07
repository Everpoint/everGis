'use strict';

(function() {

    sGis.spatialProcessor.controller.Stats = function(spatialProcessor, options) {
        this.__initialize(spatialProcessor, {sync: true}, function() {
            this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, {map: options.map, display: this._display});
            this.initialized = true;
            this.fire('initialize');
        });
    };

    sGis.spatialProcessor.controller.Stats.prototype = new sGis.spatialProcessor.Controller({
        _type: 'maxtistic',

        build: function(properties) {
            var param = 'storageId=' + properties.storageId;
            if (properties.objectIds) param += '&objectIds=' + JSON.stringify(properties.objectIds);

            this.__operation(function() {
                return {
                    operation: 'build',
                    dataParameters: param,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        },

        highlight: function(properties) {
            this.__operation(function() {
                return {
                    operation: 'maxlight',
                    dataParameters: 'highlightId=' + properties.highlightId,
                    success: properties.success,
                    error: properties.error,
                    requested: properties.requested
                };
            });
        }
    });


})();