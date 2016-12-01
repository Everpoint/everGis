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

    const debug = (v) => {
        console.log(v);
        return v;
    };

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
            services.forEach(name=>{
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
            return LayerManager.getServiceInfo(this._connector, name)
                .then(serviceInfo => debug(this.createService(name, serviceInfo)))
                .then(service=>this.addService(service))
        }

        createService (name, serviceInfo) {
            if (Array.isArray(serviceInfo)) {
                return this.createServiceGroup(name, serviceInfo);
            } else {
                return this.createDataView(serviceInfo);
            }
        }

        createDataView (serviceInfo) {
            let service;
            if (serviceInfo.capabilities && serviceInfo.capabilities.indexOf('tile') >= 0) {
                service = new TileService(this._connector, serviceInfo);
            } else {
                service = new DataViewService(this._connector, serviceInfo);
            }

            return service;
        }

        createServiceGroup (name, serviceInfo) {
            return new ServiceGroup(name, serviceInfo.map(info=>{
                return this.createService(name, info)
            }));
        }

        loadBasemap (name) {
            return LayerManager.getServiceInfo(this._connector, name)
                .then((serviceInfo)=>this.createService(name, serviceInfo))
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
            if (service instanceof TileService && !this._map.tileScheme){
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
            const { layer } = this._services[name];
            if (!layer){
                return;
            }
            this._services[name].off('layerChange' + ns);

            this._layerGroup.removeLayer(layer);
            const index = this._layers.removeId(name);

            this.fire('serviceRemove', {service: this._services[name], index});

            delete this._services[name];
            return index;
        }

        _onServiceLayerChange(service, sGisEvent) {
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
                .then(()=>{
                    this.moveService(name, index);
                });
        }

        toggleService (name) {
            if (this._services[name]) {
                const {isDisplayed} = this._services[name];
                this.fire('serviceToggle', {service: this._services[name]});
                return this._services[name].isDisplayed = isDisplayed !== true;
            }
        }

        /**
         * getService by name
         * @param name {String} service name
         * @returns {Object} service
         */
        getService (name) {
            return this._services[name];
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
         * @param {Object} connector
         * @param {String} name
         * @return {Promise.<Object>}
         */
        static getServiceInfo (connector, name) {
            const url = connector.url + name + '/?_sb=' + connector.sessionId;
            return utils.ajaxp({url})
                .then(([response]) => {
                    try {
                        const serviceInfo = utils.parseJSON(response);

                        if (serviceInfo.error) throw new Error();

                        if (serviceInfo.serviceType === 'LayerGroup') {
                            return Promise.all(serviceInfo.contents.map(name =>
                                LayerManager.getServiceInfo(connector, name))
                            )
                        }

                        return serviceInfo;
                    } catch (e) {
                        throw new Error('Failed to initialize service ' + name);
                    }
                });
        }
    }

    Project.registerCustomDataItem('services', ({ layerManager }) => {
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
    }, (services, { layerManager }) => {
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

    function restoreServiceParameters(service, desc) {
        if (desc.opacity !== undefined) service.layer.opacity = desc.opacity;
        if (desc.resolutionLimits) service.layer.resolutionLimits = desc.resolutionLimits;
        if (desc.isDisplayed !== undefined) service.isDisplayed = desc.isDisplayed;
        if (desc.filter && service.setCustomFilter) service.setCustomFilter(desc.filter);
        if (desc.meta) service.meta = desc.meta;
    }


    return LayerManager;

});