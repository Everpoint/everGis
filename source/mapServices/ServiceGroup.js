sGis.module('spatialProcessor.mapService.ServiceGroup', [
    'LayerGroup',
    'EventHandler'
], (LayerGroup, EventHandler) => {
    'use strict';

    class ServiceGroup extends EventHandler {
        constructor(name, services) {
            super();
            this._name = name;
            this._services = services;
            this._layer = new LayerGroup(services.map(service=>ServiceGroup.createLayers(service)));
        }

        get name() {return this._name}
        get layer() { return this._layer; }
        get children() { return this._services; }

        static createLayers (service) {
            if(Array.isArray(service)) {
                return new LayerGroup(service.map(s=>ServiceGroup.createLayers(s)));
            } else if(service.layer) {
                return service.layer;
            }
        }
    }

    return ServiceGroup;

});