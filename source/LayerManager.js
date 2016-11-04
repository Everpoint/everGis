/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'EventHandler',
    'spatialProcessor.OrderManager',
    'spatialProcessor.MapService',
    'spatialProcessor.mapService.TileService',
    'LayerGroup',
    'spatialProcessor.Project'
], function (utils, EventHandler, OrderManager, MapService, TileService, LayerGroup, Project) {

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
            services.forEach(name=>{
                this.loadService(name);
            });
        }

        loadService (name) {
            const realIndex = this._layers.getIndex(name);
            return MapService.initialize(this._connector, name)
                .then(service => {
                    if (service instanceof TileService && !this._map.tileScheme){
                        this._map.crs = service.layer.crs;
                        this._map.tileScheme = service.layer.tileScheme;
                        this._map.adjustResolution();
                    }
                    if (service.layer) {
                        this.addService(service, realIndex);
                    }

                    return service;
                })
                .catch(message => {
                    utils.error(message);
                });
        }

        loadBasemap (name) {
            return MapService.initialize(this._connector, name)
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

        addService (service, realIndex) {
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
            delete this._services[name];

            this.fire('serviceRemove', index);
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