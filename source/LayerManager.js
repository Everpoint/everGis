/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'EventHandler',
    'spatialProcessor.Project',
    'spatialProcessor.services.ServiceContainer',
    'LayerGroup'
], function (utils, EventHandler, Project, ServiceContainer, LayerGroup) {

    /**
     * @alias sGis.spatialProcessor.LayerManager
     */
    class LayerManager extends EventHandler {
        /**
         * @constructor
         * @param {Object} map
         * @param {Object} api
         * @param {Object} connector
         * @param painter
         */
        constructor (connector, map, api, painter) {
            super();
            this._map = map;
            this._api = api;
            this._connector = connector;
            this._painter = painter;
            this._containers = [];
        }

        get containers() { return this._containers; }

        /**
         * Layer group
         * @return {Object} sGis.LayerGroup
         */
        get layers () {
            return this._layerGroup;
        }

        /**
         *
         * @param services {Array} array of service names from settings
         */
        init (services = []) {
            // this._basemapGroup = new LayerGroup();
            this._layerGroup = new LayerGroup();
            // this._map.addLayer(this._basemapGroup);
            this._map.addLayer(this._layerGroup);

            this.loadFromSettings(services);
        }

        loadFromSettings (services) {
            services.forEach(name=> {
                this.loadService(name);
            });
        }

        loadService (name, index = -1) {
            if (this.getService(name)) throw new Error(`Service ${name} is already in the list`);

            let container = new ServiceContainer(this._connector, name);
            container.on('stateUpdate', this._updateService.bind(this, container));

            if (index < 0 || index > this._containers.length) index = this._containers.length;
            this._containers.splice(index, 0, container);
            this._layerGroup.insertLayer(container.layer, index);

            this.fire('serviceAdd');

            return container;
        }

        loadWithPromise(name) {
            return new Promise((resolve, reject) => {
                let container = this.loadService(name);
                container.on('stateUpdate', () => {
                    if (container.service) {
                        resolve(container);
                    } else {
                        reject();
                    }
                });
            });
        }

        _updateService(container) {
            if (this._layerGroup.contains(container.layer)) {
                this.fire('serviceUpdate');
                return;
            }

            let index = this._layerGroup.indexOf(container.placeholderLayer);
            if (index !== -1) {
                this._layerGroup.removeLayer(container.placeholderLayer);
            } else {
                index = this._layerGroup.layers.length;
            }
            this._layerGroup.insertLayer(container.layer, index);
            this.fire('serviceUpdate');
        }

        removeService (name) {
            const container = this.getService(name, false);

            if (!container) {
                return;
            }

            this._layerGroup.removeLayer(container.layer);
            this._containers.splice(this._containers.indexOf(container), 1);

            this.fire('serviceRemove', {container});

            return container.name;
        }

        moveService (name, direction) {
            let container = this._containers.find(x => x.name === name);
            let currIndex = this._containers.indexOf(container);
            let index = currIndex + direction;
            if (index < 0 || index >= this._containers.length) return;

            this._containers = utils.arrayMove(this._containers, currIndex, index);
            this._layerGroup.insertLayer(container.layer, index);
            this.fire('serviceMove', { serviceContainer: container, index });

            return index;
        }

        updateService (name) {
            let index = this._containers.indexOf(this.getService(name, false));
            this.removeService(name);
            this.loadService(name, index);
        }

        getService (serviceName, recurse = true) {
            for (let i = 0; i < this._containers.length; i++) {
                if (this._containers[i].name === serviceName) return this._containers[i];
                if (recurse && this._containers[i].service && this._containers[i].service.getService) {
                    let result = this._containers[i].service.getService(serviceName);
                    if (result) return result;
                }
            }

            return null;
        }

        /**
         * getDisplayedServiceList
         * @returns {Array.<Object>} visible layers
         */
        getDisplayedServiceList () {
            return this.getServiceList().filter(service => service.layer && service.isDisplayed && !(service.layer instanceof LayerGroup));
        }

        getServiceList() {
            let services = [];
            for (let i = 0; i < this._containers.length; i++) {
                if (this._containers[i].service) {
                    services.push(this._containers[i].service);
                    if (this._containers[i].service.getServices) services = services.concat(this._containers[i].service.getServices(true));
                }
            }
            return services;
        }
    }

    Project.registerCustomDataItem('services', ({layerManager}) => {
        if (!layerManager) return;
        return layerManager.containers.map(container => saveContainer(container));
    }, (descriptions, {layerManager}) => {
        if (!layerManager || !descriptions) return;


        descriptions.forEach(serviceDesc => {
            let container = layerManager.getService(serviceDesc.serviceName, false);
            if (container) return restoreServiceParameters(container, serviceDesc);
            layerManager.loadWithPromise(serviceDesc.serviceName)
                .then(service => {
                    restoreServiceParameters(service, serviceDesc);
                })
                .catch(() => {});
        });
    });

    function restoreServiceParameters (container, desc) {
        if (desc.opacity !== undefined) container.layer.opacity = desc.opacity;
        if (desc.resolutionLimits) container.layer.resolutionLimits = desc.resolutionLimits;
        if (desc.isDisplayed !== undefined && container.service) container.service.isDisplayed = desc.isDisplayed;
        if (desc.filter && container.service && container.service.setCustomFilter) container.service.setCustomFilter(desc.filter);
        if (desc.meta && container.service) container.service.meta = desc.meta;
        if (desc.children && container.service && container.service.children) {
            container.service.children.forEach(child => {
                let childDesc = desc.children.find(x => x.serviceName === child.name);
                if (childDesc) restoreServiceParameters(child, childDesc);
            });
        }
    }

    function saveContainer(container) {
        return {
            serviceName: container.name,
            opacity: container.layer && container.layer.opacity,
            resolutionLimits: container.layer && container.layer.resolutionLimits,
            isDisplayed: container.service && container.service.isDisplayed,
            filter: container.service && container.service.customFilter,
            meta: container.service && container.service.meta,
            children: saveChildren(container.service)
        };
    }

    function saveChildren(service) {
        if (!service.children) return;
        return service.children.map(container => saveContainer(container));
    }


    return LayerManager;

});