(function() {

    sGis.symbol.polyline = {
        Simple: function(style) {
            this.setDefaults(style);
        }
    };

    sGis.symbol.polyline.Simple.prototype = new sGis.Symbol({
        type: 'polyline',
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
            }
        },
        renderFunction: function(resolution, crs) {
            var coordinates = getPolylineRenderedCoordinates(this, resolution, crs);

            return [new sGis.geom.Polyline(coordinates, {color: this.style.strokeColor, width: this.style.strokeWidth})];
        }
    });

    //TODO: this is duplicate function with Polygon

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

})();