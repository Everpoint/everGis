(function() {

    sGis.symbol.maptip = {
        Simple: function(style) {
            this.setDefaults(style);
        }
    };

    sGis.symbol.maptip.Simple.prototype = new sGis.Symbol({
        type: 'maptip',
        style: {
            width: {
                defaultValue: 200,
                get: function() {
                    return this._width || this.defaults.width;
                },
                set: function(width) {
                    if (!utils.isNumber(width) || width <=0) utils.error('Positive number is expected but got ' + width + ' instead');
                    this._width = width;
                    this._changed = true;
                }
            },

            height: {
                defaultValue: 200,
                get: function() {
                    return this._height || this.defaults.height;
                },
                set: function(height) {
                    if (!utils.isNumber(height) || height <= 0) utils.error('Positive number is expected but got ' + height + ' instead');
                    this._height  = height;
                    this._changed = true;
                }
            },

            offset: {
                defaultValue: {x: -100, y: -220},
                get: function() {
                    return this._offset || this.defaults.offset;
                },
                set: function(offset) {
                    if (!offset || !utils.isNumber(offset.x) || !utils.isNumber(offset.y)) utils.error('{x, y} is expected but got ' + offset + ' instead');
                    this._offset = offset;
                    this._changed = true;
                }
            }
        },
        renderFunction: function(resolution, crs) {
            if (this.style._changed) {
                this._cache = {};
                this.style._changed = false;
            }

            var point = this.position.projectTo(crs),
                position = [point.x / resolution, - point.y / resolution];

            if (!this._cache[resolution]) {
                var baloonCoordinates = getBaloonCoordinates(this, position);

                this._cache[resolution] = new sGis.geom.Polygon(baloonCoordinates, {fillColor: 'white'});
            }

            var div = document.createElement('div'),
                divPosition = [position[0] + this.style.offset.x, position[1] + this.style.offset.y];

            if (utils.isNode(this.content)) {
                div.appendChild(this.content);
            } else {
                utils.html(div, this.content);
            }
            div.style.position = 'absolute';
            div.style.height = this.style.height + 'px';
            div.style.width = this.style.width + 'px';
            div.style.backgroundColor = 'white';
            div.style.overflow = 'auto';
            div.position = divPosition;

            var divRender = {
                node: div,
                position: position
            }

            return [this._cache[resolution], divRender];
        }
    });

    function getBaloonCoordinates(feature, position) {
        var baloonSquare = getBaloonSquare(feature, position);

        if (isInside(position, baloonSquare)) return baloonSquare;

        var tailBase = getTailBasePoint(position, baloonSquare),
            startIndex = tailBase.index,
            tailBaseLine = getTailBaseLine(tailBase, baloonSquare),
            contour = [position, tailBaseLine[0]];

        if (!isOnTheLine(tailBaseLine[0], [baloonSquare[startIndex], baloonSquare[(startIndex + 1) % 4]])) startIndex++;
        for (var i = 1; i <= 4; i++) {
            contour.push(baloonSquare[(startIndex + i) % 4]);
            if (isOnTheLine(tailBaseLine[1], [baloonSquare[(startIndex + i) % 4], baloonSquare[(startIndex + i + 1) % 4]])) break;
        }

        contour.push(tailBaseLine[1]);
        return contour;
    }

    function getTailBaseLine(tailBase, baloonSquare) {
        var point = tailBase.point,
            index = tailBase.index,
            square = baloonSquare.concat([baloonSquare[0]]),
            side = index % 2,
            opSide = (side + 1) % 2,
            direction = index < 2 ? 1 : -1,
            length = 10,
            d1 = (square[index + 1][side] - point[side]) * direction,
            d2 = (point[side] - square[index][side]) * direction,
            baseLine = [[], []];

        if (d1 >= length) {
            baseLine[0][side] = point[side] + length * direction;
            baseLine[0][opSide] = point[opSide];
        } else {
            var k = index === 1 || index === 3 ? -1 : 1;
            baseLine[0][opSide] = point[opSide] + (length - d1) * direction * k;
            baseLine[0][side] = square[index + 1][side];
        }

        if (d2 >= length) {
            baseLine[1][side] = point[side] - length * direction;
            baseLine[1][opSide] = point[opSide];
        } else {
            var k = index === 0 || index === 2 ? -1 : 1;
            baseLine[1][opSide] = point[opSide] - (length - d2) * direction * k;
            baseLine[1][side] = square[index][side];
        }

        return baseLine;
    }

    function getBaloonSquare(feature, position) {
        var offset = feature.style.offset,
            x = position[0] + offset.x,
            y = position[1] + offset.y,
            width = feature.style.width,
            height = feature.style.height,
            square = [
                [x - 1, y - 1],
                [x + width + 1, y - 1],
                [x + width + 1, y + height + 1],
                [x - 1, y + height + 1]
            ];
        return square;
    }

    function isInside(position, square) {
        return position[0] >= square[0][0] &&
            position[0] <= square[2][0] &&
            position[1] >= square[0][1] &&
            position[1] <= square[2][1];
    }

    function getTailBasePoint(position, baloonSquare) {
        var square = baloonSquare.concat([baloonSquare[0]]),
            center = [(square[0][0] + square[2][0]) / 2, (square[0][1] + square[2][1]) / 2];
        for (var i = 0; i < 4; i++) {
            var side = (i + 1) % 2,
                direction = i === 1 || i === 2 ? 1 : -1;
            if (position[side] * direction > square[i][side] * direction) {
                var intersectionPoint = getIntersectionPoint([position, center], [square[i], square[i + 1]]);
                if (isOnTheLine(intersectionPoint, [square[i], square[i + 1]])) return {point: intersectionPoint, index: i};
            }
        }
    }

    function isOnTheLine(point, line) {
        var x1 = Math.min(line[0][0], line[1][0]),
            x2 = Math.max(line[0][0], line[1][0]),
            y1 = Math.min(line[0][1], line[1][1]),
            y2 = Math.max(line[0][1], line[1][1]);
        return point[0] >= (x1 - 0.1) && point[0] <= (x2 + 0.1) && point[1] >= (y1 - 0.1) && point[1] <= (y2 + 0.1);
    }

    function getIntersectionPoint(a, b) {
        var dx1 = a[0][0] - a[1][0],
            dx2 = b[0][0] - b[1][0],
            dy1 = a[0][1] - a[1][1],
            dy2 = b[0][1] - b[1][1],
            da = (a[0][0] * a[1][1] - a[0][1] * a[1][0]),
            db = (b[0][0] * b[1][1] - b[0][1] * b[1][0]),
            devisor = (dx1 * dy2 - dy1 * dx2),
            x = (da * dx2 - dx1 * db) / devisor,
            y = (da * dy2 - dy1 * db) / devisor;

        return [x, y];
    }

})();