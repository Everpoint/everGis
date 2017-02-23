sGis.module('sp.services.ServiceGroup', [
    'sp.ServiceGroup',
    'sp.services.ServiceContainer'
], (ServiceGroup, ServiceContainer) => {
    'use strict';

    class ServiceGroupService extends ServiceGroup {
        constructor(name, connector, serviceInfo) {
            let children = serviceInfo.childrenInfo
                .map(info => new ServiceContainer(connector, info.name, {
                    serviceInfo: info,
                    isDisplayed: serviceInfo.contents.find(({name})=>name === info.name).isVisible
                }));
            super(name, { children, alias: serviceInfo.alias });

            this._serviceInfo = serviceInfo;

            this._initializationPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this._updateChildLayers();
                    resolve();
                }, 0);
            });
        }

        get serviceInfo() { return this._serviceInfo; }

        get initializationPromise() {
            return this._initializationPromise;
        }

        get permissions() { return this.serviceInfo.permissions; }
    }

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'LayerGroup', ServiceGroupService);

    return ServiceGroupService;

});