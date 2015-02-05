'use strict';

(function() {

    sGis.controls.Point = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
        this._map = map;

        if (options && options.activeLayer) this.activeLayer = options.activeLayer;
        this._prototype = new sGis.feature.Point([0, 0], {style: options.style, symbol: options.symbol});

        utils.initializeOptions(this, options);

        this._active = false;

        var self = this;

        this._addPoint = function(sGisEvent) {
            var pxPosition = sGisEvent.mouseOffset,
                point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y),
                feature = new sGis.feature.Point(point.getCoordinates(), {crs: self._map.crs, symbol: self._prototype.symbol, style: self._prototype.style}),
                activeLayer = self.activeLayer;

            activeLayer.add(feature);
            self._map.redrawLayer(activeLayer);

            self.fire('drawingFinish', {geom: feature});
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        };
    };

    sGis.controls.Point.prototype = new sGis.Control({
        _setActiveStatus: function(isActive) {
            if (isActive) {
                this._map.addListner('click.sGis-point', this._addPoint);
            } else {
                this._map.removeListner('click.sGis-point', this._addPoint);
            }
            this._active = isActive;
        }
    });

    Object.defineProperties(sGis.controls.Point.prototype, {
        style: {
            get: function() {
                return this._prototype.style;
            },
            set: function(style) {
                this._prototype.style = style;
            }
        },

        symbol: {
            get: function() {
                return this._prototype.symbol;
            },
            set: function(symbol) {
                this._prototype.symbol = symbol;
            }
        }
    });

})();