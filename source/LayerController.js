/**
 * Created by tporyadin on 8/5/2016.
 */
sGis.module('spatialProcessor.LayerController', [
    'utils',
    'spatialProcessor.MapService',
    'spatialProcessor.mapService.TileService'
], function (utils, MapService, TileService) {
    /**
     * @alias sGis.spatialProcessor.LayerController
     */
    class LayerController {
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
            this._layerOrder = [];
        }

        init (services) {
            //this._baseMapControl = new sGis.controls.BaseLayerSwitch(this.painter);

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
            const index = this._layerOrder.push(name);

            MapService.initialize(this._connector, name)
                .then(service => {
                    if (service.layer) {
                        if (service instanceof TileService) {
                            this._map.crs = service.layer.crs;
                            this._map.tileScheme = service.layer.tileScheme;
                            this._map.adjustResolution();
                        }
                        this._map.insertLayer(service.layer, index);
                    }
                })
                .catch(message => {
                    utils.message(message);
                });
        }

        removeService (layer) {
            const l = this._layerOrder;
            const index = l.indexOf(layer.name);

            this._layerOrder = [...l.slice(0, index), ...l.slice(index+1)];

            this._map.removeLayer(layer);
        }

        moveService (layer, direction) {
            const l = this._layerOrder;
            const currIndex = this._layerOrder.indexOf(layer.name);
            const newIndex = currIndex + direction;
            if(newIndex < 0 || newIndex > l.length) {
                return;
            }

            const tmp = l[currIndex];
            l[currIndex] = l[newIndex];
            l[newIndex] = tmp;

            this._map.insertLayer(service.layer, newIndex);

            return newIndex;
        }
    }

    return LayerController;
});