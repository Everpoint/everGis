sGis.module('spatialProcessor.services.ServiceContainer', [
    'FeatureLayer',
    'EventHandler',
    'utils',
    'spatialProcessor.utils',
], (FeatureLayer, EventHandler, utils) => {

    'use strict';

    let serviceTypeRegistry = [];

    class ServiceContainer extends EventHandler {
        constructor(connector, serviceName, serviceInfo) {
            super();

            this._connector = connector;
            this._name = serviceName;
            this._emptyLayer = new FeatureLayer();

            this._init(serviceInfo);
        }

        get url() { return this._connector.url + this._name; }
        get name() { return this._name; }

        _init(serviceInfo) {
            let promise = serviceInfo ? Promise.resolve(serviceInfo) : this._loadServiceInfo();

            promise.then(serviceInfo => {
                    serviceInfo.name = name;

                    if (serviceInfo.error) throw new Error(serviceInfo.error.message);
                    return this._createService(serviceInfo);
                })
                .catch(error => {
                    this._failInitialization(error.message || 'Unknown error');
                })
                .then(() => {
                    this.fire('stateUpdate');
                });
        }

        _loadServiceInfo() {
            const url = this.url + '/?_sb=' + this._connector.sessionId;
            return utils.ajaxp({url})
                .then(([response]) => {
                    return utils.parseJSON(response);
                });
        }

        _failInitialization(error) {
            console.error(error);
            this._error = error;
            this.fire('stateUpdate');
        }

        _createService(serviceInfo) {
            for (let i = 0; i < serviceTypeRegistry.length; i++) {
                if (serviceTypeRegistry[i].condition(serviceInfo)) {
                    this._service = new serviceTypeRegistry[i].constructor(this._name, this._connector, serviceInfo);
                    this._service.on('visibilityChange childUpdate layerChange', this._fireUpdate.bind(this));
                    if (this._service.layer) {
                        this._service.layer.opacity = this._emptyLayer.opacity;
                        this._service.layer.resolutionLimits = this._emptyLayer.resolutionLimits;
                        this._service.isDisplayed = this._emptyLayer.isDisplayed;
                    }
                    return this._service.initializationPromise;
                }
            }

            this._failInitialization('Unknown service configuration');
        }

        _fireUpdate() {
            this.fire('stateUpdate');
        }

        get error() { return this._error; }
        get service() { return this._service; }

        static register(condition, constructor) {
            serviceTypeRegistry.push({ condition, constructor });
        }

        get layer() { return this._service && this._service.layer || this._emptyLayer; }
    }

    return ServiceContainer;

});