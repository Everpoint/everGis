'use strict';

(function() {

    sGis.controls.Polyline = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
        this._map = map;

        options = options || {};
        if (options.activeLayer) this.activeLayer = options.activeLayer;
        this._prototype = new sGis.feature.Polyline([[]], {symbol: options.symbol, style: options.style});

        utils.initializeOptions(this, options);

        this._active = false;
        var self = this;

        this._clickHandler = function(sGisEvent) {
            setTimeout(function() {
                if (Date.now() - self._dblClickTime < 30) return;
                var pxPosition = sGisEvent.mouseOffset,
                    point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

                if (self._activeFeature) {
                    self._activeFeature.addPoint(point);
                    self.fire('pointAdd');
                } else {
                    self._activeFeature = createNewPolyline(self.activeLayer, point, {style: self._prototype.style, symbol: self._prototype.symbol, crs: self._map.crs});
                    self._map.addListener('mousemove.sGis-polyline', self._mousemoveHandler);
                    self._map.addListener('dblclick.sGis-polyline', self._dblclickHandler);

                    self._activeFeature.prohibitEvent('click');

                    self.fire('drawingBegin');
                    self.fire('pointAdd');
                }

                self._map.redrawLayer(self.activeLayer);
            }, 10);

            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        };

        this._mousemoveHandler = function(sGisEvent) {
            var pxPosition = sGisEvent.mouseOffset,
                point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

            self._activeFeature.removePoint(0, self._activeFeature.coordinates[0].length - 1);
            self._activeFeature.addPoint(point);

            self._map.redrawLayer(self.activeLayer);
        };

        this._dblclickHandler = function(sGisEvent) {
            finishDrawing(self);
            sGisEvent.preventDefault();
            self._dblClickTime = Date.now();
        };
    };

    sGis.controls.Polyline.prototype = new sGis.Control({
        activate: function() {
            if (!this._isActive) {
                if (!this._activeLayer) {
                    if (!this._tempLayer) this._tempLayer = new sGis.FeatureLayer();
                    this._map.addLayer(this._tempLayer);
                    this._activeLayer = this._tempLayer;
                }

                this._map.addListener('click.sGis-polyline', this._clickHandler);
                this._isActive = true;
            }
        },

        deactivate: function() {
            if (this._isActive) {
                if (this._activeFeature) finishDrawing(this);
                this._map.removeListener('click.sGis-polyline', this._clickHandler);

                if (this._activeLayer === this._tempLayer) {
                    this._map.removeLayer(this._tempLayer);
                    this._tempLayer.features = [];
                    this._activeLayer = null;
                }

                this._isActive = false;
            }
        },

        cancelDrawing: function() {
            if (this._activeFeature) {
                this._activeFeature.coordinates = [[[0, 0]]];
                finishDrawing(this);
            }
        }
    });

    Object.defineProperties(sGis.controls.Polyline.prototype, {
        isActive: {
            get: function() {
                return this._isActive;
            },
            set: function(bool) {
                if (bool) {
                    this.activate();
                } else {
                    this.deactivate();
                }
            }
        },

        activeLayer: {
            get: function() {
                return this._activeLayer;
            },
            set: function(layer) {
                if (!(layer instanceof sGis.FeatureLayer) && layer !== null) utils.error('sGis.FeatureLayer instance is expected but got ' + layer + ' instead');
                this._activeLayer = layer;
            }
        },

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
        },

        activeFeature: {
            get: function() {
                return this._activeFeature;
            }
        }
    });

    function createNewPolyline(layer, point, options) {
        var polyline = new sGis.feature.Polyline([[point.x, point.y], [point.x, point.y]], options);
        layer.add(polyline);
        return polyline;
    }

    function finishDrawing(control) {
        if (control._activeFeature.coordinates[0].length < 3) {
            control.activeLayer.remove(control._activeFeature);
        } else {
            control._activeFeature.removePoint(0, control._activeFeature.coordinates[0].length - 1);
            var geom = control._activeFeature;
        }

        control._map.removeListener('mousemove.sGis-polyline');
        control._map.removeListener('dblclick.sGis-polyline');

        control._activeFeature.allowEvent('click');

        control._activeFeature = null;

        control._map.redrawLayer(control.activeLayer);
        if (geom) control.fire('drawingFinish', {geom: geom});
    }

})();