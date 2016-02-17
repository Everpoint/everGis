'use strict';

(function() {

    sGis.mapItem = {};

    sGis.MapItem = function(extention) {
        for (var key in extention) {
            this[key] = extention[key];
        }
    };

    sGis.MapItem.prototype = {
        _active: true,
        _parent: null,
        _name: null,
        _draggable: true,

        __initialize: function(options) {
            if (options && options.parent) this.parent = options.parent;
            sGis.utils.init(this, options, true);

            this._id = sGis.utils.getGuid();
            this._suppressed = !!(this._parent && this._parent.isDisplayed);
            this._children = [];
            this.data = {};
            if (options && options.children) this.addChildren(options.children);
        },

        activate: function() {
            this.isActive = true;
        },

        deactivate: function() {
            this.isActive = false;
        },

        __unsuppress: function() {
            if (this._suppressed) {
                this._suppressed = false;
                unsuppressChildren(this);
                this.fire('activate');
            }
        },

        __suppress: function() {
            if (!this._suppressed) {
                this._suppressed = true;
                suppressChildren(this);
                this.fire('deactivate');
            }
        },

        getChildren: function(recurse) {
            if (!recurse) {
                return this.children;
            } else {
                var children = [];
                for (var i in this._children) {
                    children.push(this._children[i]);
                    if (this._children[i].getChildren) children = children.concat(this._children[i].getChildren(true));
                }
                return children;
            }
        },

        getActiveChildren: function(recurse) {
            var activeChildren = [];
            for (var i in this._children) {
                if (this._children[i].isActive) {
                    activeChildren.push(this._children[i]);
                    if (recurse) activeChildren = activeChildren.concat(this._children[i].getActiveChildren(true));
                }
            }
            return activeChildren;
        },

        getDisplayedChildren: function(recurse) {
            var displayedChildren = [];
            for (var i in this._children) {
                if (this._children[i].isDisplayed) {
                    displayedChildren.push(this._children[i]);
                    if (recurse) displayedChildren = displayedChildren.concat(this._children[i].getDisplayedChildren(true));
                }
            }
            return displayedChildren;
        },

        addChildren: function(children) {
            if (sGis.utils.isArray(children)) {
                for (var i in children) {
                    this.addChild(children[i]);
                }
            } else {
                this.addChild(children);
            }
        },

        addChild: function(child) {
            if (this.isValidChild(child)) {
                var prevParent = child.parent;
                if (prevParent) prevParent.removeChild(child);

                this._children.push(child);
                child._parent = this;
                if (!this.isDisplayed) child.__suppress();
                if (child.getLayer && child.getLayer()) reorderLayers(child);
                this.fire('addChild', {child: child});
            } else {
                sGis.utils.error('sGis.MapItem instance is expected but got ' + child + ' instead');
            }
        },

        removeChild: function(child) {
            var index = this.getChildIndex(child);
            if (index !== -1) {
                this._children.splice(index, 1);
                child._parent = null;
                this.fire('removeChild', {child: child});
            } else {
                sGis.utils.error('Map item is not found');
            }
        },

        removeChildren: function() {
            for (var i = this._children.length - 1; i >=0; i--) {
                this.removeChild(this._children[i]);
            }
        },

        getChildIndex: function(child) {
            return this._children.indexOf(child);
        },

        moveChildToIndex: function(child, index) {
            if (index > this._children.length) index = this._children.length;

            var currentIndex = this.getChildIndex(child);
            if (currentIndex !== -1) {
                this._children.splice(currentIndex, 1);
                if (currentIndex < index) index--;
            }
            this._children.splice(index, 0, child);

            if (currentIndex === -1) {
                var prevParent = child.parent;
                if (prevParent) prevParent.removeChild(child);
                child._parent = this;
                if (!this.isDisplayed) {
                    child.__suppress();
                } else {
                    child.__unsuppress();
                }
                this.fire('addChild', {child: child});
            }
            reorderLayers(child);
            this.fire('childOrderChange', {child: child});
        },

        getNewLayerIndex: function(child) {
            var childIndex = this.getChildIndex(child);
            if (childIndex === -1) sGis.utils.error('The folder does not contain requested child');
            for (var i = childIndex+1; i < this._children.length; i++) {
                if (this._children[i].layer && this._children[i].layer.map && this._children[i].layer.layer) {
                    return this._children[i].layer.map.getLayerIndex(this._children[i].layer.layer); //TODO: must be fixed
                }
            }

            for (var i = childIndex - 1; i >= 0; i--) {
                if (this._children[i].layer && this._children[i].layer.layer && this._children[i].layer.map) {
                    return this._children[i].layer.map.getLayerIndex(this._children[i].layer.layer) + 1;
                }
            }

            var parent = this._parent;
            if (parent) {
                return parent.getNewLayerIndex(this);
            } else {
                return -1;
            }

        },

        getChildById: function(id, recurse) {
            for (var i = 0, len = this._children.length; i < len; i++) {
                if (this._children[i].id === id) return this._children[i];
                if (recurse) {
                    var foundChild = this._children[i].getChildById(id, recurse);
                    if (foundChild) return foundChild;
                }
            }
            return null;
        },

        getChildByStorageId: function(id, recurse) {
            for (var i = 0, len = this._children.length; i < len; i++) {
                if (this._children[i].storageId === id) return this._children[i];
                if (recurse) {
                    var foundChild = this._children[i].getChildByStorageId(id, recurse);
                    if (foundChild) return foundChild;
                }
            }
            return null;
        }
    };

    sGis.utils.proto.setMethods(sGis.MapItem.prototype, sGis.IEventHandler);

    Object.defineProperties(sGis.MapItem.prototype, {
        id: {
            get: function() {
                return this._id;
            }
        },

        name: {
            get: function() {
                return this._name || this._id;
            },

            set: function(name) {
                this._name = name;
            }
        },

        parent: {
            get: function() {
                return this._parent;
            },

            set: function(parent) {
                if (this._draggable) {
                    if (this._parent) this._parent.removeChild(this);
                    parent.addChild(this);
                }
            }
        },

        serverOperations: {
            get: function() {
                return [];
            }
        },

        isActive: {
            get: function() {
                return this._active;
            },

            set: function(bool) {
                if (bool) {
                    this._active = true;
                    unsuppressChildren(this);
                    this.fire('activate');
                } else {
                    this._active = false;
                    suppressChildren(this);
                    this.fire('deactivate');
                }
            }
        },

        isSuppressed: {
            get: function() {
                return this.parent ? !this.parent.isActive || this.parent.isSuppressed : false;
            }
        },

        isDisplayed: {
            get: function() {
                return this._active && !this._suppressed;
            }
        },

        hasChildren: {
            get: function() {
                return this._children.length > 0;
            }
        },

        isDraggable: {
            get: function() {
                return this._draggable;
            }
        },

        children: {
            get: function() {
                return [].concat(this._children);
            },

            set: function(children) {
                this.removeChildren();
                this.addChildren(children);
            }
        }
    });

    function suppressChildren(mapItem) {
        if (mapItem._children) {
            for (var i in mapItem._children) {
                mapItem._children[i].__suppress();
            }
        }
    }

    function unsuppressChildren(mapItem) {
        if (mapItem._children) {
            for (var i in mapItem._children) {
                mapItem._children[i].__unsuppress();
            }
        }
    }

    function reorderLayers(sourceMapItem) {
        var childrenWithLayers = getChildrenWithLayers(sourceMapItem);

        for (var i in childrenWithLayers) {
            var layer = childrenWithLayers[i].mapServer.layer, //TODO: this must be fixed
                map = childrenWithLayers[i].mapServer.map,
                indexOnMap = childrenWithLayers[i].parent.getNewLayerIndex(childrenWithLayers[i]);

            if (indexOnMap === -1) {
                map.moveLayerToIndex(layer, 0);
            } else {
                var currentIndex = map.getLayerIndex(layer);
                if (currentIndex !== -1 && currentIndex < indexOnMap) indexOnMap--;

                map.moveLayerToIndex(layer, indexOnMap);
            }
        }
    }

    function getChildrenWithLayers(mapItem) {
        var childrenWithLayers = mapItem._layer ? [mapItem] : [];

        if (mapItem.getChildren) {
            var children = mapItem.getChildren();
            for (var i in children) {
                if (children[i].getChildren) {
                    childrenWithLayers.concat(getChildrenWithLayers(children[i]));
                }
                if (children[i].getLayer) {
                    childrenWithLayers.push(children[i]);
                }
            }
        }
        return childrenWithLayers;
    }

})();