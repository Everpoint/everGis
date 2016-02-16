'use strict';

(function() {

    sGis.mapItem.MapServer = function(mapServer, options) {
        this._layer = mapServer;
        var self = this;

        this._active = mapServer.display;
        mapServer.mapItem = this;
        this.__initialize(options);

        if (mapServer.serviceInfo) this.__onServiceInfoUpdate();
        if (mapServer.legend) this.__onLegendUpdate();
        mapServer.addListener('initialize', function() { self.__onServiceInfoUpdate(); });
        mapServer.addListener('legendUpdate', function() { self.__onLegendUpdate(); });

        mapServer.on('mapChange', this.__updateLayerVisibility.bind(this));
    };

    sGis.mapItem.MapServer.prototype = new sGis.MapItem({
        isValidChild: function(child) {
            return child instanceof sGis.mapItem.DynamicServiceLayer;
        },

        _defaultHandlers: {
            activate: function() {
                this.mapServer.display = true;
            },

            deactivate: function() {
                this.mapServer.display = false;
            }
        },

        __onServiceInfoUpdate: function() {
            var serviceInfo = this._layer.serviceInfo,
                layersInfo = this._layer.layerInfo,
                self = this;

            if (serviceInfo.layers && !this._layer.isEverGis) {
                serviceInfo.layers.sort(function(a, b) { return a.id > b.id ? 1 : a.id < b.id ? -1 : 0; });

                var children = {};
                for (var i in serviceInfo.layers) {
                    children[serviceInfo.layers[i].id] = new sGis.mapItem.DynamicServiceLayer({
                        name: serviceInfo.layers[i].name,
                        active: this._layer.activeLayers[0] !== null ? this._layer.activeLayers.indexOf(parseInt(i)) !== -1 : serviceInfo.layers[i].defaultVisibility,
                        layerId: serviceInfo.layers[i].id,
                        minScale: serviceInfo.layers[i].minScale,
                        maxScale: serviceInfo.layers[i].maxScale,
                        parentName: serviceInfo.fullName
                    });

                    if (layersInfo[i]) {
                        var layerInfo = layersInfo[i].LayerInfo;
                        children[serviceInfo.layers[i].id].setLayerInfo(layerInfo);
                    }
                }

                for (var i in serviceInfo.layers) {
                    if (serviceInfo.layers[i].parentLayerId === -1) {
                        this.addChild(children[serviceInfo.layers[i].id]);
                    } else {
                        children[serviceInfo.layers[i].parentLayerId].addChild(children[serviceInfo.layers[i].id]);
                    }
                    children[serviceInfo.layers[i].id].addListener('activate deactivate resolutionLimitsChange', function() {
                        self.__updateLayerVisibility();
                    });
                }
            }

            if (this._resolutionLimits) this.resolutionLimits = this._resolutionLimits;

            this.fire('propertyChange', {property: 'name'});
        },

        updateLayerVisibility: function() {
            this.__updateLayerVisibility();
        },

        __updateLayerVisibility: function() {
            if (this._layer && this._children.length > 0) {
                var activeChildren = this.getDisplayedChildren(true),
                    activeLayerList = [];

                for (var i in activeChildren) {
                    activeLayerList.push(activeChildren[i].layerId);
                }

                this._layer.activeLayers = activeLayerList;
            }
        },

        __onLegendUpdate: function() {
            var legend = this.legend,
                children = this.getChildren(true);
            for (var i in children) {
                var layerId = children[i].layerId;
                for (var j in legend) {
                    if (legend[j].layerId === layerId) {
                        children[i].legend = legend[j].legend;
                        break;
                    }
                }
            }

            this.fire('legendUpdate');
        },

        updateChildrenStatus: function() {
            this.__onLayerVisibilityChange();
        },

        __onLayerVisibilityChange: function() {
            var activeLayers = this.mapServer.activeLayers;
            var children = this.getChildren(true);

            for (var i = 0, len = children.length; i < len; i++) {
                var mapItem = children[i];
                if (activeLayers.indexOf(mapItem.layerId) === -1) {
                    if (mapItem.isActive) {
                        mapItem._active = false;
                    }
                } else {
                    if (!mapItem.isActive) {
                        mapItem._active = true;
                    }
                }
            }

            this.fire('propertyChange', { property: 'activeLayers' });
        }
    });

    Object.defineProperties(sGis.mapItem.MapServer.prototype, {
        name: {
            get: function() {
                return this._name || this.layer.name || this._id;
            },

            set: function(name) {
                this._name = name;
            }
        },

        layer: {
            get: function() {
                return this._layer;
            }
        },

        legend: {
            get: function() {
                return this.mapServer.legend;
            }
        },

        map: {
            get: function() {
                return this._layer.map;
            }
        },

        controller: {
            get: function() {
                return this._layer.clientLayerController;
            }
        },

        mapServer: {
            get: function() {
                return this._layer.isEverGis ? this._layer.clientLayerController.mapServer : this._layer;
            }
        },

        fullName: {
            get: function() {
                return this._layer && this._layer.fullName;
            }
        },

        isEverGis: {
            get: function() {
                return this._layer && this._layer.isEverGis;
            }
        },

        storageId: {
            get: function() {
                return this.isEverGis ? this._layer.clientLayerController.storageId : null;
            }
        },

        serverOperations: {
            get: function() {
                if (this.isEverGis) {
                    return [{ FullName: this.fullName, Identity: 0, Operation: 'lm' }];
                } else {
                    return [];
                }
            }
        },

        isEditable: {
            get: function() {
                return !!this.isEverGis;
            }
        },

        resolutionLimits: {
            get: function() {
                if (this._layer.layer) {
                    return this._layer.layer.resolutionLimits;
                } else {
                    return this._resolutionLimits || [-1, -1];
                }
            },
            set: function(limits) {
                if (this._layer.layer) {
                    this._layer.layer.resolutionLimits = limits;
                } else {
                    this._resolutionLimits = limits;
                }
                this.fire('resolutionLimitsChange')
            }
        },

        isDisplayed: {
            get: function() {
                if (this._layer.map) {
                    var currResolution = this._layer.map.resolution;
                    var limits = this.resolutionLimits;
                    var isInLimits = (limits[0] < 0 || currResolution > limits[0]) && (limits[1] < 0 || currResolution < limits[1]);
                }

                return isInLimits && this._active && !this._suppressed;
            }
        },

        serviceType: {
            get: function() {
                return this._layer.serviceInfo.meta && this._layer.serviceInfo.meta.Type;
            }
        },

        isTileService: {
            get: function() {
                return this.mapServer.layer instanceof sGis.TileLayer;
            }
        }
    });

})();