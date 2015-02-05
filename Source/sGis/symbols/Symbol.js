(function() {

    sGis.symbol = {};

    sGis.Symbol = function(options) {
        for (var i in options) {
            this[i] = options[i];
        }
    };

    sGis.Symbol.prototype = {
        setDefaults: function(style) {
            this.defaults = {};
            for (var i in this.style) {
                Object.defineProperty(this.defaults, i, {
                    get: this.style[i].get,
                    set: this.style[i].set
                });
                this.defaults[i] = style && style[i] ? style[i] : this.style[i].defaultValue;
            }
        }
    };

    Object.defineProperties(sGis.Symbol.prototype, {

    });


    sGis.symbol.label = {
        Label: function(style) {
            this.setDefaults(style);
        }
    };

    sGis.symbol.label.Label.prototype = new sGis.Symbol({
        type: 'label',
        style: {
            width: {
                defaultValue: 200,
                get: function() {
                    return this._width || this.defaults.width;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width <= 0) utils.error('Positive number is expected but got ' + width + ' instead');
                    this._width = width;
                }
            },

            height: {
                defaultValue: 20,
                get: function() {
                    return this._height || this.defaults.height;
                },
                set: function(height) {
                    if (!utils.isNumber(height) || height <=0) utils.error('Positive number is expected but got ' + height + ' instead');
                    this._height = height;
                }
            },

            offset: {
                defaultValue: {x: -100, y: -10},
                get: function() {
                    return this._offset || this.defaults.offset;
                },
                set: function(offset) {
                    if (!offset || !utils.isNumber(offset.x) || !utils.isNumber(offset.y)) utils.error('{x, y} is expected but got ' + offset + ' instead');
                    this._offset = offset;
                }
            },

            align: {
                defaultValue: 'center',
                get: function() {
                    return this._align || this.defaults.align;
                },
                set: function(align) {
                    if (!utils.isString(align)) utils.error('String is expected but got ' + align + ' instead');
                    this._align = align;
                }
            },

            css: {
                defaultValue: '',
                get: function() {
                    return this._css === undefined ? this.defaults.css : this._css;
                },
                set: function(css) {
                    if (!utils.isString(css)) utils.error('String is expected but got ' + css + ' instead');
                    this._css = css;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            if (!this._cache || !utils.softEquals(resolution, this._cache[0].resolution)) {
                var div = document.createElement('div');
                div.className = this.style.css;
                div.appendChild(this.content);
                div.style.position = 'absolute';
                div.style.height = this.style.height + 'px';
                div.style.width = this.style.width + 'px';

                var point = this.point.projectTo(crs);
                div.position = [point.x / resolution + this.style.offset.x, -point.y / resolution + this.style.offset.y];
                div.style.pointerEvents = 'none';
                div.style.cursor = 'inherit';
                div.style.textAlign = this.style.align;

                this._cache = [{node: div, position: div.position, resolution: resolution}];
            }

            return this._cache;
        }
    });

    sGis.symbol.image = {
        Image: function(style) {
            this.setDefaults(style)
        }
    };

    sGis.symbol.image.Image.prototype = new sGis.Symbol({
        type: 'image',
        style: {
            transitionTime: {
                defaultValue: 0,
                get: function() {
                    return this._transitionTime;
                },
                set: function(t) {
                    this._transitionTime = t;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            if (!this._cache) {
                var image = new Image();
                image.src = this.src;
                image.width = this.width;
                image.height = this.height;

                image.bbox = this.bbox;
                this._cache = [{
                    node: image,
                    bbox: this.bbox,
                    persistent: true
                }];

                if (this.style.transitionTime > 0) {
                    image.style.opacity = 0;
                    image.style.transition = 'opacity ' + this.style.transitionTime / 1000 + 's linear';

                    var self = this;
                    this._cache[0].onAfterDisplay = function() {
                        setTimeout(function() { image.style.opacity = self.opacity; }, 0);
                    }
                } else {
                    image.style.opacity = this.opacity;
                }
            }
            return this._cache;
        }
    });

})();