(function() {

    sGis.symbol.point = {
        Point: function(style) {
            sGis.utils.init(this, style);
        },

        Image: function(style) {
            sGis.utils.init(this, style);
        },

        Square: function(style) {
            sGis.utils.init(this, style);
        }
    };

    sGis.symbol.point.Point.prototype = new sGis.Symbol({
        _fillColor: 'black',
        _strokeColor: 'transparent',
        _strokeWidth: 1,
        _offset: {x: 0, y: 0},

        renderFunction: function(feature, resolution, crs) {
            var f = feature.projectTo(crs),
                pxPosition = [f._point[0] / resolution + this.offset.x, - f._point[1] / resolution + this.offset.y];

            var point = new sGis.geom.Arc(pxPosition, {fillColor: this.fillColor, strokeColor: this.strokeColor, strokeWidth: this.strokeWidth, radius: this.size / 2});
            return [point];
        }
    });

    sGis.utils.proto.setProperties(sGis.symbol.point.Point.prototype, {
        type: {default: 'point', set: null},
        size: 10
    });

    Object.defineProperties(sGis.symbol.point.Point.prototype, {
        fillColor: {
            get: function() {
                return this._fillColor;
            },
            set: function(color) {
                this._fillColor = color;
            }
        },

        /**
         * @deprecated
         */
        color: {
            get: function() {
                return this.fillColor;
            },
            set: function(color) {
                this.fillColor = color;
            }
        },

        strokeColor: {
            get: function() {
                return this._strokeColor;
            },
            set: function(color) {
                this._strokeColor = color;
            }
        },

        strokeWidth: {
            get: function() {
                return this._strokeWidth;
            },
            set: function(width) {
                this._strokeWidth = width;
            }
        },

        offset: {
            get: function() {
                return utils.copyObject(this._offset);
            },
            set: function(offset) {
                this._offset = offset;
            }
        }
    });


    sGis.symbol.point.Image.prototype = new sGis.Symbol({
        _source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAN5QTFRFAAAAAAAAAAAAAAAAji4jiCwhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKg4KJgwJxEAw20o040Up41hE5EYq5Ugs5kov50wx6E406GNR6GNS6GZV6GpY6G1c6G9f6HBg6HNj6HZm6Hlq6VA26X1t6YBx6Yd56lI56oN16ot96o6A6pGE61Q765WI65mN7J2R7KCV7VY+7aWa7lhA7qme7q2j71pC77Ko8FxF8Lat8Lqx8V5H8mBK8r+38sS982JM9GRO9WZR9mhT+GtW+W1Y+m9b+3Fd/HNf/XVi+RwEUgAAABF0Uk5TAAYHERYXHB0eIiM3OD1JSlRYXujgAAABPUlEQVQ4y2WS2ULCMBBFE0qxlWIdwI19EZBFFhFEUHBX/v+HTJtOmAnnqTn3hodwhYiQAFIwuJGw2/EGNxK2hcKW36AmDZuCYkNvUOPC+iJmjQ3JjITVZcJKNyzjwPIKWeobVDjCycLiGlmAlOyYdYTM5GB+g8yBHXKZ6CdVY3aL5PPmc6Zz3ZjeHTHFXDcm9xaTQ64b4wfGmOa6MXokjHiuG8Mnw9DOVcOHwbNhAL6Vq/frvRB6x/vovzL69j66bxZd2khD5/2IzqHhQvsDKRbNZxsbLrQ+kRawQ7Ko5hfShPMzdoz30fhG6hCe+jmoG9GIF1X7SahB6KWiNyUmXlT1N6Ya5frVjUkWVflTVHQuqDGLKu/3ZcyJIYsqlQ55ZMLIsEXRXBkvVIYuKhvQXIiUFwQndFGOY/+9aP4B2y1gaNteoqgAAAAASUVORK5CYII=',
        _size: 32,
        _color: 'black',
        _anchorPoint: {x: 16, y: 16},
        _renderToCanvas: true,

        renderFunction: function(feature, resolution, crs) {
            if (!this._image) this.source = this.source; //creates the image and saves to cache

            var f = feature.projectTo(crs);
            var pxPosition = [f._point[0] / resolution, - f._point[1] / resolution];
            var imageCache = this._image;

            //if (imageCache.complete) {
            var image = new Image();
            image.src = this.source;

            var k = this.size / image.width;
            image.width = this.size;

            if (imageCache.width) {
                image.height = this.size / imageCache.width * imageCache.height;
            } else {
                var self = this;
                imageCache.onload = function() {
                    image.height = self.size / imageCache.width * imageCache.height;
                }
            }


            image.position = [pxPosition[0] - this.anchorPoint.x * k, pxPosition[1] - this.anchorPoint.y * k];

            var render = {
                node: image,
                position: image.position,
                persistent: true,
                renderToCanvas: this.renderToCanvas
            };
            return [render];
        }
    });

    Object.defineProperties(sGis.symbol.point.Image.prototype, {
        type: {
            value: 'point'
        },

        source: {
            get: function() {
                return this._source;
            },
            set: function(source) {
                this._image = new Image();
                this._image.src = source;
                this._source = source;
            }
        },

        size: {
            get: function() {
                return this._size;
            },
            set: function(size) {
                this._size = size;
            }
        },

        color: {
            get: function() {
                return this._color;
            },
            set: function(color) {
                this._color = color;
            }
        },

        anchorPoint: {
            get: function() {
                return utils.copyObject(this._anchorPoint);
            },
            set: function(point) {
                this._anchorPoint = point;
            }
        },

        renderToCanvas: {
            get: function() {
                return this._renderToCanvas;
            },
            set: function(bool) {
                this._renderToCanvas = bool;
            }
        }
    });


    sGis.symbol.point.Square.prototype = new sGis.Symbol({
        _size: 10,
        _strokeWidth: 2,
        _strokeColor: 'black',
        _fillColor: 'transparent',
        _offset: {x: 0, y: 0},

        renderFunction: function(feature, resolution, crs) {
            var f = feature.projectTo(crs),
                pxPosition = [f._point[0] / resolution, - f._point[1] / resolution],
                halfSize = this.size / 2,
                offset = this.offset,
                coordinates = [
                    [pxPosition[0] - halfSize + offset.x, pxPosition[1] - halfSize + offset.y],
                    [pxPosition[0] - halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                    [pxPosition[0] + halfSize + offset.x, pxPosition[1] + halfSize + offset.y],
                    [pxPosition[0] + halfSize + offset.x, pxPosition[1] - halfSize + offset.y]
                ];

            return [new sGis.geom.Polygon(coordinates, {fillColor: this.fillColor, color: this.strokeColor, width: this.strokeWidth})];
        }
    });

    Object.defineProperties(sGis.symbol.point.Square.prototype, {
        type: {
            value: 'point'
        },

        size: {
            get: function() {
                return this._size;
            },
            set: function(size) {
                this._size = size;
            }
        },

        fillColor: {
            get: function() {
                return this._fillColor;
            },
            set: function(color) {
                this._fillColor = color;
            }
        },

        /**
         * @deprecated
         */
        color: {
            get: function() {
                return this.fillColor;
            },
            set: function(color) {
                this.fillColor = color;
            }
        },

        strokeColor: {
            get: function() {
                return this._strokeColor;
            },
            set: function(color) {
                this._strokeColor = color;
            }
        },

        strokeWidth: {
            get: function() {
                return this._strokeWidth;
            },
            set: function(width) {
                this._strokeWidth = width;
            }
        },

        offset: {
            get: function() {
                return utils.copyObject(this._offset);
            },
            set: function(offset) {
                this._offset = offset;
            }
        }
    });

})();