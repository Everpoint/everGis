/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'IEventHandler',
    'spatialProcessor.OrderManager',
    'spatialProcessor.MapService',
    'spatialProcessor.mapService.TileService',
    'LayerGroup'
], function (utils, IEventHandler, OrderManager, MapService, TileService, LayerGroup) {

    const ActiveBasemapSymbol = Symbol("Basemap");

    /**
     * @alias sGis.spatialProcessor.LayerManager
     */
    class LayerManager {
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
         * @constructor
         * @param {Object} map
         * @param {Object} api
         * @param {Object} connector
         */
        constructor (connector, map, api, painter) {
            this._map = map;
            this._api = api;
            this._connector = connector;
            this._painter = painter;
            this._layers = new OrderManager();
            this._services = {};
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
            this.loadBasemapList();
        }

        loadFromSettings (services) {
            services.forEach(name=>{
                this.loadService(name);
            });
        }

        loadBasemapList () {
            return this._api.getServiceCatalog({
                jsfilter: [{"PropertyPath":["Basemap"], "Value":true}],
            }).then(basemaps=>{
                this.fire("loadBasemaps", { basemaps });
                return basemaps;
            }).catch(message => {
                utils.error(message);
            });
        }

        loadService (name) {
            const realIndex = this._layers.getIndex(name);
            MapService.initialize(this._connector, name)
            .then(service => {
                if (service.layer) {
                    if (service instanceof TileService) {
                        this._layers.removeId(name);
                        this.addBasemap(service);
                    } else {
                        this.addService(service, realIndex);
                    }
                }
            })
            .catch(message => {
                utils.message(message);
            });
        }

        addService (service, realIndex) {
            const index = this._layers.getCurrentIndex(realIndex, name);
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
            } else if (this._services[ActiveBasemapSymbol] &&
                this._services[ActiveBasemapSymbol].name === name) {
                return this.toggleBasemap(this._services[ActiveBasemapSymbol]);
            }
        }

        addBasemap (basemap) {
            if (!this._services[ActiveBasemapSymbol]) {
                this._map.crs = basemap.layer.crs;
                this._map.tileScheme = basemap.layer.tileScheme;
                this._map.adjustResolution();
            } else {
                this._basemapGroup.removeLayer(this._services[ActiveBasemapSymbol].layer);
            }
            this._services[ActiveBasemapSymbol] = basemap;
            this._basemapGroup.insertLayer(basemap.layer, 0);
            this.fire('serviceAdd', { basemap });
        }

        toggleBasemap (basemap) {
            return basemap.isDisplayed = basemap.isDisplayed !== true;
        }

        /**
         * getService by name
         * @param name {String} service name
         * @returns {Object} service
         */
        getService(name) {
            return this._services[name];
        }

        /**
         * getDisplayedServiceList
         * @returns {Array.<Object>} visible layers
         */
        getDisplayedServiceList () {
            return this.services.filter(service => service.isDisplayed && services.layer);
        }
        
        getLayer(name) {
            return this._services[name];
        }
    }

    utils.extend(LayerManager.prototype, IEventHandler);

    return LayerManager;
});