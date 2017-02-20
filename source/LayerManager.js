sGis.module('spatialProcessor.LayerManager', [
    'spatialProcessor.ServiceGroup',
    'spatialProcessor.Project',
    'spatialProcessor.services.ServiceContainer'
], function (ServiceGroup, Project, ServiceContainer) {

    /**
     * @alias sGis.spatialProcessor.LayerManager
     */
    class LayerManager extends ServiceGroup {
        constructor(connector, map) {
            super('__root');
            this._map = map;
            this._connector = connector;
        }

        init(services = []) {
            this._map.addLayer(this.layer);
            services.forEach(name => this.loadService(name));
        }

        loadService(name, index = -1, parent = null) {
            if (this.getService(name, true)) throw new Error(`Service ${name} is already in the list`);

            let container = new ServiceContainer(this._connector, name);
            if (parent) {
                parent.insertService(container);
            } else {
                this.insertService(container);
            }

            return container;
        }

        loadWithPromise(name, parent) {
            return new Promise((resolve, reject) => {
                let container = this.loadService(name, -1, parent);
                container.on('stateUpdate', () => {
                    if (container.service) {
                        resolve(container);
                    } else {
                        reject();
                    }
                });
            });
        }

        updateService (name) {
            let service = this.getService(name, false);
            let index = this.children.indexOf(service);
            this.removeService(service);
            this.loadService(name, index);
        }
    }

    Project.registerCustomDataItem('services', ({layerManager}) => {
        if (!layerManager) return;
        return layerManager.children.map(container => saveContainer(container));
    }, (descriptions, {layerManager}) => {
        if (!layerManager || !descriptions) return;


        descriptions.forEach(serviceDesc => {
            let container = layerManager.getService(serviceDesc.serviceName, false);
            if (container) return restoreServiceParameters(container, serviceDesc, layerManager);

            restoreService(layerManager, serviceDesc);
        });
    });

    function restoreService(layerManager, serviceDesc, parent) {
        if (serviceDesc.isFolder) {
            let service = new ServiceGroup(serviceDesc.serviceName, { alias: serviceDesc.alias });
            let container = new ServiceContainer(layerManager._connector, serviceDesc.serviceName, { service });
            (parent || layerManager).insertService(container);
            return restoreServiceParameters(container, serviceDesc, layerManager);
        }

        layerManager.loadWithPromise(serviceDesc.serviceName, parent)
            .then(service => {
                restoreServiceParameters(service, serviceDesc, layerManager);
            })
            .catch(() => {});
    }

    function restoreServiceParameters (container, desc, layerManager) {
        if (desc.opacity !== undefined) container.layer.opacity = desc.opacity;
        if (desc.resolutionLimits) container.layer.resolutionLimits = desc.resolutionLimits;
        if (desc.isDisplayed !== undefined && container.service) container.service.isDisplayed = desc.isDisplayed;
        if (desc.filter && container.service && container.service.setCustomFilter) container.service.setCustomFilter(desc.filter);
        if (desc.meta && container.service) container.service.meta = desc.meta;

        if (desc.isFolder && desc.children) {
            desc.children.forEach(child => {
                restoreService(layerManager, child, container.service);
            });
        } else if (desc.children && container.service && container.service.children) {
            container.service.children.forEach(child => {
                let childDesc = desc.children.find(x => x.serviceName === child.name);
                if (childDesc) restoreServiceParameters(child, childDesc);
            });
        }
    }

    function saveContainer(container) {
        return {
            serviceName: container.name,
            isFolder: container.service && container.service instanceof ServiceGroup,
            alias: container.service && container.service.alias,
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