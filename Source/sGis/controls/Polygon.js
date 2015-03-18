+'use strict';

(function() {

sGis.controls.Polygon = function(map, options) {
    if (!(map instanceof sGis.Map)) utils.error('Expected sGis.Map child, but got ' + map + ' instead');
    this._map = map;

    options = options || {};
    if (options.activeLayer) this.activeLayer = options.activeLayer;
    this._prototype = new sGis.feature.Polygon([[]], {style: options.style, symbol: options.symbol});
    

    utils.init(this, options);
    
    this._active = false;
    var self = this;
    
    this._clickHandler = function(sGisEvent) {
        setTimeout(function() {
            if (Date.now() - self._dblClickTime < 30) return;
            var pxPosition = sGisEvent.mouseOffset,
                point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y);

            if (self._activeFeature) {
                self._activeFeature.addPoint(point, self._activeFeature.coordinates.length - 1);
                if (sGisEvent.ctrlKey) {
                    self.startNewRing();
                }
                self.fire('pointAdd');
            } else {
                self._activeFeature = createNewPolygon(self.activeLayer, point, {style: self._prototype.style, symbol: self._prototype.symbol, crs: self._map.crs});
                self._map.addListener('mousemove.sGis-polygon', self._mousemoveHandler);
                self._map.addListener('dblclick.sGis-polygon', self._dblclickHandler);

                self._activeFeature.prohibitEvent('click');

                self.fire('drawingBegin');
                self.fire('pointAdd');
            }

            self._map.redrawLayer(self.activeLayer);
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        }, 10);
    };
    
    this._mousemoveHandler = function(sGisEvent) {
        var pxPosition = sGisEvent.mouseOffset,
            point = self._map.getPointFromPxPosition(pxPosition.x, pxPosition.y),
            ring = self._activeFeature.coordinates.length - 1;

        self._activeFeature.removePoint(ring, self._activeFeature.coordinates[ring].length - 1);
        
        if (self._activeFeature.coordinates.length > ring) {
            self._activeFeature.addPoint(point, ring);
        } else {
            self._activeFeature.setRing(ring, [point]);
        }
        
        self._map.redrawLayer(self.activeLayer);
    };
    
    this._dblclickHandler = function(sGisEvent) {
        finishDrawing(self);
        sGisEvent.preventDefault();
        self._dblClickTime = Date.now();
    };
};

sGis.controls.Polygon.prototype = new sGis.Control({
    _setActiveStatus: function(isActive) {
        if (isActive) {
            this._map.addListener('click.sGis-polygon', this._clickHandler);
        } else {
            if (this._activeFeature) finishDrawing(this);
            this._map.removeListener('click.sGis-polygon');
        }
        this._active = isActive;        
    },

    cancelDrawing: function() {
        if (this._activeFeature) {
            this._activeFeature.coordinates = [[[0, 0]]];
            this.prohibitEvent('drawingFinish');
            finishDrawing(this);
            this.allowEvent('drawingFinish');
        }
    },

    startNewRing: function() {
        var coordinates = this._activeFeature.coordinates;
        var ringIndex = coordinates.length;
        var point = coordinates.pop().pop();
        this._activeFeature.setRing(ringIndex, [point]);
    }
});

Object.defineProperties(sGis.controls.Polygon.prototype, {
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
        },

        set: function(feature) {
            if (!(feature instanceof sGis.feature.Polygon)) utils.error('sGis.feature.Polygon instance is expected but got ' + feature + ' instead');
            if (this._activeFeature) {
                if (feature === this._activeFeature) return;
                this.canceDrawing();
            }

            this._activeFeature = feature;
            this._map.addListener('mousemove.sGis-polygon', this._mousemoveHandler);
            this._map.addListener('dblclick.sGis-polygon', this._dblclickHandler);

            this._activeFeature.prohibitEvent('click');

            this.activate();
        }
    }
});

function createNewPolygon(layer, point, options) {
    var polygon = new sGis.feature.Polygon([[point.x, point.y], [point.x, point.y]], options);
    layer.add(polygon);
    return polygon;
}

function finishDrawing(control) {
    var ring = control._activeFeature.coordinates.length - 1;
    if (control._activeFeature.coordinates[ring].length < 3) {
        control.activeLayer.remove(control._activeFeature);
    } else {
        control._activeFeature.removePoint(ring, control._activeFeature.coordinates[ring].length - 1);
        var geom = control._activeFeature;
    }

    control._activeFeature.allowEvent('click');

    control._map.removeListener('mousemove.sGis-polygon');
    control._map.removeListener('dblclick.sGis-polygon');
    control._activeFeature = null;

    control._map.redrawLayer(control.activeLayer);
    if (geom) control.fire('drawingFinish', {geom: geom});
}

})();



