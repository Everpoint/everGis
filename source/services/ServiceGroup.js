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
            this._children = serviceInfo.contents.map(childName => {
                let container = new ServiceContainer(connector, childName);
                container.once('stateUpdate', this._updateChildLayers.bind(this));
                return container;
            });
            this._serviceInfo = serviceInfo;
            this._isDisplayed = true;
            this._layer = new LayerGroup();
        }

        get name() {return this._name}
        get layer() { return this._layer; }
        get children() { return this._children; }
        get serviceInfo() { return this._serviceInfo; }

        get isDisplayed() { return this._isDisplayed; }
        set isDisplayed(bool) {
            if (this._isDisplayed !== bool) {
                this._isDisplayed = bool;
                if (this.layer) this.layer.isDisplayed = bool;
                this.fire('visibilityChange');
            }
        }

        _updateChildLayers() {
            this._layer.layers = this._children.filter(container => container.service && container.service.layer).map(container => container.service.layer);
            this.fire('childUpdate');
        }

        getService(serviceName) {
            let tempService = this._children.filter(({name})=>name===serviceName)[0];
            if (tempService) {
                return tempService;
            } else {
                this._children.forEach(service =>{
                    if(service.children) {
                        let s = service.getService(serviceName);
                        if(s) {
                            tempService = s;
                        }
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
                if (recurse && c.service.getServices) c = c.concat(c.service.getServices(true));
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
    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'LayerGroup', ServiceGroup);

    return ServiceGroup;

});