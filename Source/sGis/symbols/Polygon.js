(function() {

    sGis.symbol.polygon = {
        Simple: function(style) {
            this.setDefaults(style);
        },
        BrushFill: function(style) {
            this.setDefaults(style);
        },
        ImageFill: function(style) {
            this.setDefaults(style);
        }
    };

    var defaultBrush = [[255,255,  0,  0,  0,   0,  0,  0,  0,  0],
        [255,255,255,  0,  0,   0,  0,  0,  0,  0],
        [255,255,255,255,  0,   0,  0,  0,  0,  0],
        [  0,255,255,255,255,   0,  0,  0,  0,  0],
        [  0,  0,255,255,255, 255,  0,  0,  0,  0],
        [  0,  0,  0,255,255, 255,255,  0,  0,  0],
        [  0,  0,  0,  0,255, 255,255,255,  0,  0],
        [  0,  0,  0,  0,  0, 255,255,255,255,  0],
        [  0,  0,  0,  0,  0,   0,255,255,255,255],
        [  0,  0,  0,  0,  0,   0,  0,255,255,255]];

    sGis.symbol.polygon.Simple.prototype = new sGis.Symbol({
        type: 'polygon',
        style: {
            strokeWidth: {
                defaultValue: 1,
                get: function() {
                    return this._strokeWidth || this.defaults.strokeWidth;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                    this._strokeWidth = width;
                }
            },
            strokeColor: {
                defaultValue: 'black',
                get: function() {
                    return this._strokeColor || this.defaults.strokeColor;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._strokeColor = color;
                }
            },
            fillColor: {
                defaultValue: 'transparent',
                get: function() {
                    return this._fillColor || this.defaults.fillColor;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._fillColor = color;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

            return [new sGis.geom.Polygon(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth, fillColor: this.style.fillColor})];
        }
    });

    sGis.symbol.polygon.BrushFill.prototype = new sGis.Symbol({
        type: 'polygon',
        style: {
            strokeWidth: {
                defaultValue: 1,
                get: function() {
                    return this._strokeWidth || this.defaults.strokeWidth;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                    this._strokeWidth = width;
                }
            },
            strokeColor: {
                defaultValue: 'black',
                get: function() {
                    return this._strokeColor || this.defaults.strokeColor;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._strokeColor = color;
                }
            },
            fillBrush: {
                defaultValue: defaultBrush,
                get: function() {
                    return utils.copyArray(this._fillBrush || this.defaults.fillBrush);
                },
                set: function(brush) {
                    if (!utils.isArray(brush)) utils.error('Array is expected but got ' + brush + ' instead');
                    this._fillBrush = utils.copyArray(brush);
                    this._imageSrc = getBrushImage(this);
                    if (!this._image) this._image = new Image();
                    this._image.src = this._imageSrc;
                }
            },
            fillForeground: {
                defaultValue: 'black',
                get: function() {
                    return this._fillForeground || this.defaults.fillForeground;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._fillForeground = color;
                    this._imageSrc = getBrushImage(this);
                    if (!this._image) this._image = new Image();
                    this._image.src = this._imageSrc;
                }
            },
            fillBackground: {
                defaultValue: 'transparent',
                get: function() {
                    return this._fillBackground || this.defaults.fillBackground;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._fillBackground = color;
                    this._imageSrc = getBrushImage(this);
                    if (!this._image) this._image = new Image();
                    this._image.src = this._imageSrc;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

            return [new sGis.geom.Polygon(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth, fillStyle: 'image', fillImage: this.style._image || this.style.defaults._image})];
        }
    });

    sGis.symbol.polygon.ImageFill.prototype = new sGis.Symbol({
        type: 'polygon',
        style: {
            strokeWidth: {
                defaultValue: 1,
                get: function() {
                    return this._strokeWidth || this.defaults.strokeWidth;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width < 0) utils.error('Non-negative number is expected but got ' + width + ' instead');
                    this._strokeWidth = width;
                }
            },
            strokeColor: {
                defaultValue: 'black',
                get: function() {
                    return this._strokeColor || this.defaults.strokeColor;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._strokeColor = color;
                }
            },
            fillImage: {
                defaultValue: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
                get: function() {
                    return this._src;
                },
                set: function(src) {
                    if (!utils.isString(src)) utils.error('String is expected but got ' + src + ' instead');
                    this._src = src;
                    if (!this._image) this._image = new Image();
                    this._image.src = this._src;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

            return [new sGis.geom.Polygon(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth, fillStyle: 'image', fillImage: this.style._image || this.style.defaults._image})];
        }
    });

    function getPolylineRenderedCoordinates(feature, resolution, crs) {
        if (!feature._cache[resolution]) {
            var projected = feature.projectTo(crs).coordinates;

            for (var ring = 0, l = projected.length; ring < l; ring++) {
                for (var i = 0, m = projected[ring].length; i < m; i++) {
                    projected[ring][i][0] /= resolution;
                    projected[ring][i][1] /= -resolution;
                }
            }

            var simpl = utils.simplify(projected, 0.5);
            feature._cache[resolution] = simpl;
        } else {
            simpl = feature._cache[resolution];
        }
        return simpl;
    }

    function getBrushImage(style) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            brush = style.fillBrush,
            foreground = utils.getColorObject(style.fillForeground),
            background = utils.getColorObject(style.fillBackground),
            alphaNormalizer = 65025;

        canvas.height = brush.length;
        canvas.width = brush[0].length;

        for (var i = 0, l = brush.length; i < l; i++) {
            for (var j = 0, m = brush[i].length; j < m; j++) {
                var srcA = brush[i][j] * foreground.a / alphaNormalizer,
                    dstA = background.a / 255 * (1 - srcA),
                    a = + Math.min(1, (srcA + dstA)).toFixed(2),
                    r = Math.round(Math.min(255, background.r * dstA + foreground.r * srcA)),
                    g = Math.round(Math.min(255, background.g * dstA + foreground.g * srcA)),
                    b = Math.round(Math.min(255, background.b * dstA + foreground.b * srcA));

                ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
                ctx.fillRect(j,i,1,1);
            }
        }

        return canvas.toDataURL();
    }

})();