sGis.module('spatialProcessor.controller.TempView', [
    'spatialProcessor.Controller',
    'spatialProcessor.ControllerManager',
    'spatialProcessor.services.ServiceContainer'
], function(Controller, ControllerManager, ServiceContainer) {
    'use strict';

    class TempView extends Controller {
        constructor(connector) {
            super({ _type: 'tempView' });
            this.createDataViewOnInit = false;
            this.__initialize(connector, {sync: true}, function() {
                this.initialized = true;
                this.fire('initialize');
            });
        }

        resetView({ sourceServiceName, requested, success, error }) {
            this.__operation(function() {
                let params = { sourceServiceName };
                let paramsString = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');

                return {
                    operation: 'resetView',
                    dataParameters: paramsString,
                    success: () => {
                        this._updateView().then(success);
                    },
                    error: error,
                    requested: requested
                };
            });
        }

        get mapService() {
            return this._service;
        }

        get container() { return this._serviceContainer; }

        _updateView() {
            return new Promise((resolve, reject)=>{
                !this._layerName && reject(new Error('Temp view layer name error'));

                this._serviceContainer = new ServiceContainer(this._spatialProcessor, this._layerName);
                this._serviceContainer.once('stateUpdate', () => {
                    this._service = this._serviceContainer.service;
                    this.fire('viewUpdate');

                    !this._service && reject(new Error('State update error'));
                    resolve(this._service);
                });
            });
        }
    }

    ControllerManager.registerController('tempView', TempView);

    return TempView;

});
