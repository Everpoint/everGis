sGis.module('spatialProcessor.services.ServiceGroup', [
    'LayerGroup',
    'EventHandler',
    'spatialProcessor.services.ServiceContainer'
], (LayerGroup, EventHandler, ServiceContainer) => {
    'use strict';

    class ServiceGroup extends EventHandler {
        constructor(name, connector, serviceInfo) {
            super();
            this._name = name;
            this._connector = connector;
            this._children = serviceInfo.childrenInfo.map(info => new ServiceContainer(connector, info.name, info));

            this._serviceInfo = serviceInfo;
            this._isDisplayed = true;
            this._layer = new LayerGroup();

            this._initializationPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this._setForwardListeners();
                    this._updateChildLayers();
                    resolve();
                }, 0);
            });
        }

        get name() { return this._name}
        get layer() { return this._layer; }
        get children() { return this._children; }
        get serviceInfo() { return this._serviceInfo; }
        get alias() { return this.serviceInfo && this.serviceInfo.alias; }

        get isDisplayed() { return this._isDisplayed; }
        set isDisplayed(bool) {
            if (this._isDisplayed !== bool) {
                this._isDisplayed = bool;
                if (this.layer) this.layer.isDisplayed = bool;
                this.fire('visibilityChange');
            }
        }

        _setForwardListeners() {
            this._children.forEach(container => {
                if (container.service) {
                    container.service.on('visibilityChange', this.forwardEvent.bind(this));
                }
            });
        }

        _updateChildLayers() {
            this._layer.layers = this._children.filter(container => container.service && container.service.layer).map(container => container.service.layer);
            // this.fire('childUpdate');
        }

        getService(serviceName) {
            let tempService = this._children.filter(({name})=>name===serviceName)[0];
            if (tempService) {
                return tempService;
            } else {
                this._children.forEach(container =>{
                    if (!container.service || !container.service.children) return;

                    let s = container.service.getService(serviceName);
                    if(s) {
                        tempService = s;
                    }
                });

                return tempService;
            }
        }

        getServices(recurse) {
            let children = [];
            this._children.forEach(c => {
                if (!c.service) return;
                children.push(c.service);
                if (recurse && c.service.getServices) children = children.concat(c.service.getServices(true));
            });

            return children;
        }

        removeService(serviceName) {
            const {layer} = this.getService(serviceName);
            this._layer.removeLayer(layer);
            this._children = this._children.filter(({name})=>name!==serviceName);
        }

        static createLayers (service) {
            if(Array.isArray(service)) {
                return new LayerGroup(service.map(s=>ServiceGroup.createLayers(s)));
            } else if(service.layer) {
                return service.layer;
            }
        }

        get initializationPromise() {
            return this._initializationPromise;
        }
    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'LayerGroup', ServiceGroup);

    return ServiceGroup;

});