(function() {

    sGis.controls.Rectangle = function(map, options) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map instance is expected but got ' + map + ' instead');
        this._map = map;

        options = options || {};

        if (options.activeLayer) this.activeLayer = options.activeLayer;
    };

    sGis.controls.Rectangle.prototype = new sGis.Control({
        _setActiveStatus: function(active) {
            var self = this;
            if (active) {
                this._map.addListner('dragStart.sGis-RectangleControl', function(sGisEvent) {
                    self._startDrawing(sGisEvent.point);

                    this.addListner('drag.sGis-RectangleControl', function(sGisEvent) {
                        self._updateRectangle(sGisEvent.point);
                        sGisEvent.stopPropagation();
                        sGisEvent.preventDefault();
                    });

                    this.addListner('dragEnd.sGis-RectangleControl', function() {
                        var feature = self._activeFeature;
                        this.removeListner('drag dragEnd.sGis-RectangleControl');
                        this._activeFeature = null;
                        self.fire('drawingFinish', { geom: feature });
                    });

                    self.fire('drawingStart', { geom: self._activeFeature });
                });

                this._active = true;
            } else {
                this._map.removeListner('.sGis-RectangleControl');
                this._active = false;
            }
        },

        _startDrawing: function(point) {
            var coord = point.getCoordinates(),
                rect = new sGis.feature.Polygon([coord, coord, coord, coord], { crs: point.crs });

            this.activeLayer.add(rect);
            this._activeFeature = rect;

            this._map.redrawLayer(this.activeLayer);
        },

        _updateRectangle: function(newPoint) {
            var coord = this._activeFeature.coordinates[0],
                pointCoord = newPoint.getCoordinates();

            coord = [coord[0], [coord[1][0], pointCoord[1]], pointCoord, [pointCoord[0], coord[3][1]]];

            this._activeFeature.coordinates = coord;
            this._map.redrawLayer(this.activeLayer);
        }
    });



})();