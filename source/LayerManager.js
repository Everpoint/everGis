/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerManager', [
    'utils',
    'IEventHandler',
    'spatialProcessor.MapService',
    'spatialProcessor.mapService.TileService',
    'LayerGroup'
], function (utils, IEventHandler, MapService, TileService, LayerGroup) {

    /**
     * Class for managing order of async loaded objects array
     */
    class OrderManager {
        /**
         * @constructor
         * @param {Array} [ids=[]] - ordered array of unique ids.
         */
        constructor(ids=[]){
            this._ids = ids;
            this._currIds = [];
        }

        /**
         * Order list of ids
         * @returns {Array}
         */
        get ids () {
            return this._ids;
        }

        /**
         * Order list of  loaded ids
         * @returns {Array}
         */
        get currIds () {
            return this._currIds;
        }

        /**
         * Return index of object
         * @param id - unique id of object
         * @returns {number} objects index
         */
        getIndex (id) {
            const index = this._ids.indexOf(id);
            return index > 0? index : (this._ids.push(id)-1)
        }

        /**
         * Return current index of object
         * @param index
         * @param id
         * @returns {number} current objects index
         */
        getCurrentIndex (index, id) {
            this._currIds[index] = id;
            return this._currIds.filter(id => !!id).indexOf(id);
        }

        /**
         * Move id in ids array
         * @param id id
         * @param direction direction
         * @returns {number} new ids index
         */
        moveId (id, direction) {
            const {ids, currIds} = this;
            const currIndex = ids.indexOf(id);
            const newIndex = currIndex + direction;
            const movedId = ids[newIndex];

            if(newIndex < 0 || newIndex > ids.length) {
                return currIndex;
            }

            ids[currIndex] = movedId;
            ids[newIndex] = id;
            currIds[currIndex] = movedId;
            currIds[newIndex] = id;

            return newIndex;
        }

        /**
         * Remove id from ids array
         * @param id id
         * @returns {number} index of removed id
         */
        removeId (id) {
            const {ids, currIds} = this;
            const index = ids.indexOf(id);

            this._ids = [...ids.slice(0, index), ...ids.slice(index+1)];
            this._currIds = [...currIds.slice(0, index), ...currIds.slice(index+1)];

            return index;
        }

    }

    /**
     * @alias sGis.spatialProcessor.LayerController
     */
    class LayerManager {
        /**
         * Services
         * @returns {Array.<Object>} Ordered array of init services
         */
        get services() {
            return this._layers.ids.map(id=>this._services[id]).filter(service=>!!service);
        }

        /**
         * @constructor
         * @param {Object} map
         * @param {Object} api
         * @param {Object} connector
         */
        constructor (map, api, connector) {
            this._map = map;
            this._api = api;
            this._connector = connector;
            this._layers = new OrderManager();
            this._services = {};
        }

        /**
         *
         * @param services {Array} array of service names from settings
         */
        init (services) {
            //this._baseMapControl = new sGis.controls.BaseLayerSwitch(this.painter);
            this._layerGroup = new LayerGroup();
            this._map.addLayer(this._layerGroup);

            this.loadFromSettings(services);
            this.loadBasemapList();
        }

        loadFromSettings (services) {
            services.forEach(name=>{
                this.addService(name);
            });
        }

        loadBasemapList () {
            return this._api.getServiceCatalog({
                filter: [{"PropertyPath":["Basemap"], "Value":true}],
            }).then(basemaps=>{
                return basemaps;
            }).catch(message => {
                utils.message(message);
            });
        }

        addService (name) {
            const realIndex = this._layers.getIndex(name);

            MapService.initialize(this._connector, name)
            .then(service => {
                if (service.layer) {
                    if (service instanceof TileService) {
                        this._map.crs = service.layer.crs;
                        this._map.tileScheme = service.layer.tileScheme;
                        this._map.adjustResolution();
                    }

                    const index = this._layers.getCurrentIndex(realIndex, name);
                    this._services[name] = service;

                    this._layerGroup.insertLayer(service.layer, index);

                    this.fire('serviceAdd', {service, index: realIndex});
                }
            })
            .catch(message => {
                utils.message(message);
            });
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
            const {isDisplayed} = this._services[name];
            this.fire('serviceToggle', {service: this._services[name]});
            return this._services[name].isDisplayed = isDisplayed !== true;
        }

        getActiveServiceList () {
            return this.services.filter(service => service.isDisplayed && services.layer);
        }
    }

    utils.extend(LayerManager.prototype, IEventHandler);

    return LayerManager;
});