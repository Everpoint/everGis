sGis.module('spatialProcessor.controller.TempView', [
    'spatialProcessor.Controller',
    'spatialProcessor.ControllerManager',
    'spatialProcessor.services.ServiceContainer'
], function(Controller, ControllerManager) {
    'use strict';

    class TempView extends Controller {
        constructor(connector) {
            super({ _type: 'tempView' });
            this.__initialize(connector, {sync: true}, function(servicePromise) {
                servicePromise.then(() => {
                    this.initialized = true;
                    this.fire('initialize');
                });
            });
        }

        resetView({ sourceServiceName, requested, success, error }) {
            this.__operation(function() {
                let params = { sourceServiceName };
                let paramsString = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');

                return {
                    operation: 'resetView',
                    dataParameters: paramsString,
                    success: success,
                    error: error,
                    requested: requested
                };
            });
        }

        get mapService() {
            return this._service;
        }
    }

    ControllerManager.registerController('tempView', TempView);

    return TempView;

});
