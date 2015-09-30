'use strict';

(function() {

    sGis.spatialProcessor.MapServer = function(name, serverConnector, options) {
        this.__initialize(name, serverConnector, options);
    };

    sGis.spatialProcessor.MapServer.prototype = {
        _map: null,
        _opacity: 1,
        _display: true,
        _activeLayers: null,

        __initialize: function(name, serverConnector, options) {
            var self = this;

            if (!serverConnector.sessionId) {
                serverConnector.once('sessionInitialized', function() {
                    self.__initialize(name, serverConnector, options);
                });
                return;
            }

            this._name = name;
            this._url = serverConnector.url + name + '/';
            this._serviceInfo = {};
            this._legend = [];
            this._serverConnector = serverConnector;

            if (options) {
                for (var i in options) {
                    if (this[i] !== undefined && options[i] !== undefined) this[i] = options[i];
                }
            }

            this._xhr = utils.ajax({
                url: this._url + 'MapServer/PackedInfo?f=json&_sb=' + this._serverConnector.sessionId,
                cache: false,
                success: function(data, textStatus) {
                    delete self._xhr;
                    var parsedResponse = utils.parseJSON(data);

                    if (!parsedResponse.ServiceInfo) {
                        self.error = parsedResponse.error && parsedResponse.error.message || 'Unknown error';
                        utils.message('Could not initialize service: server responded with error "' + self.error + '"');
                        self.fire('error');
                    } else {
                        self._serviceInfo = parsedResponse.ServiceInfo;
                        self._layerInfo = parsedResponse.LayersInfo;
                        if (self.isEverGis) {
                            self._clientLayerController = new sGis.spatialProcessor.controller.ClientLayer(self._serverConnector, { serviceName: self._name, map: self._map });
                            self._clientLayerController.addListener('initialize.sGis-mapServer', function() {
                                this.removeListener('.sGis-mapServer');
                                self._clientLayerController.mapServer.addListener('legendUpdate', function() {
                                    self.fire('legendUpdate');
                                });
                                self._initialized = true;
                                self.fire('initialize');
                            });
                        } else {
                            self.__createLayer();
                            self.__requestLegend();
                            self._serverConnector.addNotificationListner(self._serviceInfo.fullName, function() {
                                self._layer.forceUpdate();
                                if (self._map) self._map.redrawLayer(self._layer);
                            });
                            self._initialized = true;
                            self.fire('initialize');
                        }
                    }
                },
                error: function(response) {
                    self.error = response || 'Unknown error';
                    self.fire('error');
                }
            });
        },

        __createLayer: function() {
            var properties = {opacity: this._opacity, isDisplayed: this._display, layers: this._activeLayers || undefined};
            if (this._serviceInfo.spatialReference.wkt || this._serviceInfo.spatialReference.wkid) {
                if (this._serviceInfo.spatialReference.wkid === 102100 || this._serviceInfo.spatialReference.wkid === 102113) {
                    properties.crs = sGis.CRS.webMercator;
                } else if (this._map && this._map.crs.description === this._serviceInfo.spatialReference) {
                    properties.crs = this._map.crs;
                } else {
                    properties.crs = new sGis.Crs({description: this._serviceInfo.spatialReference});
                }
            }

            if (/\btile\b/.exec(this._serviceInfo.capabilities)) {
                if (this._map && this._map.layers.length === 0 && this._map.width && properties.crs.description) {
                    var position = new sGis.Point((this._serviceInfo.initialExtent.xmax + this._serviceInfo.initialExtent.xmin) / 2, (this._serviceInfo.initialExtent.ymax + this._serviceInfo.initialExtent.ymin) / 2, properties.crs),
                        resolution = (this._serviceInfo.initialExtent.xmax - this._serviceInfo.initialExtent.xmin) / this._map.width * 2;

                    this._map.position = position;
                    this._map.resolution = resolution || 10;
                }

                if (this._serviceInfo.tileInfo) {
                    properties.tileScheme = getTileScheme(this._serviceInfo);
                    if (!properties.crs.from) properties.cycleX = false;
                }

                this._layer = new sGis.TileLayer(this.url + 'MapServer/tile/{z}/{y}/{x}?_sb=' + this._serverConnector.sessionId, properties);
            } else {
                if (this._serverConnector.sessionId) {
                    properties.additionalParameters = '_sb=' + this._serverConnector.sessionId;
                } else {
                    var self = this;
                    this._serverConnector.addListener('sessionInitialized.mapServer-' + this._name, function() {
                        self._serverConnector.removeListener('sessionInitialized.mapServer-' + self._name);
                        self._layer.additionalParameters = '_sb=' + self._serverConnector.sessionId;
                    });
                }
                this._layer = new sGis.ESRIDynamicLayer(this.url + 'MapServer/', properties);
            }

            this._layer.mapServer = this;
            if (this._map) {
                this._map.addLayer(this._layer);
            }
        },

        __requestLegend: function() {
            var self = this;
            if (/\blegend\b/.exec(this._serviceInfo.capabilities)) {
                this._xhr = utils.ajax({
                    url: this._url + 'MapServer/legend?f=json&_sb=' + this._serverConnector.sessionId,
                    cache: false,
                    success: function(data, textStatus) {
                        self._legend = JSON.parse(data).layers;
                        self.fire('legendUpdate');
                        delete self._xhr;
                    }
                });
            }
        },

        hideObjects: function(ids) {
            utils.ajax({
                url: this._url + 'MapServer/display/?_sb=' + this._serverConnector.sessionId,
                type: 'POST',
                data: 'action=hide&data=' + encodeURIComponent(JSON.stringify(ids)) + '&ts=' + new Date().getTime()
            });
        },

        kill: function() {
            if (this._xhr) this._xhr.abort();
            this.map = null;
            if (this._serviceInfo) {
                this._serverConnector.removeNotificationListner(this._serviceInfo.fullName);
            }
        }
    };

    function getTileScheme(serviceInfo) {
        var scheme = {
            tileWidth: serviceInfo.tileInfo.rows,
            tileHeight: serviceInfo.tileInfo.cols,
            dpi: serviceInfo.tileInfo.dpi,
            origin: {
                x: serviceInfo.tileInfo.origin.x,
                y: serviceInfo.tileInfo.origin.y
            },
            matrix: {}
        };

        for (var i = 0, len = serviceInfo.tileInfo.lods.length; i < len; i++) {
            scheme.matrix[serviceInfo.tileInfo.lods[i].level] = {
                resolution: serviceInfo.tileInfo.lods[i].resolution,
                scale: serviceInfo.tileInfo.lods[i].scale
            };
        }

        return scheme;
    }

    Object.defineProperties(sGis.spatialProcessor.MapServer.prototype, {
        url: {
            get: function() {
                return this._url;
            }
        },

        map: {
            get: function() {
                return this._map;
            },

            set: function(map) {
                if (!(map instanceof sGis.Map) && map !== null) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
                if (this._layer) {
                    if (map === null || this._map && this._map !== map) this._map.removeLayer(this._layer);
                    if (map !== null) map.addLayer(this._layer);
                }
                this._map = map;

                this.fire('mapChange');
            }
        },

        serverConnector: {
            get: function() {
                return this._serverConnector;
            },

            set: function(serverConnector) {
                if (!(serverConnector instanceof sGis.spatialProcessor.Connector)) utils.error('sGis.spatialProcessor.Connector instance is expected but got ' + serverConnector + ' instead');
                this._serverConnector = serverConnector;
            }
        },

        opacity: {
            get: function() {
                return this._opacity;
            },

            set: function(opacity) {
                if (!utils.isNumber(opacity)) utils.error('Number is expected but got ' + opacity + ' instead');
                if (this._layer) this._layer.opacity = opacity;
                this._opacity = opacity;
            }
        },

        serviceInfo: {
            get: function() {
                return this._serviceInfo;
            }
        },

        layerInfo: {
            get: function() {
                return this._layerInfo;
            }
        },

        serviceName: {
            get: function() {
                return this._name;
            }
        },

        name: {
            get: function() {
                return this._serviceInfo && this._serviceInfo.meta && this._serviceInfo.meta.Alias || this._name;
            }
        },

        fullName: {
            get: function() {
                return this._serviceInfo && this._serviceInfo.fullName;
            }
        },

        layer: {
            get: function() {
                return this._layer ? this._layer : null;
            }
        },

        legend: {
            get: function() {
                return this._legend;
            }
        },

        display: {
            get: function() {
                return this._display;
            },

            set: function(bool) {
                if (bool === true) {
                    if (this._layer) {
                        this._layer.show();
                        if (this._map) this._map.redrawLayer(this._layer);
                    }
                    this._display = true;
                } else if (bool === false) {
                    if (this._layer) {
                        this._layer.hide();
                        if (this._map) this._map.redrawLayer(this._layer);
                    }
                    this._display = false;
                } else {
                    utils.error('Boolean is expected but got ' + bool + ' instead');
                }
            }
        },

        activeLayers: {
            get: function() {
                return [].concat(this._activeLayers);
            },

            set: function(layerIdList) {
                this._activeLayers = layerIdList;
                if (this._layer && this._layer instanceof sGis.DynamicLayer) {
                    this._layer.showLayers(layerIdList);
                    this.fire('layerVisibilityChange');
                    this._layer.forceUpdate();
                    if (this._map) this._map.redrawLayer(this._layer);
                }
            }
        },

        initialized: {
            get: function() {
                return this._initialized || false;
            }
        },

        isEverGis: {
            get: function() {
                if (!this._layerInfo) {
                    return null;
                } else if (this._serviceInfo.isEvergis === true) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        clientLayerController: {
            get: function() {
                return this._clientLayerController;
            }
        }
    });

    sGis.utils.proto.setMethods(sGis.spatialProcessor.MapServer.prototype, sGis.IEventHandler);

})();