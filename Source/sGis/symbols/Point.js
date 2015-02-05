(function() {

    sGis.symbol.point = {
        Point: function(style) {
            this.setDefaults(style);
        },

        Image: function(style) {
            this.setDefaults(style);
        },

        Square: function(style) {
            this.setDefaults(style);
        },

        MaskedImage: function(style) {
            this.setDefaults(style);
        }
    };

    sGis.symbol.point.MaskedImage.prototype = new sGis.Symbol({
        type: 'point',
        style: {
            size: {
                defaultValue: 32,
                get: function() {
                    return this._size || this.defaults.size;
                },
                set: function(size) {
                    if (!utils.isNumber(size) || size <= 0) utils.error('Positive')
                }
            }
        }
    });

    sGis.symbol.point.Point.prototype = new sGis.Symbol({
        type: 'point',
        style: {
            size: {
                defaultValue: 10,
                get: function() {
                    return this._size || this.defaults.size;
                },

                set: function(size) {
                    if (!utils.isNumber(size) || size <=0) utils.error('Positive number is expected but got ' + size + ' instead');
                    this._size = size;
                }
            },

            color: {
                defaultValue: 'black',
                get: function() {
                    return this._color || this.defaults.color;
                },

                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._color = color;
                }
            },

            strokeWidth: {
                defaultValue: 1,
                get: function() {
                    return this._strokeWidth === undefined ?  this.defaults.strokeWidth : this._strokeWidth;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width < 0) utils.error('Positive number is expected but got ' + width + ' instead');
                    this._strokeWidth = width;
                }
            },

            strokeColor: {
                defaultValue: 'transparent',
                get: function() {
                    return this._strokeColor || this.defaults.strokeColor;
                },

                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._strokeColor = color;
                }
            },

            offset: {
                defaultValue: {x: 0, y: 0},
                get: function() {
                    return this._offset || this.defaults.offset;
                },
                set: function(point) {
                    if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                    this._offset = point;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            var feature = this.projectTo(crs),
                pxPosition = [feature._point[0] / resolution + this.style.offset.x, - feature._point[1] / resolution + this.style.offset.y];

            var point = new sGis.geom.Arc(pxPosition, {fillColor: this.style.color, strokeColor: this.style.strokeColor, strokeWidth: this.style.strokeWidth, radius: this.style.size / 2});
            return [point];
        }
    });

    sGis.symbol.point.Image.prototype = new sGis.Symbol({
        type: 'point',
        style: {
            source: {
                defaultValue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAN5QTFRFAAAAAAAAAAAAAAAAji4jiCwhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKg4KJgwJxEAw20o040Up41hE5EYq5Ugs5kov50wx6E406GNR6GNS6GZV6GpY6G1c6G9f6HBg6HNj6HZm6Hlq6VA26X1t6YBx6Yd56lI56oN16ot96o6A6pGE61Q765WI65mN7J2R7KCV7VY+7aWa7lhA7qme7q2j71pC77Ko8FxF8Lat8Lqx8V5H8mBK8r+38sS982JM9GRO9WZR9mhT+GtW+W1Y+m9b+3Fd/HNf/XVi+RwEUgAAABF0Uk5TAAYHERYXHB0eIiM3OD1JSlRYXujgAAABPUlEQVQ4y2WS2ULCMBBFE0qxlWIdwI19EZBFFhFEUHBX/v+HTJtOmAnnqTn3hodwhYiQAFIwuJGw2/EGNxK2hcKW36AmDZuCYkNvUOPC+iJmjQ3JjITVZcJKNyzjwPIKWeobVDjCycLiGlmAlOyYdYTM5GB+g8yBHXKZ6CdVY3aL5PPmc6Zz3ZjeHTHFXDcm9xaTQ64b4wfGmOa6MXokjHiuG8Mnw9DOVcOHwbNhAL6Vq/frvRB6x/vovzL69j66bxZd2khD5/2IzqHhQvsDKRbNZxsbLrQ+kRawQ7Ko5hfShPMzdoz30fhG6hCe+jmoG9GIF1X7SahB6KWiNyUmXlT1N6Ya5frVjUkWVflTVHQuqDGLKu/3ZcyJIYsqlQ55ZMLIsEXRXBkvVIYuKhvQXIiUFwQndFGOY/+9aP4B2y1gaNteoqgAAAAASUVORK5CYII=',
                get: function() {
                    return this._source || this.defaults.source;
                },
                set: function(source) {
                    if (!utils.isString(source)) utils.error('String is expected but got ' + source + ' instead');

                    this._image = new Image();
                    this._image.src = source;
                    this._source = source;
                }
            },

            size: {
                defaultValue: 32,
                get: function() {
                    return this._size || this.defaults.size;
                },

                set: function(size) {
                    if (!utils.isNumber(size) || size <= 0) utils.error('Positive number is expected but got ' + size + ' instead');

                    this._size = size;
                }
            },

            anchorPoint: {
                defaultValue: {x: 16, y: 16},
                get: function() {
                    return this._anchorPoint || this.defaults.anchorPoint;
                },
                set: function(point) {
                    if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                    this._anchorPoint = point;
                }
            },

            color: {
                defaultValue: 'black',
                get: function() {
                    return this._color || this.defaults.color;
                },
                set: function(color) {
                    if (!utils.isString(color)) utils.error('String is expected but got ' + color + ' instead');
                    this._color = color;
                }
            },

            renderToCanvas: {
                defaultValue: true,
                get: function() {
                    return this._renderToCanvas || this.defaults.renderToCanvas;
                },
                set: function(renderToCanvas) {
                    this._renderToCanvas = renderToCanvas;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            // TODO: the result of this function must be cached!
            var feature = this.projectTo(crs),
                pxPosition = [feature._point[0] / resolution, - feature._point[1] / resolution],
                imageCache = this.style._image || this.style.defaults._image;

            if (imageCache.complete) {
                var image = new Image();
                image.src = this.style.source;

                var k = this.style.size / image.width;
                image.width = this.style.size;
                image.height = this.style.size / imageCache.width * imageCache.height;
                image.position = [pxPosition[0] - this.style.anchorPoint.x * k, pxPosition[1] - this.style.anchorPoint.y * k];

                var render = {
                    node: image,
                    position: image.position,
                    persistent: true,
                    renderToCanvas: this.style.renderToCanvas
                };
                return [render];
            } else {
                return [];
            }
        }
    });

    sGis.symbol.point.Square.prototype = new sGis.Symbol({
        type: 'point',
        style: {
            size: {
                defaultValue: 10,
                get: function() {
                    return this._size || this.defaults.size;
                },
                set: function(size) {
                    if (!utils.isNumber(size) || size <=0) utils.error('Positive number is expected but got ' + size + ' instead');
                    this._size = size;
                }
            },

            strokeWidth: {
                defaultValue: 2,
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
            },

            offset: {
                defaultValue: {x: 0, y: 0},
                get: function() {
                    return this._offset || this.defaults.offset;
                },
                set: function(point) {
                    if (!point || !utils.isNumber(point.x) || !utils.isNumber(point.y)) utils.error('{x, y} is expected but got ' + point + ' instead');
                    this._offset = point;
                }
            }
        },

        renderFunction: function(resolution, crs) {
            var feature = this.projectTo(crs),
                pxPosition = [feature._point[0] / resolution, - feature._point[1] / resolution],
                halfSize = this.style.size / 2,
                offset = this.style.offset,
                coordinates = [
                    [pxPosition[0] - halfSize + offset.x, pxPosition[1] - halfSize + offset.y],
                    [pxPosition[0] - halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                    [pxPosition[0] + halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                    [pxPosition[0] + halfSize + offset.x, pxPosition[1] - halfSize + offset.y]
                ];

            return [new sGis.geom.Polygon(coordinates, {fillColor: this.style.fillColor, color: this.style.strokeColor, width: this.style.strokeWidth})];
        }
    });

})();