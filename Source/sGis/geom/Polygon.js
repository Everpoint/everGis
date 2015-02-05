(function() {

    sGis.geom.Polygon = function (coordinates, options) {
        utils.init(this, options);

        this._coordinates = [[]];
        if (coordinates) this.coordinates = coordinates;
    };

    sGis.geom.Polygon.prototype = new sGis.geom.Polyline();

    Object.defineProperties(sGis.geom.Polygon.prototype, {
        _fillStyle: {
            value: 'color',
            writable: true
        },

        _fillColor: {
            value: 'transparent',
            writable: true
        },

        _fillImage: {
            value: null,
            writable: true
        },

        clone: {
            value: function () {
                return new sGis.geom.Polygon(this._coordinates, {
                    color: this._color,
                    width: this._width,
                    fillColor: this._fillColor
                });
            }
        },

        contains: {
            value: function (a, b) {
                var position = b && isValidPoint([a, b]) ? [a, b] : utils.isArray(a) && isValidPoint(a) ? a : a.x && a.y ? [a.x, a.y] : utils.error('Point coordinates are expecred but got ' + a + ' instead'),
                    coordinates = this._coordinates,
                    intersectionCount = 0;

                for (var ring = 0, l = coordinates.length; ring < l; ring++) {
                    var points = coordinates[ring],
                        prevD = points[0][0] > position[0],
                        prevH = points[0][1] > position[1];

                    points[points.length] = points[0]; // to include the line between the first and the last points

                    for (var i = 1; i < points.length; i++) {
                        if (pointToLineDistance(position, [points[i - 1], points[i]]) < this._width / 2 + 2) {
                            return true;
                        }

                        var D = points[i][0] > position[0],
                            H = points[i][1] > position[1];

                        if (H !== prevH //othervise line does not intersect horizontal line
                            && (D > 0 || prevD > 0) //line is to the left from the point, but we look to the right
                        ) {
                            if (points[i - 1][1] !== position[1]) {
                                if (intersects([[points[i][0], points[i][1]], [points[i - 1][0], points[i - 1][1]]], [position, [Math.max(points[i][0], points[i - 1][0]), position[1]]])) {
                                    intersectionCount++;
                                }
                            }

                        }
                        prevD = D;
                        prevH = H;
                    }
                }

                return intersectionCount % 2 === 1;
            }
        },

        fillStyle: {
            get: function () {
                return this._fillStyle;
            },

            set: function (style) {
                if (style === 'color') {
                    this._fillStyle = 'color';
                } else if (style === 'image') {
                    this._fillStyle = 'image';
                } else {
                    utils.error('Unknown fill style: ' + style);
                }
            }
        },

        fillColor: {
            get: function () {
                return this._fillColor;
            },

            set: function (color) {
                if (!utils.isString(color)) utils.error('Color string is expected, but got ' + color + ' instead');
                this._fillColor = color;
            }
        },

        fillImage: {
            get: function () {
                return this._fillImage;
            },

            set: function (image) {
                if (!(image instanceof Image)) utils.error('Image is expected but got ' + image + ' istead');
                this._fillImage = image;
            }
        }
    });

    function intersects(line1, line2) {
        if (line1[0][0] === line1[1][0]) {
            return line1[0][0] > line2[0][0];
        } else {
            var k = (line1[0][1] - line1[1][1]) / (line1[0][0] - line1[1][0]),
                b = line1[0][1] - k * line1[0][0],
                x = (line2[0][1] - b) / k;

            return x > line2[0][0];
        }
    }

    function pointToLineDistance(point, line) {
        var lx = line[1][0] - line[0][0],
            ly = line[1][1] - line[0][1],
            dx = line[0][0] - point[0],
            dy = line[0][1] - point[1],
            t = 0 - (dx * lx + dy * ly) / (lx * lx + ly * ly);

        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var distance = Math.sqrt(Math.pow(lx * t + dx, 2) + Math.pow(ly * t + dy, 2));

        return distance;
    }

})();