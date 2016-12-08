/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'EventHandler',
    'spatialProcessor.OrderManager',
    'spatialProcessor.mapService.DataViewService',
    'spatialProcessor.mapService.ServiceGroup',
    'spatialProcessor.mapService.TileService',
    'LayerGroup',
    'spatialProcessor.Project'
], function (utils, EventHandler, OrderManager, DataViewService, ServiceGroup, TileService, LayerGroup, Project) {

    let ns = '.layerManager';

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
            this._layers = new OrderManager();
            this._services = {};
        }

        /**
         * Services
         * @returns {Array.<Object>} Ordered array of init services
         */
        get services () {
            return this._layers.ids
                .map(id=>this._services[id])
                .filter(service=>!!service);
        }

        /**
         * Basemap group
         * @return {Object} sGis.LayerGroup
         */
        get basemaps () {
            return this._basemapGroup;
        }

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
            this._basemapGroup = new LayerGroup();
            this._layerGroup = new LayerGroup();
            this._map.addLayer(this._basemapGroup);
            this._map.addLayer(this._layerGroup);

            this.loadFromSettings(services);
        }

        loadFromSettings (services) {
            services.forEach(name=> {
                this.loadService(name);
            });
        }

        /**
         * loadService
         * @param {String} name
         * @param {String} type "DataView" || "LayerGroup"
         * @return {Promise.<Object>}
         */
        loadService (name) {
            this._layers.getIndex(name);
            return LayerManager.getServiceInfo(name, this._connector)
                .then(serviceInfo => LayerManager.createService(serviceInfo, this._connector))
                .then(service => this.addService(service))
        }

        loadBasemap (name) {
            return LayerManager.getServiceInfo(name, this._connector)
                .then((serviceInfo)=>LayerManager.createService(serviceInfo, this._connector))
                .catch(message => {
                    utils.error(message);
                });
        }

        setBasemap (service) {
            this.basemaps.layers = [];
            this.basemaps.addLayer(service.layer);
            this.activeBasemap = service;

            this.fire('baseMapChanged');
        }

        addService (service) {
            if (service instanceof TileService && !this._map.tileScheme) {
                this._map.crs = service.layer.crs;
                this._map.tileScheme = service.layer.tileScheme;
                this._map.adjustResolution();
            }

            const realIndex = this._layers.getIndex(service.name);
            const index = this._layers.getCurrentIndex(realIndex, service.name);
            this._services[service.name] = service;
            service.on('layerChange' + ns, this._onServiceLayerChange.bind(this, service));

            this._layerGroup.insertLayer(service.layer, index);

            this.fire('serviceAdd', {service, index: realIndex});
        }

        removeService (name) {
            const service = this.getService(name);
            const parent = this.getParent(name);

            if (!service || !service.layer) {
                return;
            }

            service.off('layerChange' + ns);

            if(parent) {
                parent.removeService(service.name)
            } else {
                this._layerGroup.removeLayer(service.layer);
                this._layers.removeId(service.name);
                delete this._services[service.name];
            }

            this.fire('serviceRemove', {service});

            return service.name;
        }

        _onServiceLayerChange (service, sGisEvent) {
            let layer = service.layer;
            let prevLayer = sGisEvent.prevLayer;

            let index = this._layerGroup.indexOf(prevLayer);
            this._layerGroup.removeLayer(prevLayer);
            this._layerGroup.insertLayer(layer, index);
        }

        moveService (name, direction) {
            const newIndex = this._layers.moveId(name, direction);
            const service = this._services[name];
            this._layerGroup.insertLayer(service.layer, newIndex);
            this.fire('serviceMove', {service, index: newIndex});
            return newIndex;
        }

        updateService (name) {
            const count = this._layers.ids.length;
            const index = (this.removeService(name, true) + 1) - count;

            this.loadService(name)
                .then(()=> {
                    this.moveService(name, index);
                });
        }

        toggleService (name) {
            const service = this.getService(name);
            if (service) {
                const {isDisplayed} = service;
                this.fire('serviceToggle', {service});
                return service.isDisplayed = isDisplayed !== true;
            }
        }

        getParent (path) {
            if (path.length < 2 || !Array.isArray(path)) return;
            return this.getService(path.splice(0, path.length-1))
        }

        /**
         * getService by name or path
         * @param name {String|Array<String>} service name
         * @returns {Object} service
         */
        getService (serviceName) {
            serviceName = [].concat(serviceName);

            const services = this._services;
            let tempService;
            serviceName.forEach((name, i)=>{
                if(i===0){
                    tempService = this._services[name]
                } else if(tempService.children){
                    tempService = tempService.getService(name);
                }
            });
            return tempService;
        }

        /**
         * getDisplayedServiceList
         * @returns {Array.<Object>} visible layers
         */
        getDisplayedServiceList () {
            return this.services.filter(service => service.isDisplayed && service.layer);
        }

        /**
         * getServiceInfo
         * @param {String} name
         * @param {Object} connector
         * @return {Promise.<Object>}
         */
        static getServiceInfo (name, connector) {
            const url = connector.url + name + '/?_sb=' + connector.sessionId;
            return utils.ajaxp({url})
                .then(([response]) => {
                    try {
                        const serviceInfo = utils.parseJSON(response);
                        serviceInfo.name = name;

                        if (serviceInfo.error) throw new Error();

                        if (serviceInfo.serviceType === 'LayerGroup') {
                            return Promise
                                .all(serviceInfo.contents.map(name =>LayerManager.getServiceInfo(name, connector)))
                                .then(info=>{
                                    serviceInfo.contents = info;
                                    return serviceInfo;
                                })
                        }

                        return serviceInfo;
                    } catch (e) {
                        throw new Error('Failed to initialize service ' + name);
                    }
                });
        }

        /**
         * Create MapService
         * @param {Object} serviceInfo
         * @param {Object} connector
         * @return {Object} MapService
         */
        static createService (serviceInfo, connector) {
            if (serviceInfo.contents) {
                return LayerManager._createServiceGroup(serviceInfo, connector);
            } else {
                return LayerManager._createDataView(serviceInfo, connector);
            }
        }

        static _createDataView (serviceInfo, connector) {
            let service;
            if (serviceInfo.capabilities && serviceInfo.capabilities.indexOf('tile') >= 0) {
                service = new TileService(serviceInfo.name, connector, serviceInfo);
            } else {
                service = new DataViewService(serviceInfo.name, connector, serviceInfo);
            }

            return service;
        }

        static _createServiceGroup (serviceInfo, connector) {
            return new ServiceGroup(serviceInfo.name, serviceInfo, serviceInfo.contents.map(child=> {
                return LayerManager.createService(child, connector)
            }));
        }
    }

    Project.registerCustomDataItem('services', ({layerManager}) => {
        if (!layerManager) return;
        return layerManager.services.map(service => {
            return {
                serviceName: service.name,
                opacity: service.layer && service.layer.opacity,
                resolutionLimits: service.layer && service.layer.resolutionLimits,
                isDisplayed: service.isDisplayed,
                filter: service.customFilter,
                meta: service.meta
            };
        });
    }, (services, {layerManager}) => {
        if (!layerManager || !services) return;

        services.forEach(serviceDesc => {
            let service = layerManager.getService(serviceDesc.serviceName);
            if (service) return restoreServiceParameters(service, serviceDesc);
            layerManager.loadService(serviceDesc.serviceName)
                .then(service => {
                    restoreServiceParameters(service, serviceDesc);
                });
        });
    });

    function restoreServiceParameters (service, desc) {
        if (desc.opacity !== undefined) service.layer.opacity = desc.opacity;
        if (desc.resolutionLimits) service.layer.resolutionLimits = desc.resolutionLimits;
        if (desc.isDisplayed !== undefined) service.isDisplayed = desc.isDisplayed;
        if (desc.filter && service.setCustomFilter) service.setCustomFilter(desc.filter);
        if (desc.meta) service.meta = desc.meta;
    }


    return LayerManager;

});