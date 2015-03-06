'use strict';

(function() {

    var PREFIX = 'sGis-control-edit-';

    sGis.controls.Editor = function(map, properties) {
        if (!(map instanceof sGis.Map)) utils.error('sGis.Map is expected but got ' + map + ' instead');

        this._map = map;
        this._id = utils.getGuid();

        this._ns = PREFIX + this._id;
        sGis.utils.init(this, properties);
    };

    sGis.controls.Editor.prototype = new sGis.Control({
        _snappingPointSymbol: new sGis.symbol.point.Point({fillColor: 'red', size: 3}),
        _snappingVertexSymbol: new sGis.symbol.point.Point({fillColor: 'blue', size: 6}),
        _pointSnappingFunctions: ['vertex', 'midpoint', 'line'],
        _polylineSnappingFunctions: ['vertex', 'midpoint', 'line', 'axis', 'orthogonal'],
        _rotationControlSymbol: new sGis.symbol.point.Point({offset: {x: 0, y: -30}}),
        _translateControlSymbol: sGis.symbol.point.Square,

        activate: function() {
            if (!this._isActive) {
                this._setEventListeners();
                this._isActive = true;
            }
        },

        deactivate: function() {
            if (this._isActive) {
                this._removeEventListeners();
                this.deselect();
                this._isActive = false;
            }
        },

        _setEventListeners: function() {
            if (this._activeLayer) {
                var features = this._activeLayer.features;
                for (var i = 0; i < features.length; i++) {
                    this._setFeatureClickHandler(features[i]);
                }

                var self = this;
                this._activeLayer.addListner('featureAdd.' + this._ns, function(sGisEvent) { self._setFeatureClickHandler(sGisEvent.feature); });
                this._activeLayer.addListner('featureRemove.' + this._ns, function(sGisEvent) { self._removeFeatureClickHandler(sGisEvent.feature); });

                this._map.addListner('keydown.' + this._ns, this._keydownHandler.bind(this));
            }
        },

        _removeEventListeners: function() {
            if (this._activeLayer) {
                var features = this._activeLayer.features;
                for (var i = 0; i < features.length; i++) {
                    this._removeFeatureClickHandler(features[i]);
                }
                this._activeLayer.removeListner('.' + this._ns);
            }
            this._map.removeListner('keydown.' + this._ns);
        },

        _keydownHandler: function(sGisEvent) {
            if (this._ignoreEvents) return;
            var event = sGisEvent.browserEvent;
            if (event.which === 27) {
                if (!this._deselectProhibited) this.deselect();
                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();
            } else if (event.which === 46) {
                this.deleteSelected();
                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();
            } else if (event.which === 9) {
                this._selectNext();
                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();
            }
        },

        _selectNext: function() {
            if (this._activeLayer) {
                var features = this._activeLayer.features;

                this.select(features[0]);
            }
        },

        _setFeatureClickHandler: function(feature) {
            var self = this;
            feature.addListner('click.' + this._ns, function(sGisEvent) { self._featureClickHandler(sGisEvent, this); });
        },

        _removeFeatureClickHandler: function(feature) {
            feature.removeListner('click.' + this._ns);
        },

        _featureClickHandler: function(sGisEvent, feature) {
            this.select(feature);
            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        },

        select: function(feature) {
            if (this._selectedFeature === feature) return;
            this.deselect();

            if (this._isActive && this._activeLayer && this._activeLayer.has(feature)) {
                this._map.addListner('click.' + this._ns, this._mapClickHandler.bind(this));
                this._selectedFeature = feature;
                this._activeLayer.moveToTop(feature);
                this._setSelectedListeners();
                this._setTempSymbol();
                this._setSnappingLayer();
                this._map.redrawLayer(this._activeLayer);

                this.fire('featureSelect', {feature: feature});
            }
        },

        deselect: function() {
            if (this._selectedFeature) {
                var feature = this._selectedFeature;
                this._map.removeListner('click.' + this._ns);
                this._clearTempSymbol();
                this._removeSelectedListeners();
                this._removeSnappingLayer();
                this._selectedFeature = null;
                if (this._map.getLayerIndex(this._activeLayer) !== -1) this._map.redrawLayer(this._activeLayer);

                this.fire('featureDeselect', {feature: feature});
            }
        },

        _setSnappingLayer: function() {
            if (!this._snappingLayer) {
                this._snappingLayer = new sGis.FeatureLayer();
                this._snappingPoint = new sGis.feature.Point([0, 0], {crs: this._map.crs, symbol: this._snappingPointSymbol});
                this._snappingPoint.hide();
                this._snappingLayer.add(this._snappingPoint);
                this._createTransformControls();
            }

            if (this._selectedFeature instanceof sGis.feature.Polyline) {
                this._updateTransformControls();
            }
            this._map.moveLayerToIndex(this._snappingLayer, Number.MAX_VALUE);
        },

        _removeSnappingLayer: function() {
            this._map.removeLayer(this._snappingLayer);
            this._snappingPoint.hide();
            this._hideTransformControls();
        },

        _createTransformControls: function() {
            var OFFSET = 10;
            var self = this;

            this._transformControls = [];
            for (var x = 0; x < 3; x++) {
                this._transformControls.push([]);
                for (var y = 0; y < 3; y++) {
                    if (x !== 1 || y !== 1) {
                        var symbol = new this._translateControlSymbol({offset: {x: (x-1)*OFFSET, y: -(y-1)*OFFSET}, size: 7});
                        var control = new sGis.feature.Point([0,0], {crs: this._map.crs, symbol: symbol, xIndex: x, yIndex: y});
                        control.hide();

                        control.addListner('dragStart', this._transformControlDragStartHandler);
                        control.addListner('drag', function(sGisEvent) { self._transformControlDragHandler(sGisEvent, this) });

                        this._transformControls[x][y] = control;
                        this._snappingLayer.add(control);
                    }
                }
            }

            var rotationControl = new sGis.feature.Point([0,0], {crs: this._map.crs, symbol: this._rotationControlSymbol});
            rotationControl.addListner('dragStart', function(sGisEvent) {
                self._rotationBase = self._selectedFeature.centroid;
                self._transformControlDragStartHandler.call(this, sGisEvent);
                self.fire('rotationStart');
            });
            rotationControl.addListner('drag', this._rotationControlDragHandler.bind(this));
            rotationControl.addListner('dragEnd', function() {
                self.fire('rotationEnd');
            });


            rotationControl.hide();
            this._snappingLayer.add(rotationControl);
            this._transformControls.rotationControl = rotationControl;
        },

        _hideTransformControls: function() {
            if (this._transformControls) {
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) {
                        if (this._transformControls[i][j]) {
                            this._transformControls[i][j].hide();
                        }
                    }
                }
                this._transformControls.rotationControl.hide();
            }
        },

        _transformControlDragStartHandler: function(sGisEvent) {
            sGisEvent.draggingObject = this; // called in feature context
            sGisEvent.stopPropagation();
        },

        _transformControlDragHandler: function(sGisEvent, feature) {
            var MIN_SIZE = 10;

            var xIndex = feature.xIndex === 0 ? 2 : feature.xIndex === 2 ? 0 : 1;
            var yIndex = feature.yIndex === 0 ? 2 : feature.yIndex === 2 ? 0 : 1;
            var basePoint = this._transformControls[xIndex][yIndex].coordinates;

            var bbox = this._selectedFeature.bbox;
            var resolution = this._map.resolution;
            var tolerance = MIN_SIZE * resolution;
            var width = bbox.width;
            var xScale = xIndex === 1 ? 1 : (width + (xIndex - 1) * sGisEvent.offset.x) / width;
            if (width < tolerance && xScale < 1) xScale = 1;
            var height = bbox.height;
            var yScale = yIndex === 1 ? 1 : (height + (yIndex - 1) * sGisEvent.offset.y) / height;
            if (height < tolerance && yScale < 1) yScale = 1;

            this._selectedFeature.scale([xScale, yScale], basePoint);
            this._map.redrawLayer(this._activeLayer);
            this._updateTransformControls();
        },

        _rotationControlDragHandler: function(sGisEvent) {
            var xPrev = sGisEvent.point.x + sGisEvent.offset.x;
            var yPrev = sGisEvent.point.y + sGisEvent.offset.y;

            var alpha1 = xPrev === this._rotationBase[0] ? Math.PI / 2 : Math.atan2(yPrev - this._rotationBase[1], xPrev - this._rotationBase[0]);
            var alpha2 = sGisEvent.point.x === this._rotationBase[0] ? Math.PI / 2 : Math.atan2(sGisEvent.point.y - this._rotationBase[1], sGisEvent.point.x - this._rotationBase[0]);
            var angle = alpha2 - alpha1;

            this._selectedFeature.rotate(angle, this._rotationBase);
            this._map.redrawLayer(this._activeLayer);
            this._updateTransformControls();

            this.fire('rotation');
        },

        _updateTransformControls: function() {
            if (this._selectedFeature) {
                var bbox = this._selectedFeature.bbox.projectTo(this._map.crs);
                var coordinates = [[bbox.xMin, bbox.yMin], [bbox.xMax, bbox.yMax]];
                var controls = this._transformControls;
                for (var i = 0; i < 3; i++) {
                    for (var j = 0; j < 3; j++) {
                        if (i !== 1 || j !== 1) {
                            var x = coordinates[0][0] + (coordinates[1][0] - coordinates[0][0]) * i / 2;
                            var y = coordinates[0][1] + (coordinates[1][1] - coordinates[0][1]) * j / 2;
                            controls[i][j].coordinates = [x, y];
                            controls[i][j].show();

                            if (i === 1 && j === 2) controls.rotationControl.coordinates = [x, y];
                        }
                    }
                }
                controls.rotationControl.show();
                this._map.redrawLayer(this._snappingLayer);
            } else {
                this._hideTransformControls();
            }
        },

        _mapClickHandler: function(sGisEvent) {
            this.deselect();
        },

        _setTempSymbol: function() {
            this._selectedFeature.setTempSymbol(new selectionSymbols[this._selectedFeature.type]({baseSymbol: this._selectedFeature.symbol}));
        },

        _clearTempSymbol: function() {
            this._selectedFeature.clearTempSymbol();
        },

        _setSelectedListeners: function() {
            var self = this;
            this._selectedFeature.addListner('dragStart.' + this._ns, function(sGisEvent) { self._dragStartHandler(sGisEvent, this); });
            this._selectedFeature.addListner('drag.' + this._ns, function(sGisEvent) { self._dragHandler(sGisEvent, this); });

            if (this._selectedFeature instanceof sGis.feature.Polyline) {
                this._selectedFeature.addListner('mousemove.' + this._ns, function(sGisEvent) { self._polylineMousemoveHandler(sGisEvent, this); });
                this._selectedFeature.addListner('mouseout.' + this._ns, function(sGisEvent) { self._polylineMouseoutHandler(sGisEvent, this); });
                this._selectedFeature.addListner('dblclick.' + this._ns, function(sGisEvent) { self._polylineDblclickHandler(sGisEvent, this); });
            }
        },

        _removeSelectedListeners: function() {
            this._selectedFeature.removeListner('dragStart.' + this._ns);
            this._selectedFeature.removeListner('drag.' + this._ns);
            this._selectedFeature.removeListner('mousemove.' + this._ns);
            this._selectedFeature.removeListner('mouseout.' + this._ns);
            this._selectedFeature.removeListner('dblclick.' + this._ns);
        },

        _dragStartHandler: function(sGisEvent, feature) {
            if (feature instanceof sGis.feature.Polyline) {
                this._currentDragInfo = this._getAdjustedEventData(sGisEvent, feature);
            }

            sGisEvent.draggingObject = feature;
            sGisEvent.stopPropagation();
        },

        _dragHandler: function(sGisEvent, feature) {
            if (feature instanceof sGis.feature.Point) {
                this._pointDragHandler(sGisEvent, feature);
            } else if (feature instanceof sGis.feature.Polyline) {
                this._polylineDragHandler(sGisEvent, feature);
            }
        },

        _polylineMousemoveHandler: function(sGisEvent, feature) {
            var adjustedEvent = this._getAdjustedEventData(sGisEvent, feature);
            var symbol = adjustedEvent.type === 'line' ? this._snappingPointSymbol : adjustedEvent.type === 'vertex' ? this._snappingVertexSymbol : null;

            if (symbol) {
                this._snappingPoint.coordinates = adjustedEvent.point;
                this._snappingPoint.symbol = symbol;

                this._snappingPoint.show();
            } else {
                this._snappingPoint.hide();
            }
            this._map.redrawLayer(this._snappingLayer);
        },

        _polylineDblclickHandler: function(sGisEvent, feature) {
            var adjustedEvent = this._getAdjustedEventData(sGisEvent, feature);
            if (adjustedEvent.type === 'vertex') {
                var coordinates = feature.coordinates;
                if (coordinates[adjustedEvent.ring].length > 2) {
                    feature.removePoint(adjustedEvent.ring, adjustedEvent.index);
                } else {
                    if (coordinates.length > 1) {
                        feature.removeRing(adjustedEvent.ring);
                    } else {
                        this.deleteSelected();
                    }
                }
                this._map.redrawLayer(this._activeLayer);
                this._updateTransformControls();
                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();

                this.fire('featurePointRemove', {feature: feature, pointIndex: adjustedEvent.index, ring: adjustedEvent.ring});
            }
        },

        deleteSelected: function() {
            if (this._allowDeletion && this._selectedFeature) {
                var feature = this._selectedFeature;
                this._activeLayer.remove(this._selectedFeature);
                this.deselect();

                this.fire('featureRemove', {feature: feature});
            }
        },

        _getAdjustedEventData: function(sGisEvent, feature) {
            var snappingType;
            if (sGisEvent.intersectionType && utils.isArray(sGisEvent.intersectionType)) {
                var coordinates = feature.coordinates;
                var ring = sGisEvent.intersectionType[0];
                var index = sGisEvent.intersectionType[1];
                if (feature instanceof sGis.feature.Polygon) {
                    coordinates[ring].push(coordinates[ring][0]);
                }

                var point = [];
                point[0] = coordinates[ring][index];
                point[1] = coordinates[ring][index + 1];
                var snappingPoint = sGis.geotools.pointToLineProjection(sGisEvent.point.coordinates, point);
                snappingType = 'line';

                var snappingDistance = this._snappingDistance * this._map.resolution;
                for (var i = 0; i < 2; i++) {
                    if (Math.abs(point[i][0] - snappingPoint[0]) < snappingDistance && Math.abs(point[i][1] - snappingPoint[1]) < snappingDistance) {
                        snappingPoint = point[i];
                        snappingType = 'vertex';
                        index += i;
                        break;
                    }
                }
            } else {
                snappingType = 'bulk';
            }

            return {point: snappingPoint, type: snappingType, ring: ring, index: index};
        },

        _polylineMouseoutHandler: function(sGisEvent, feature) {
            this._snappingPoint.hide();
            this._map.redrawLayer(this._snappingLayer);
        },

        _polylineDragHandler: function(sGisEvent, feature) {
            var dragInfo = this._currentDragInfo;
            if (dragInfo.type === 'vertex') {
                if (!sGisEvent.browserEvent.altKey) {
                    var snappingPoint = this._getSnappingPoint(sGisEvent.point, this._polylineSnappingFunctions, [feature], {
                        feature: feature,
                        ring: dragInfo.ring,
                        index: dragInfo.index
                    });
                }
                feature.setPoint(dragInfo.ring, dragInfo.index, snappingPoint || sGisEvent.point);

                this.fire('featurePointChange', {feature: feature, pointIndex: dragInfo.index, ring: dragInfo.ring});
            } else if (dragInfo.type === 'line') {
                dragInfo.index++;
                feature.insertPoint(dragInfo.ring, dragInfo.index, sGisEvent.point);
                dragInfo.type = 'vertex';

                this.fire('featurePointAdd', {feature: feature});
            } else {
                feature.move(-sGisEvent.offset.x, -sGisEvent.offset.y);
                this.fire('featureMove', {feature: feature});
            }

            this._updateTransformControls();
            this._map.redrawLayer(this._activeLayer);
        },

        _pointDragHandler: function(sGisEvent, feature) {
            var projected = feature.projectTo(this._map.crs);
            if (!sGisEvent.browserEvent.altKey) {
                var snappingPoint = this._getSnappingPoint(sGisEvent.point, this._pointSnappingFunctions, [feature]);
            }
            if (snappingPoint) {
                projected.x = snappingPoint[0];
                projected.y = snappingPoint[1];
            } else {
                projected.x = sGisEvent.point.x;
                projected.y = sGisEvent.point.y;
            }

            feature.coordinates = projected.projectTo(feature.crs).coordinates;
            this._map.redrawLayer(this._activeLayer);

            this.fire('featureMove', {feature: feature});
        },

        _getSnappingPoint: function(point, functions, exclude, featureData) {
            var snappingDistance = this._snappingDistance * this._map.resolution;
            for (var i = 0; i < functions.length; i++) {
                if (snapping[functions[i]]) var snappingPoint = snapping[functions[i]](point, this._activeLayer, snappingDistance, exclude, featureData);
                if (snappingPoint) return snappingPoint;
            }
        }
    });

    sGis.utils.proto.setProperties(sGis.controls.Editor.prototype, {
        allowDeletion: true,
        snappingDistance: 7,

        selectedFeature: {
            default: null,
            set: function(feature) {
                this.select(feature);
            }
        },

        activeLayer: {
            default: null,
            type: sGis.FeatureLayer,
            set: function(layer) {
                var isActive = this._isActive;
                this.deactivate();
                this._activeLayer = layer;
                this.isActive = isActive;
            }
        },

        isActive: {
            default: false,
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

        map: {
            default: null,
            set: null
        },

        id: {
            default: null,
            set: null
        }
    });

    var selectionSymbols = {
        point: sGis.symbol.editor.Point,
        polyline: sGis.symbol.editor.Point,
        polygon: sGis.symbol.editor.Point
    };

    var snapping = {
        /**
         * snaps to vertexes of all features around
         */
        vertex: function(point, layer, distance, exclude) {
            var bbox = new sGis.Bbox([point.x - distance, point.y - distance], [point.x + distance, point.y + distance], point.crs);
            var features = layer.getFeatures(bbox);

            for (var i = 0; i < features.length; i++) {
                if (exclude.indexOf(features[i]) !== -1) continue;
                var feature = features[i].projectTo(point.crs);
                if (feature instanceof sGis.feature.Point) {
                    if (Math.abs(feature.x - point.x) < distance && Math.abs(feature.y - point.y) < distance) {
                        return [feature.x, feature.y];
                    }
                } else if (feature instanceof sGis.feature.Polyline) {
                    var coordinates = feature.coordinates;
                    for (var ring = 0; ring < coordinates.length; ring++) {
                        for (var j = 0; j < coordinates[ring].length; j++) {
                            if (Math.abs(coordinates[ring][j][0] - point.x) < distance && Math.abs(coordinates[ring][j][1] - point.y) < distance) {
                                return coordinates[ring][j];
                            }
                        }
                    }
                }
            }
        },

        midpoint: function(point, layer, distance, exclude) {
            var bbox = new sGis.Bbox([point.x - distance, point.y - distance], [point.x + distance, point.y + distance], point.crs);
            var features = layer.getFeatures(bbox);
            for (var i = 0; i < features.length; i++) {
                if (exclude.indexOf(features[i]) !== -1 || !(features[i] instanceof sGis.feature.Polyline)) continue;
                var feature = features[i].projectTo(point.crs);
                var coordinates = feature.coordinates;

                for (var ring = 0; ring < coordinates.length; ring++) {
                    if (feature instanceof sGis.feature.Polygon) coordinates[ring].push(coordinates[ring][0]);

                    for (var j = 1; j < coordinates[ring].length; j++) {
                        var midPointX = (coordinates[ring][j][0] + coordinates[ring][j-1][0]) / 2;
                        var midPointY = (coordinates[ring][j][1] + coordinates[ring][j-1][1]) / 2;

                        if (Math.abs(midPointX - point.x) < distance && Math.abs(midPointY - point.y) < distance) {
                            return [midPointX, midPointY];
                        }
                    }
                }
            }
        },

        line: function(point, layer, distance, exclude) {
            var bbox = new sGis.Bbox([point.x - distance, point.y - distance], [point.x + distance, point.y + distance], point.crs);
            var features = layer.getFeatures(bbox);
            for (var i = 0; i < features.length; i++) {
                if (exclude.indexOf(features[i]) !== -1 || !(features[i] instanceof sGis.feature.Polyline)) continue;
                var feature = features[i].projectTo(point.crs);
                var coordinates = feature.coordinates;

                for (var ring = 0; ring < coordinates.length; ring++) {
                    if (feature instanceof sGis.feature.Polygon) coordinates[ring].push(coordinates[ring][0]);

                    for (var j = 1; j < coordinates[ring].length; j++) {
                        var projection = sGis.geotools.pointToLineProjection(point.coordinates, [coordinates[ring][j-1], coordinates[ring][j]]);

                        if (Math.abs(projection[0] - point.x) < distance && Math.abs(projection[1] - point.y) < distance) {
                            return projection;
                        }
                    }
                }
            }
        },

        axis: function(point, layer, distance, exclude, featureData) {
            var lines = [];
            var ring = featureData.feature.coordinates[featureData.ring];
            if (featureData.feature instanceof sGis.feature.Polygon) ring.push(ring[0]);
            var index = featureData.index;

            if (index < ring.length - 1) {
                lines.push([ring[index], ring[index + 1]]);
            }
            if (index === 0) {
                if (featureData.feature instanceof sGis.feature.Polygon) lines.push([ring[index], ring[ring.length - 2]]);
            } else {
                lines.push([ring[index], ring[index - 1]]);
            }

            var basePoint = [];
            for (var i = 0; i < lines.length; i++) {
                for (var axis = 0; axis < 2; axis++) {
                    var projection = [lines[i][axis][0], lines[i][(axis + 1)%2][1]];
                    if (Math.abs(projection[0] - point.x) < distance && Math.abs(projection[1] - point.y) < distance) {
                        basePoint[(axis+1)%2] = lines[i][1][(axis+1)%2];
                        break;
                    }
                }
            }

            if (basePoint.length > 0) return [basePoint[0] === undefined ? point.x : basePoint[0], basePoint[1] === undefined ? point.y : basePoint[1]];
        },

        orthogonal: function(point, layer, distance, exclude, featureData) {
            var lines = [];
            var ring = featureData.feature.coordinates[featureData.ring];
            var index = featureData.index;
            if (featureData.feature instanceof sGis.feature.Polygon) {
                var n = ring.length;
                lines.push([ring[(index+1) % n], ring[(index+2) % n]]);
                lines.push([ring[(n + index - 1) % n], ring[(n + index - 2) % n]]);
            } else {
                if (ring[index+2]) {
                    lines.push([ring[index+1], ring[index+2]]);
                }
                if (ring[index-2]) {
                    lines.push([ring[index-1], ring[index-2]]);
                }
            }

            for (var i = 0; i < lines.length; i++) {
                var projection = sGis.geotools.pointToLineProjection(point.coordinates, lines[i]);
                var dx = projection[0] - lines[i][0][0];
                var dy = projection[1] - lines[i][0][1];
                if (Math.abs(dx) < distance && Math.abs(dy) < distance) {
                    var basePoint = [point.x - dx, point.y - dy];
                    var direction = i === 0 ? 1 : -1;
                    var nextPoint = n ? ring[(n + index + direction) % n] : ring[index + direction];
                    var prevPoint = n ? ring[(n + index - direction) % n] : ring[index - direction];
                    if (nextPoint && prevPoint) {
                        projection = sGis.geotools.pointToLineProjection(prevPoint, [ring[index], nextPoint]);
                        if (Math.abs(projection[0] - point.x) < distance && Math.abs(projection[1] - point.y) < distance) {
                            basePoint = projection;
                        }
                    }
                    return basePoint;
                }
            }
        }
    };

})();