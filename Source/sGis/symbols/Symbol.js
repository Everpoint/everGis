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
            utils.init(this, style);
        }
    };

    sGis.symbol.label.Label.prototype = new sGis.Symbol({
        _width: 200,
        _height: 20,
        _offset: {x: -100, y: -10},
        _align: 'center',
        _css: '',

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

    Object.defineProperties(sGis.symbol.label.Label.prototype, {
        type: {
            value: 'label'
        },

        width: {
            get: function() {
                return this._width;
            },
            set: function(width) {
                this._width = width;
            }
        },

        height: {
            get: function() {
                return this._height;
            },
            set: function(height) {
                this._height = height;
            }
        },

        offset: {
            get: function() {
                return utils.copyObject(this._offset);
            },
            set: function(offset) {
                this._offset = offset;
            }
        },

        align: {
            get: function() {
                return this._align;
            },
            set: function(align) {
                this._align = align;
            }
        },

        css: {
            get: function() {
                return this._css;
            },
            set: function(css) {
                this._css = css;
            }
        }
    });



    sGis.symbol.image = {
        Image: function(style) {
            utils.init(this, style);
        }
    };

    sGis.symbol.image.Image.prototype = new sGis.Symbol({
        _transitionTime: 0,

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

    Object.defineProperties(sGis.symbol.image.Image.prototype, {
        type: {
            value: 'image'
        },

        transitionTime: {
            get: function() {
                return this._transitionTime;
            },
            set: function(time) {
                this._transitionTime = time;
            }
        }
    });


})();