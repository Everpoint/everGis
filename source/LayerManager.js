sGis.module('sp.LayerManager', [
    'sp.ServiceGroup',
    'sp.Project',
    'sp.services.ServiceContainer',
    'sp.DataFilter',
    'utils'
], function (ServiceGroup, Project, ServiceContainer, DataFilter, utils) {

    /**
     * @alias sGis.sp.LayerManager
     */
    class LayerManager extends ServiceGroup {
        constructor(connector, map) {
            super('__root');
            this._map = map;
            this._connector = connector;
            this._map.addLayer(this.layer);

            this.ready = new Promise((resolve) => this._resolveReady = resolve);
        }

        init(services = []) {
            Promise.all(services.map(name => new Promise(resolve => this.loadWithPromise(name).then(resolve).catch(resolve))))
                .then(this._resolveReady);
        }

        loadService(name, index = -1, parent = null) {
            if (this.getServiceContainer(name, true)) throw new Error(`Service ${name} is already in the list`);

            let container = new ServiceContainer(this._connector, name);
            if (parent) {
                parent.insertService(container, index);
            } else {
                this.insertService(container, index);
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

        updateService(name) {
            let container = this.getServiceContainer(name, true);
            if (!container) utils.error('Service is not in the group');

            let parent = this.getParent(container);
            let index = parent.children.indexOf(container);
            parent.removeService(container);

            this.loadService(name, index, parent);
        }

        replaceService(oldName, newName) {
            let current = this.getServiceContainer(oldName, true);
            if (!current) utils.error('Service is not in the group');

            let parent = this.getParent(current);
            let index = parent.children.indexOf(current);
            parent.removeService(current);

            this.loadService(newName, index, parent);
        }
    }

    Project.registerCustomDataItem('services', ({layerManager}) => {
        if (!layerManager) return;
        return layerManager.children.map(container => saveContainer(container));
    }, (descriptions, {layerManager}) => {
        if (!layerManager || !descriptions) return;


        descriptions.forEach(serviceDesc => {
            let container = layerManager.getServiceContainer(serviceDesc.serviceName, false);
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
        let service = container.service;
        let view = service && service.view || service;

        if (desc.opacity !== undefined) container.layer.opacity = desc.opacity;
        if (desc.resolutionLimits) container.layer.resolutionLimits = desc.resolutionLimits;
        if (desc.isDisplayed !== undefined && container.service) container.service.isDisplayed = desc.isDisplayed;
        if (desc.filter && view && view.setDataFilter)  {
            view.setDataFilter(DataFilter.deserialize(desc.filter));
        } else if (desc.customFilter && view && view.setCustomFilter) {
            view.setCustomFilter(desc.customFilter);
        }
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
            filter: container.service && (
                (container.service.tempFilterApplied && container.service.dataFilter.serialize()) ||
                (container.service.view && container.service.view.tempFilterApplied && container.service.view.dataFilter.serialize())
            ),
            customFilter: container.service && (
                container.service.customFilter ||
                container.service.view && container.service.view.customFilter
            ),
            meta: container.service && container.service.meta,
            children: saveChildren(container.service)
        };
    }

    function saveChildren(service) {
        if (!service || !service.children) return;
        return service.children.map(container => saveContainer(container));
    }


    return LayerManager;

});