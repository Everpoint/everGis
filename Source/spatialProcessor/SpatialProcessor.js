'use strict';

(function() {

    sGis.SpatialProcessor = function(options) {
        this._rootMapItem = new sGis.mapItem.Folder();
        this._connector = new sGis.spatialProcessor.Connector(options.url, this._rootMapItem, options.password && options.login ? options.login : options.sessionId, options.password);
        this._map = new sGis.Map();

        this._services = {};
        if (options.baseMaps && options.baseMaps.length > 0) this._initializeBaseMaps(options.baseMaps);
        if (options.services) this._initializeServices(options.services);

        this._controllers = {};
        if (options.controllers) {
            for (var i = 0, len = options.controllers.length; i < len; i++) {
                this.addController(options.controllers[i]);
            }
        }

        if (options.mapWrapper) this.mapWrapper = options.mapWrapper;

        this._initializeDataAccessService();
    };

    sGis.SpatialProcessor.prototype = {
        _initializeServices: function(list) {
            for (var i = 0, len = list.length; i < len; i++) {
                if (!this._services[list[i]]) this.addService(list[i]);
            }
        },

        _createService: function(name) {
            this._services[name] = new sGis.spatialProcessor.MapServer(name, this._connector);

            var self = this;
            if (this._services[name].initialized) {
                setTimeout(function() { initializationHandler.call(self._services[name]); }, 0);
            } else {
                this._services[name].addListener('initialize.spInitialization', initializationHandler);
            }

            this.fire('serviceAdd', { service: name });
            return this._services[name];

            function initializationHandler() {
                this.removeListener('initialize.spInitialization');
                initializeService(self, this.mapItem);

                self._checkInitialization();
            }
        },

        _checkInitialization: function() {
            if (this._initialized) return;

            var services = Object.keys(this._services);
            for (var i = 0; i < services.length; i++) {
                if (!this._services[services[i]].initialized) return;
            }

            var controllers = Object.keys(this._controllers);
            for (i = 0; i < controllers.length; i++) {
                if (!this._controllers[controllers[i]].initialized) return;
            }

            this._initialized = true;
            this.fire('initialize');
        },

        _createServiceMapItem: function(name) {
            var mapItem = new sGis.mapItem.MapServer(this._services[name]);
            this._rootMapItem.addChild(mapItem);
        },

        addService: function(name) {
            if (this._services[name]) utils.error('The service with the name ' + name + ' alreade exists');
            this._createService(name);
            this._createServiceMapItem(name);

            return this.service[name];
        },

        removeService: function(service) {
            if (!this._services[service]) utils.error('No service with the name ' + service + ' present');
            this._services[service].kill();

            var mapItems = this._rootMapItem.getChildren(true);
            for (var i = 0, len = mapItems.length; i < len; i++) {
                if (mapItems[i].layer && mapItems[i].layer === this._services[service]) this._rootMapItem.removeChild(mapItems[i]);
            }

            delete this._services[service];
        },

        addController: function(controllerName, options) {
            if (!controllerList[controllerName]) utils.error('Unknown controller: ' + controllerName);
            if (!options) options = {};
            options.map = this.map;
            options.sp = this;
            this._controllers[controllerName] = new controllerList[controllerName](this._connector, options);
            this._controllers[controllerName].addListner('initialize', this._checkInitialization.bind(this));

            return this._controllers[controllerName];
        },

        kill: function() {
            this.map.wrapper = null;
            for (var i in this._services) {
                this.removeService(i);
            }
            this._connector.cancelNotificationRequest();
        },

        setMapPositionByService: function(service) {
            if (!service.layer.crs.from) {
                var x = (service._serviceInfo.initialExtent.xmax + service._serviceInfo.initialExtent.xmin) / 2,
                    y = (service._serviceInfo.initialExtent.ymax + service._serviceInfo.initialExtent.ymin) / 2,
                    position = new sGis.Point(x, y, service.layer.crs),
                    resolution = (service._serviceInfo.initialExtent.xmax - service._serviceInfo.initialExtent.xmin) / this._map.width * 2;

                this._map.crs = service.layer.crs;
                this._map.position = position;
                this._map.resolution = utils.isNumber(resolution) && resolution !== 0 ? resolution : 10;
            } else {
                this._map.position = sGis.Map.prototype._position;
                this._map.resolution = sGis.Map.prototype._resolution;
            }
        },

        _initializeDataAccessService: function() {
            this._dataAccessService = new sGis.spatialProcessor.DataAccessService(this._connector, 'DataAccess');
        },

        _initializeBaseMaps: function(list) {
            this._baseMapControl = new sGis.controls.BaseLayerSwitch(this._map);
            this._baseMapItems = {};

            var self = this;
            for (var i = 0, len = list.length; i < len; i++) {
                this._createService(list[i].name);
                this._baseMapItems[list[i].name] = new sGis.mapItem.MapServer(this._services[list[i].name], { name: 'Базовая карта' });

                if (this._services[list[i].name].initialized) {
                    this._baseMapControl.addLayer(this._services[list[i].name].layer, list[i].imageUrl);
                } else {
                    this._services[list[i].name].addListener('initialize.spatialProcessor-baseMap', (function (i) {
                        return function() {
                            self._baseMapControl.addLayer(this.layer, list[i].imageUrl);
                            if (!self._baseMapControl.isActive) self._baseMapControl.activate();
                        };
                    })(i));
                }
            }

            this._activeBaseMapItem = this._baseMapItems[list[0].name];
            this._rootMapItem.addChild(this._activeBaseMapItem);

            this._baseMapControl.addListener('activeLayerChange', function() {
                var index = self._rootMapItem.getChildIndex(self._activeBaseMapItem);
                self._rootMapItem.removeChild(self._activeBaseMapItem);

                var activeMapItem = self._baseMapItems[list[0].name];
                for (var i in self._baseMapItems) {
                    if (self._baseMapItems[i].layer.layer === this.activeLayer) {
                        activeMapItem = self._baseMapItems[i];
                        break;
                    }
                }

                activeMapItem.isActive = self._activeBaseMapItem.isActive;
                activeMapItem.layer._map = self._map; // TODO: durty hack must fix
                self._rootMapItem.moveChildToIndex(activeMapItem, index);
                self._activeBaseMapItem = activeMapItem;
            });
        }
    };

    function initializeService(sp, mapItem) {
        var mapItems = sp._rootMapItem.getChildren(true);

        for (var i = 0, len = mapItems.length; i < len; i++) {
            if (mapItems[i].layer) {
                if (!mapItems[i].layer.initialized || mapItems[i].layer.layer && mapItems[i].layer.layer.crs) {
                    var baseService = mapItems[i].layer;
                    sp._baseService = baseService;
                    break;
                }
            }
        }

        if (baseService) {
            if (mapItem.layer === baseService) sp.setMapPositionByService(baseService);

            if (baseService.initialized) {
                addServiceToMap(sp, mapItem);
            } else {
                baseService.addListener('initialize.init-' + mapItem.id, function() {
                    baseService.removeListener('initialize.init-' + mapItem.id);
                    initializeService(sp, mapItem);
                });
            }
        } else {
            sp.addListener('serviceAdd.initWaiting-' + mapItem.id, function() {
                sp.removeListener('serviceAdd.initWaiting-' + mapItem.id);
                initializeService(sp, mapItem);
            });
        }
    }

    function addServiceToMap(sp, mapItem) {
        if (mapItem.parent) {
            mapItem.mapServer.map = sp.map;
            if (mapItem.controller) mapItem.controller.map = sp.map;
            var index = mapItem.parent.getChildIndex(mapItem);
            mapItem.parent.moveChildToIndex(mapItem, index === -1 ? 0 : index);
        }
    }

    Object.defineProperties(sGis.SpatialProcessor.prototype, {
        connector: {
            get: function() {
                return this._connector;
            }
        },

        map: {
            get: function() {
                return this._map;
            }
        },

        service: {
            get: function() {
                return this._services;
            }
        },

        controller: {
            get: function() {
                return this._controllers;
            }
        },

        mapWrapper: {
            get: function() {
                return this._map.wrapper;
            },
            set: function(wrapper) {
                if (document.readyState === 'complete') {
                    this._map.wrapper = wrapper;
                } else {
                    var self = this;
                    Event.add(document, 'DOMContentLoaded', function() {
                        self._map.wrapper = wrapper;
                    });
                }
            }
        },

        rootMapItem: {
            get: function() {
                return this._rootMapItem;
            }
        },

        baseService: {
            get: function() {
                return this._baseService;
            }
        },

        dataAccessService: {
            get: function() {
                return this._dataAccessService;
            }
        }
    });

    sGis.utils.proto.setMethods(sGis.SpatialProcessor.prototype, sGis.IEventHandler);

    var controllerList = {
        'identify': sGis.spatialProcessor.controller.Identify,
        'superSearch': sGis.spatialProcessor.controller.SuperSearch,
        'ditIntegration': sGis.spatialProcessor.controller.DitIntegration,
        'clientLayer': sGis.spatialProcessor.controller.ClientLayer,
        'definitionQuery': sGis.spatialProcessor.controller.DefinitionQuery,
        'tableView': sGis.spatialProcessor.controller.TableView
    };

})();