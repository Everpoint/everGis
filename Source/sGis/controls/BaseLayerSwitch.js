(function() {

    sGis.controls.BaseLayerSwitch = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        utils.init(this, options);
        this._container = this._getNewControlContainer();

        this._layerDescriptions = [];
        if (options && options.layerDescriptions) this.layerDescriptions = options.layerDescriptions;
    };

    sGis.controls.BaseLayerSwitch.prototype = new sGis.Control({
        _xAlign: 'right',
        _yAlign: 'bottom',
        _xOffset: 32,
        _yOffset: 32,
        _width: 64,
        _height: 64,
        _inactiveWidth: 56,
        _inactiveHeight: 56,
        _margin: 8,
        _css: 'sGis-control-baseLayerSwitch',
        _cssActive: 'sGis-control-baseLayerSwitch-active',

        addLayer: function(layer, imageSrc) {
            if (!(layer instanceof sGis.Layer)) utils.error('sGis.Layer instance is expected but got ' + layer + ' instead');
            if (!layer.tileScheme) utils.error('A layer without tile cscheme cannot be interpreted as base layer');
            if (this.getLayerIndex(layer) !== -1) utils.error('The layer is already in the list');

            this._layerDescriptions.push({ layer: layer, imageSrc: imageSrc });
            this._addLayerToImageBox(layer);

            if (this._map.getLayerIndex(layer) !== -1) {
                this.activeLayer = layer;
            }
        },

        removeLayer: function(layer) {
            if (this._activeLayer === layer) {
                if (this._layerDescriptions.length === 1) {
                    this.deactivate();
                } else {
                    var layerIndex = this.getLayerIndex(layer);
                    this.activeLayer = this._layerDescriptions[layerIndex === 0 ? 1 : layerIndex - 1];
                }
            }

            this._removeLayerFromImageBox(layer);
            this._layerDescriptions.splice(this.getLayerIndex(layer), 1);
        },

        _addLayerToImageBox: function(layer) {
            if (!this._inactiveLayerBox) {
                this._inactiveLayerBox = this._getNewInactiveLayerBox();
                this._container.appendChild(this._inactiveLayerBox);
            }

            var index = this.getLayerIndex(layer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(layer);
            }

            if (index < this._inactiveLayerBox.children.length) {
                this._inactiveLayerBox.insertBefore(this._layerDescriptions[index].image, this._inactiveLayerBox.children[index]);
            } else {
                this._inactiveLayerBox.appendChild(this._layerDescriptions[index].image);
            }

            this._updateImagePositions();
        },

        _updateImagePositions: function() {
            var top = this._height - this._inactiveHeight;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                this._layerDescriptions[i].image.style.top = top + 'px';
                this._layerDescriptions[i].image.style.left = i * (this._inactiveWidth + this._margin) + 'px';
            }
        },

        _getLayerImageObject: function(layer) {
            var image = new Image();
            image.width = this._inactiveWidth;
            image.height = this._inactiveHeight;
            image.src = this._layerDescriptions[this.getLayerIndex(layer)].imageSrc;
            image.style.marginRight = this._margin + 'px';
            image.className = this._css;
            image.style.position = 'absolute';

            var self = this;
            image.onclick = function(event) {
                if (self.activeLayer !== layer) {
                    self.activeLayer = layer;
                    event.stopPropagation();
                }
            }

            return image;
        },

        _getNewInactiveLayerBox: function() {
            var box = document.createElement('div');
            box.style.width = '0px';
            box.style.height = this._height + 10 + 'px';

            box.style[utils.css.transition.func] = 'width 0.5s';
            box.style.overflow = 'hidden';
            box.style.position = 'absolute';
            box.style[this._xAlign] = this.width + 'px';

            return box;
        },

        _removeLayerFromImageBox: function(layer) {
            this._inactiveLayerBox.removeChild(this._layerDescriptions[this.getLayerIndex(layer)].image);
        },

        getLayerIndex: function(layer) {
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                if (this._layerDescriptions[i].layer === layer) return i;
            }
            return -1;
        },

        _setActiveStatus: function(active) {
            if (active) {
                this._map.wrapper.appendChild(this._container);
                this._active = true;
            } else {
                this._map.wrapper.removeChild(this._container);
                this._active = false;
            }
        },

        _setActiveLayerImage: function() {
            if (!this._activeLayerImageContainer) {
                this._activeLayerImageContainer = this._getNewActiveLayerImageContainer();
                this._container.appendChild(this._activeLayerImageContainer);
            }

            if (this._activeLayerImageContainer.children.length > 0) {
                this._activeLayerImageContainer.removeChild(this._activeLayerImageContainer.children[0]);
            }

            var index = this.getLayerIndex(this._activeLayer);
            if (!this._layerDescriptions[index].image) {
                this._layerDescriptions[index].image = this._getLayerImageObject(this._activeLayer);
            }

            this._activeLayerImageContainer.style.backgroundImage = 'url(' + this._layerDescriptions[index].image.src + ')';
        },

        _getNewActiveLayerImageContainer: function() {
            var container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.width = this._width + 'px';
            container.style.height = this._height + 'px';
            container.style.cursor = 'pointer';
            container.style.border = '1px solid black';
            container.style.backgroundSize = '100%';

            var self = this;
            Event.add(container, 'click', function(event) {
                if (self._inactiveLayerBox.style.width === '0px') {
                    self._showInactiveLayerBox();
                } else {
                    self._hideInactiveLayerBox();
                }
                event.stopPropagation();
            });

            return container;
        },

        _getNewControlContainer: function() {
            var container = document.createElement('div');
            container.style.position = 'absolute';

            container.style[this._xAlign] = this._xOffset + 'px';
            container.style[this._yAlign] = this._yOffset + 'px';

            container.style.width = this._width + 'px';
            container.style.height = this._height + 'px';

            Event.add(container, 'dblclick', function(event) {
                event.stopPropagation();
            });

            return container;
        },

        _showInactiveLayerBox: function() {
            var layerCount = this._layerDescriptions.length;
            this._inactiveLayerBox.style.width = (this._inactiveWidth + this._margin + 2) * layerCount + 'px';
        },

        _hideInactiveLayerBox: function() {
            this._inactiveLayerBox.style.width = '0px';
        },

        _updateInactiveLayersDecoration: function() {
            var activeLayer = this.activeLayer;
            for (var i = 0, len = this._layerDescriptions.length; i < len; i++) {
                var image = this._layerDescriptions[i].image;
                var index = image.className.indexOf(this._cssActive);
                var isActive = this.activeLayer === this._layerDescriptions[i].layer;

                if (index === -1 && isActive) {
                    image.className += ' ' + this._cssActive;
                } else if (index !== -1 && !isActive) {
                    image.className = image.className.substr(0, index - 1) + image.className.substr(index + this._cssActive.length);
                }
            }
        }
    });

    Object.defineProperties(sGis.controls.BaseLayerSwitch.prototype, {
        layerDescriptions: {
            get: function() {
                return this._layerDescriptions;
            },
            set: function(descriptions) {
                if (this._layerDescriptions.length > 0) {
                    for (var i = 0, len = this._layerDescriptions; i < len; i++) {
                        this.removeLayer(this._layerDescriptions[i]);
                    }
                }
                for (var i = 0, len = descriptions.length; i < len; i++) {
                    this.addLayer(descriptions[i].layer, descriptions[i].imageSrc);
                }
            }
        },

        activeLayer: {
            get: function() {
                return this._activeLayer;
            },
            set: function(layer) {
                if (layer !== this._activeLayer) {
                    var indexInList = this.getLayerIndex(layer),
                        indexOnMap = 0;
                    if (indexInList === -1) utils.error('The layer is not in the list');

                    if (this._activeLayer) {
                        indexOnMap = this._map.getLayerIndex(this._activeLayer);
                        this._map.removeLayer(this._activeLayer);
                    }

                    this._map.moveLayerToIndex(layer, indexOnMap);
                    this._activeLayer = layer;

                    this._setActiveLayerImage();
                    this._updateInactiveLayersDecoration();

                    this.fire('activeLayerChange');
                }
            }
        },

        xAlign: {
            get: function() {
                return this._xAlign;
            },
            set: function(align) {
                utils.validateValue(align, ['left', 'right']);
                this._xAlign = align;
            }
        },

        yAlign: {
            get: function() {
                return this._yAlign;
            },
            set: function(align) {
                utils.validateValue(align, ['top', 'bottom']);
                this._yAlign = align;
            }
        },

        xOffset: {
            get: function() {
                return this._xOffset;
            },
            set: function(offset) {
                utils.validateNumber(offset);
                this._xOffset = offset;
            }
        },

        yOffset: {
            get: function() {
                return this._yOffset;
            },
            set: function(offset) {
                utils.validateNumber(offset);
                this._yOffset = offset;
            }
        },

        width: {
            get: function() {
                return this._width;
            },
            set: function(width) {
                utils.validatePositiveNumber(width);
                this._width = width;
            }
        },

        height: {
            get: function() {
                return this._height;
            },
            set: function(height) {
                utils.validatePositiveNumber(height);
                this._height = height;
            }
        },

        css: {
            get: function() {
                return this._css;
            },
            set: function(css) {
                utils.validateString(css);
                this._css = css;
            }
        },

        inactiveWidth: {
            get: function() {
                return this._inactiveWidth;
            },
            set: function(width) {
                utils.validatePositiveNumber(width);
                this._inactiveWidth = width;
            }
        },

        inactiveHeight: {
            get: function() {
                return this._inactiveHeight;
            },
            set: function(height) {
                utils.validatePositiveNumber(height);
                this._inactiveHeight = height;
            }
        }
    });

    var defaultCss = '.sGis-control-baseLayerSwitch {cursor: pointer; border: 1px solid gray;} .sGis-control-baseLayerSwitch-active {border: 2px solid DarkViolet;}',
        buttonStyle = document.createElement('style');
    buttonStyle.type = 'text/css';
    if (buttonStyle.styleSheet) {
        buttonStyle.styleSheet.cssText = defaultCss;
    } else {
        buttonStyle.appendChild(document.createTextNode(defaultCss));
    }

    document.head.appendChild(buttonStyle);

})();