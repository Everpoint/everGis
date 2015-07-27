'use strict';

(function() {

    sGis.SpatialProcessor = function(options) {
        this._rootMapItem = new sGis.mapItem.Folder();
        this._connector = new sGis.spatialProcessor.Connector(options.url, this._rootMapItem, options.password && options.login ? options.login : options.sessionId, options.password);
        this._map = new sGis.Map();

        if (this._connector.sessionId) {
            this._initialize(options);
        } else {
            this._connector.once('sessionInitialized', this._initialize.bind(this, options));
        }
    };

    sGis.SpatialProcessor.prototype = {
        _initialize: function(options) {
            this._services = {};
            this._initializeBaseMaps(options.baseMaps || []);
            if (options.services) this._initializeServices(options.services);
            if (options.project) this.loadProject(options.project);
            this.api = new sGis.spatialProcessor.Api(this._connector);

            this._controllers = {};
            if (options.controllers) {
                for (var i = 0, len = options.controllers.length; i < len; i++) {
                    this.addController(options.controllers[i]);
                }
            }

            if (options.mapWrapper) this.mapWrapper = options.mapWrapper;

            this._initializeDataAccessService();
            if (options.fsServiceName) this._sfs = new sGis.spatialProcessor.Sfs(this._connector, options.fsServiceName);
        },

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

            this.dataAccessService.clientMapInfo({map: this._map});
        },

        _initializeDataAccessService: function() {
            this._dataAccessService = new sGis.spatialProcessor.DataAccessService(this._connector, 'DataAccess');
        },

        _initializeBaseMaps: function(list) {
            this._baseMapControl = new sGis.controls.BaseLayerSwitch(this._map);
            this._baseMapConfig = [];

            this._baseMapControl.on('activeLayerChange', this._onActiveBaseMapChange.bind(this));

            this.addBaseServices(list);
        },

        _onActiveBaseMapChange: function() {
            if (this._activeBaseMapItem) {
                var index = this._rootMapItem.getChildIndex(this._activeBaseMapItem);
                this._rootMapItem.removeChild(this._activeBaseMapItem);
            } else {
                index = 0;
            }

            for (var i = 0; i < this._baseMapConfig.length; i++) {
                if (this._baseMapConfig[i].mapItem.mapServer.layer === this._baseMapControl.activeLayer) {
                    var activeMapItem = this._baseMapConfig[i].mapItem;
                    break;
                }
            }

            activeMapItem.isActive = this._activeBaseMapItem ? this._activeBaseMapItem.isActive : true;
            activeMapItem.layer._map = this._map; // TODO: durty hack must fix
            this._rootMapItem.moveChildToIndex(activeMapItem, index);
            this._activeBaseMapItem = activeMapItem;
        },

        addBaseServices: function(list) {
            var self = this;
            for (var i = 0, len = list.length; i < len; i++) {
                var item = list[i];
                if (this._services[item.name]) continue;

                this._createService(item.name);
                var mapItem = new sGis.mapItem.MapServer(this._services[item.name], { name: 'Базовая карта' });
                this._baseMapConfig.push({
                    name: item.name,
                    imageUrl: item.imageUrl,
                    mapItem: mapItem
                });

                if (this._services[item.name].initialized) {
                    this._onBaseMapInitialize(mapItem);
                } else {
                    this._services[item.name].on('initialize error.spatialProcessor-baseMap', this._onBaseMapInitialize.bind(this, mapItem));
                }
            }
        },

        _onBaseMapInitialize: function(mapItem) {
            mapItem.mapServer.off('.spatialProcessor-baseMap');

            // This cycle ensures that base maps are set at same order as in config
            for (var i = 0; i < this._baseMapConfig.length; i++) {
                var mapServer = this._baseMapConfig[i].mapItem.mapServer;
                if (mapServer.initialized) {
                    if (this._baseMapControl.getLayerIndex(mapServer.layer) === -1) {
                        this._baseMapControl.addLayer(mapServer.layer, this._baseMapConfig[i].imageUrl);
                        if (!this._baseMapControl.activeLayer) {
                            this._baseMapControl.activeLayer = mapServer.layer;
                            this._baseMapControl.activate();
                        }
                    }
                } else if (!mapServer.error) {
                    return;
                }
            }
        },



        getPath: function(options) {
            utils.ajax({
                url: this._connector.url + 'api/efs/objects?path=' + encodeURIComponent(options.path) + '&_sb=' + this._connector.sessionId + '&ts=' + Date.now(),
                success: function(response) {
                    try {
                        var data = utils.parseJSON(response);
                    } catch (e) {
                        if (options.error) options.error('Server responded with: ' + response);
                    }

                    if (data.Success === true && options.success) {
                        options.success(data.Items);
                    }
                },
                error: options.error
            })
        },

        loadTemplateLibrary: function(options) {
            var self = this;
            this.getPath({
                path: options.path,
                success: function(list) {
                    var paths = [];
                    for (var i = 0; i < list.length; i++) {
                        if (list[i].Type === 'File') paths.push({Path: list[i].Path, Type: 1});
                    }

                    var pathList = {Items: paths};
                    var string = JSON.stringify(pathList);

                    utils.ajax({
                        url: self._connector.url + 'api/efs/files?_sb=' + self._connector.sessionId + '&ts=' + Date.now(),
                        type: 'POST',
                        data: string,
                        success: function(response) {
                            if (options.success) {
                                try {
                                    var data = utils.parseJSON(response);
                                } catch (e) {
                                    if (options.error) options.error('Server responded with: ' + response);
                                }

                                var templates = [];
                                for (var i = 0; i < data.length; i++) {
                                    if (data[i].Success === true) templates.push(new sGis.spatialProcessor.Template(data[i].Content, paths[i].Path));
                                }

                                options.success(templates);
                            }
                        },
                        error: options.error
                    });

                },
                error: options.error
            });
        },

        loadProject: function(path) {
            var self = this;
            this._connector.getJSONFile({
                path: path,
                success: function(project) {
                    for (var i = 0; i < project.length; i++) {
                        self._initializeServiceFromProject(project[i]);
                    }
                },
                error: function() {
                    utils.message('Could not load project: ' + path);
                }
            });
        },

        _initializeServiceFromProject: function(description) {
            if (!description.Url) return;

            var name = getServiceName(description.Url);
            if (name && !this._services[name]) {
                var service = this.addService(name);
                if (description.Opactiy) service.opacity = description.Opactiy;
                if (description.Children) service.activeLayers = getActiveLayers(description.Children);
                if (description.IsVisible === false) service.mapItem.deactivate();
                if (description.Title) service.mapItem.name = description.Title;
            }
        }
    };

    function getActiveLayers(children) {
        var activeLayers = [];
        for (var i = 0; i < children.length; i++) {
            if (children[i].IsVisible) activeLayers.push(children[i].LayerId);
            if (children[i].Children) activeLayers = activeLayers.concat(getActiveLayers(children[i].Children));
        }
        return activeLayers;
    }

    function getServiceName(url) {
        return url.match(/.*\/(\w+)\/MapServer/)[1];
    }

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
        if (mapItem.parent && !mapItem.mapServer.map) {
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
        },

        sfs: {
            get: function() {
                return this._sfs;
            }
        },

        baseMapControl: {
            get: function() {
                return this._baseMapControl;
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
        'tableView': sGis.spatialProcessor.controller.TableView,
        'objectSelector': sGis.spatialProcessor.controller.ObjectSelector,
        'stats': sGis.spatialProcessor.controller.Stats
    };

})();