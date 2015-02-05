'use strict';

(function() {

    sGis.feature.Polygon = function(coordinates, options) {
        this.__initialize(options);

        this._coordinates = [[]];
        if (coordinates) this.coordinates = coordinates;
    };

    sGis.feature.Polygon.prototype = new sGis.feature.Polyline();

    Object.defineProperties(sGis.feature.Polygon.prototype, {
        _defaultSymbol: {
            value: sGis.symbol.polygon.Simple
        },

        _fillColor: {
            value: sGis.geom.Polygon.prototype._fillColor,
            writable: true
        },

        type: {
            value: 'polygon'
        },

        fillColor: {
            get: function() {
                return this._style.fillColor;
            },

            set: function(color) {
                this._style.fillColor = color;
            }
        },

        clone: {
            value: function() {
                return new sGis.feature.Polygon(this._coordinates, {
                    crs: this._crs,
                    color: this._color,
                    width: this._width,
                    fillColor: this.fillColor,
                    style: this.style,
                    symbol: this.symbol
                });
            }
        }
    });

})();