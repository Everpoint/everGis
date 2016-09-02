/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'EventHandler',
    'spatialProcessor.OrderManager',
    'spatialProcessor.MapService',
    'spatialProcessor.mapService.TileService',
    'LayerGroup'
], function (utils, EventHandler, OrderManager, MapService, TileService, LayerGroup) {

    /**
     * @alias sGis.spatialProcessor.LayerManager
     */
    class LayerManager extends EventHandler {
        /**
         * @constructor
         * @param {Object} map
         * @param {Object} api
         * @param {Object} connector
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
        get services() {
            return [this._services[ActiveBasemapSymbol]].concat(
                this._layers.ids.map(id=>this._services[id])
            ).filter(service=>!!service);
        }

        /**
         *
         * @param services {Array} array of service names from settings
         */
        init (services) {
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
                    if (service.layer) {
                        this.addService(service, realIndex);
                    }
                })
                .catch(message => {
                    utils.error(message);
                });
        }

        addService (service, realIndex) {
            const index = this._layers.getCurrentIndex(realIndex, service.name);
            this._services[service.name] = service;

            this._layerGroup.insertLayer(service.layer, index);

            this.fire('serviceAdd', {service, index: realIndex});
        }

        removeService (name) {
            const { layer } = this._services[name];
            if (!layer){
                return;
            }

            this._layerGroup.removeLayer(layer);
            const index = this._layers.removeId(name);
            delete this._services[name];

            this.fire('serviceRemove', index);
            return index;
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

    return LayerManager;
});