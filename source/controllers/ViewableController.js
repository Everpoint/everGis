sGis.module('sp.controllers.ViewableController', [
    'sp.controllers.Controller',
    'sp.services.ServiceContainer'
], (Controller, ServiceContainer) => {
    'use strict';

    class ViewableController extends Controller {
        constructor(type, connector, properties) {
            super(type, connector, properties);
            this.initializationPromise.then(this._checkInitialization.bind(this));
        }

        _checkInitialization() {
            if (!this.initData.DataViewServiceName) throw new Error(`Controller ${this.type} initialization failed: server did not return view name.`);
        }

        updateView() {
            return new Promise((resolve, reject) => {
                this.initializationPromise.then(() => {
                    let viewName = this.initData.DataViewServiceName;
                    let container = new ServiceContainer(this.connector, viewName);

                    container.once('stateUpdate', () => {
                        if (container.service && container.service.layer) {
                            this._service = container.service;
                            resolve();
                        } else {
                            reject(`Controller ${this.type} update failed: failed to update view.`);
                        }
                    });
                });
            });
        }

        get service() { return this._service; }
    }

    return ViewableController;

});