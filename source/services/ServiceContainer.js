sGis.module('spatialProcessor.services.ServiceContainer', [
    'FeatureLayer',
    'EventHandler',
    'utils',
    'spatialProcessor.utils',
], (FeatureLayer, EventHandler, utils) => {

    'use strict';

    let serviceTypeRegistry = [];

    class ServiceContainer extends EventHandler {
        constructor(connector, serviceName, {serviceInfo, service, isDisplayed}={}) {
            super();

            this._connector = connector;
            this._name = serviceName;
            this._emptyLayer = new FeatureLayer();

            if (service) {
                this._initWithService(service);
            } else {
                this._init(serviceInfo, isDisplayed);
            }
        }

        get url() { return this._connector.url + this._name; }
        get name() { return this._name; }

        get localName() { return this._service && this._service.localName; }

        _initWithService(service) {
            this._service = service;
            this._setListeners(service);
        }

        _setListeners(service) {
            service.on('visibilityChange childUpdate layerChange', this._fireUpdate.bind(this));
            service.on('stateUpdate', this.forwardEvent.bind(this));
        }

        _init(serviceInfo, isDisplayed) {
            let promise = serviceInfo ? Promise.resolve(serviceInfo) : this._loadServiceInfo();

            promise.then(serviceInfo => {
                    serviceInfo.name = name;

                    if (serviceInfo.error) throw new Error(serviceInfo.error.message);
                    return this._createService(serviceInfo, isDisplayed);
                })
                .catch(error => {
                    this._failInitialization(error.message || 'Unknown error');
                })
                .then(() => {
                    this.fire('stateUpdate');
                });
        }

        _loadServiceInfo() {
            const url = this.url + '/' + (this._connector.sessionId ? '?_sb=' + this._connector.sessionId : '');
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

        _createService(serviceInfo, isDisplayed) {
            for (let i = 0; i < serviceTypeRegistry.length; i++) {
                if (serviceTypeRegistry[i].condition(serviceInfo)) {
                    this._service = new serviceTypeRegistry[i].constructor(this._name, this._connector, serviceInfo);
                    this._setListeners(this._service);
                    if (this._service.layer) {
                        this._service.layer.opacity = this._emptyLayer.opacity;
                        this._service.layer.resolutionLimits = this._emptyLayer.resolutionLimits;
                        this._service.isDisplayed = isDisplayed === undefined ? this._emptyLayer.isDisplayed : isDisplayed;
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