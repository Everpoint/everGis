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
                if (!this.map) return false;
                if (this._minScale !== 0 || this._maxScale !== 0) {
                    var scale = this.map.resolution * this._dpm;
                    if (scale < this._maxScale || this._minScale && scale > this._minScale) return false;
                }
                return this.isActive && !this.isSuppressed;
            }
        },

        map: {
            get: function() {
                return this._parent.map;
            }
        },

        parentName: {
            get: function() {
                return this._parentName;
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
        }
    });

    var geometryTypes = {
        esriGeometryPoint: 'point',
        esriGeometryLine: 'line',
        esriGeometryPolyline: 'polyline',
        esriGeometryPolygon: 'polygon'
    };

})();