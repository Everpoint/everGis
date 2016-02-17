'use strict';

(function() {

    sGis.mapItem.DynamicServiceLayer = function(options) {
        this.__initialize(options);

        if (options && options.children) {
            this._children = options.children;
        } else {
            this._children = [];
        }
    };

    sGis.mapItem.DynamicServiceLayer.prototype = new sGis.MapItem({
        _draggable: false,
        _layerId: null,
        _minScale: 0,
        _maxScale: 0,
        _dpm: 96 * 100 / 2.54,
        _parentName: null,
        _resolutionLimits: [-1, -1],

        //addChild: function(child) {
        //    if (this.isValidChild(child)) this._children.push(child);
        //    this.fire('addChild', {child: child});
        //},

        isValidChild: function(child) {
            return child instanceof sGis.mapItem.DynamicServiceLayer;
        },

        getChildren: function(recurse) {
            if (recurse) {
                var children = [];
                for (var i in this._children) {
                    children.push(this._children[i]);
                    if (this._children[i].getChildren) children = children.concat(this._children[i].getChildren(recurse));
                }
                return children;
            } else {
                return this._children;
            }
        },

        getDisplayedLayerList: function(recurse) {
            if (!this._children) return [];

            var list = [];
            for (var i in this._children) {
                if (this._children[i].isActive()) {
                    list.push(this._children[i].getLayerId());
                    if (recurse) {
                        list = list.concat(this._children[i].getDisplayedLayerList(true));
                    }
                }
            }

            return list;
        },

        setLayerInfo: function(layerInfo) {
            this._layerInfo = layerInfo;
        },

        getChildIndex: function(child) {
            return this._children.indexOf(child);
        }
    });

    Object.defineProperties(sGis.mapItem.DynamicServiceLayer.prototype, {
        serverOperations: {
            get: function() {
                return [{FullName: this._parentName, Identity: this.layerId, Operation: 'lm'}];
            }
        },

        layerId: {
            get: function() {
                return this._layerId;
            },
            set: function(id) { // TODO: should not be settable, conflict with sGis.init
                this._layerId = id;
            }
        },

        fullName: {
            get: function() {
                if (this.parentName && this.layerId !== undefined) {
                    return this.parentName + '/' + this.layerId;
                }
            }
        },

        legend: {
            get: function() {
                return this._legend;
            },

            set: function(legend) {
                this._legend = legend;
                this.fire('legendUpdate');
            }
        },

        isDisplayed: {
            get: function() {
                if (!this.isActive || this.isSuppressed) return false;
                if (!this.map) return true;

                var resolution = this.map.resolution;
                if (this._minScale !== 0 || this._maxScale !== 0) {
                    var scale = resolution * this._dpm;
                    if (scale < this._maxScale || this._minScale && scale > this._minScale) return false;
                }

                var limits = this.resolutionLimits;
                var isInLimits = (limits[0] < 0 || resolution > limits[0]) && (limits[1] < 0 || resolution < limits[1]);
                return isInLimits;
            }
        },

        map: {
            get: function() {
                return this._parent.map;
            }
        },

        parentName: { // TODO: should not be settable, conflict with sGis.init
            get: function() {
                return this._parentName;
            },
            set: function(name) {
                this._parentName = name;
            }
        },

        layerInfo: {
            get: function() {
                return this._layerInfo || [];
            }
        },

        storageId: {
            get: function() {
                var storageId = this.layerInfo.storageId;
                if (storageId && storageId !== '00000000-0000-0000-0000-000000000000') {
                    return storageId;
                } else {
                    return null;
                }
            }
        },

        geometryType: {
            get: function() {
                return this._layerInfo && geometryTypes[this._layerInfo.geometryType];
            }
        },

        isEditable: {
            get: function() {
                return this._layerInfo && this._layerInfo.CanEdit;
            }
        },

        resolutionLimits: {
            get: function() {
                if (this._maxScale > 0) {
                    var minResolution = this._resolutionLimits[0] >= 0 ? Math.max(this._resolutionLimits[0], this._maxScale / this._dpm) : this._maxScale / this._dpm;
                } else {
                    minResolution = this._resolutionLimits[0];
                }

                if (this._minScale > 0) {
                    var maxResolution = this._resolutionLimits[1] >= 0 ? Math.min(this._resolutionLimits[1], this._minScale / this._dpm) : this._minScale / this._dpm;
                } else {
                    maxResolution = this._resolutionLimits[1];
                }

                return [minResolution, maxResolution];
            },
            set: function(limits) {
                this._resolutionLimits = limits;
                this.fire('resolutionLimitsChange');
            }
        },

        serverResolutionLimits: {
            get: function() {
                return [this._maxScale > 0 ? this._maxScale / this._dpm : -1, this._minScale > 0 ? this._minScale / this._dpm : -1];
            }
        },

        serviceType: {
            get: function() {
                return this.layerInfo.info && this.layerInfo.info.Type || this._parent.serviceType;
            }
        }
    });

    var geometryTypes = {
        esriGeometryPoint: 'point',
        esriGeometryLine: 'polyline',
        esriGeometryPolyline: 'polyline',
        esriGeometryPolygon: 'polygon'
    };

})();