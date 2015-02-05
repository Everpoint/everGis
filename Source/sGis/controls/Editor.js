'use strict';

(function() {

    sGis.controls.Editor = function(map, options) {
        this._map = map;
        if (options && options.activeLayer) this.activeLayer = options.activeLayer;

        utils.init(this, options);
    };

    sGis.controls.Editor.prototype = new sGis.Control({
        _allowDeletion: true,

        activate: function() {
            var features = this.activeLayer.features;
            for (var i = 0; i < features.length; i++) {
                var feature = features[i];
                feature.addListner('click.sGis-editor', selectFeature);
            }
            this.activeLayer.addListner('featureAdd.sGis-editor', function(sGisEvent) {
                sGisEvent.feature.addListner('click.sGis-editor', selectFeature);
            });
            this.activeLayer.addListner('featureRemove.sGis-editor', function(sGisEvent) {
                sGisEvent.feature.removeListner('.sGis-editor');
            });

            this._active = true;

            var self = this;
            function selectFeature(sGisEvent) {
                self.selectFeature(this);

                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();
            }
        },

        deactivate: function() {
            if (this._active) {
                if (this._selectedFeature) {
                    this._map.removeLayer(this._tempLayer);
                    this._map.removeListner('.sGis-editor');

                    this.fire('featureDeselect', {feature: this._selectedFeature});
                    this._selectedFeature = null;
                }

                var features = this._activeLayer.features;
                for (var i = 0; i < features.length; i++) {
                    features[i].removeListner('.sGis-editor');
                }
                this._activeLayer.removeListner('.sGis-editor');

                this._active = false;
            }
        },

        selectFeature: function(feature) {
            if (this._selectedFeature) this.deselectFeature();

            var tempLayer = new sGis.FeatureLayer(),
                tempLayerIndex = this._map.getLayerIndex(this.activeLayer) + 1;

            this._tempLayer = tempLayer;
            var tempFeature = createTempFeature[feature.type](feature, this);

            tempLayer.add(tempFeature);

            this._map.prohibitEvent('layerAdd');
            this._map.moveLayerToIndex(tempLayer, tempLayerIndex);
            this._map.allowEvent('layerAdd');

            feature.removeListner('click.sGis-editor');
            feature.addListner('click.sGis-editor', doNothing.bind(this));

            var self = this;

            this._tempLayer = tempLayer;
            this._selectedFeature = feature;
            this._map.addListner('click.sGis-editor', function(sGisEvent) {
                if (!self._deselectProhibited) self.deselectFeature();
            });
            this._map.addListner('keydown.sGis-editor', onkeydown);
            this._map.addListner('layerRemove.sGis-editor', function(sGisEvent) {
                if (sGisEvent.layer === self.activeLayer) {
                    self.deselectFeature();
                    self._activeLayer = null;
                }
            });

            this.fire('featureSelect', {feature: feature});

            function onkeydown(sGisEvent) {
                if (self._ignoreEvents) return;
                var event = sGisEvent.browserEvent;
                if (event.which === 27) {
                    if (!self._deselectProhibited) self.deselectFeature();
                } else if (event.which === 46) {
                    removeActiveFeature(self);
                }
            }
        },

        deselectFeature: function() {
            var feature = this._selectedFeature,
                self = this;

            this._map.removeLayer(this._tempLayer);
            this._map.removeListner('.sGis-editor');
            feature.removeListner('.sGis-editor');
            feature.addListner('click.sGis-editor', function(sGisEvent) {
                self.selectFeature(feature);
                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();
            });

            this._selectedFeature = null;

            this.fire('featureDeselect', {feature: feature});
        },

        prohibitDeselect: function() {
            this._deselectProhibited = true;
        },

        allowDeselect: function() {
            this._deselectProhibited = false;
        }
    });

    Object.defineProperties(sGis.controls.Editor.prototype, {
        activeFeature: {
            get: function() {
                return this._selectedFeature;
            }
        },

        allowDeletion: {
            get: function() {
                return this._allowDeletion;
            },
            set: function(bool) {
                this._allowDeletion = bool;
            }
        },

        ignoreEvents: {
            get: function() {
                return this._ignoreEvents;
            },
            set: function(bool) {
                this._ignoreEvents = bool;
            }
        }
    });

    function doNothing(sGisEvent) {
        if (this._ignoreEvents) return;
        sGisEvent.stopPropagation();
        sGisEvent.preventDefault();
    }

    var createTempFeature = {
        point: function(point,editor) {
            var tempPoint = new sGis.feature.Point(point.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y], {
                crs: point.crs,
                color: 'rgb(248,129,181)',
                size: parseInt(point.size) + 5,
                image: point.image ? point.image : '',
                anchorPoint: point.anchorPoint
            });

            tempPoint.addListner('click', doNothing.bind(editor));
            tempPoint.addListner('dragStart', pointDragStart);
            tempPoint.addListner('drag', dragPoint);
            return tempPoint;

            function dragPoint(sGisEvent) {
                if (this.crs === editor._map.crs) {
                    point.x = this.x -= sGisEvent.offset.x;
                    point.y = this.y -= sGisEvent.offset.y;
                } else {
                    var tempFeature = this.projectTo(editor._map.crs);
                    tempFeature.x -= sGisEvent.offset.x;
                    tempFeature.y -= sGisEvent.offset.y;

                    var projected = tempFeature.projectTo(this.crs);
                    point.x = this.x = projected.x;
                    point.y = this.y = projected.y;
                }

                editor._map.redrawLayer(editor._activeLayer);
                editor._map.redrawLayer(editor._tempLayer);

                editor.fire('featureMove', {feature: point});
            }

        },
        polyline: function(polyline, editor) {
            var points = polyline.coordinates,
                tempPolyline = new sGis.feature.Polyline(points, {
                    crs: polyline.crs,
                    color: 'rgb(248, 129, 181)',
                    width: parseInt(polyline.width) + 1
                }),
                features = [tempPolyline];

            features = features.concat(getControlPoints(tempPolyline, editor));
            tempPolyline.addListner('click', addControlPoint);
            tempPolyline.addListner('dragStart',  function(sGisEvent) {
                sGisEvent.draggingObject = this;
            });
            tempPolyline.addListner('drag', function(sGisEvent) {
                movePolyline(this, sGisEvent.offset, editor);
            });

            return features;

            function addControlPoint(sGisEvent) {
                var index = sGisEvent.intersectionType,
                    point = sGisEvent.point.projectTo(polyline.crs);

                polyline.insertPoint(index[0], index[1] + 1, polyline.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y]);
                updateTempFeature(editor);

                updateTempFeature(editor);

                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();

                editor.fire('featurePointAdd', {feature: polyline});
            }
        },
        polygon: function(polygon, editor) {

            var points = polygon.coordinates;

            for (var ring = 0, l = points.length; ring < l; ring++) {
                points[ring].push(points[ring][0]);
            }

            var tempPolyline = new sGis.feature.Polyline(points, {
                    crs: polygon.crs,
                    color: 'rgb(248, 129, 181)',
                    width: parseInt(polygon.width) + 1
                }),
                features = [tempPolyline];

            features = features.concat(getControlPoints(tempPolyline, editor, true));
            tempPolyline.addListner('click', addControlPoint);
            tempPolyline.addListner('dragStart',  function(sGisEvent) {
                if (editor._ignoreEvents) return;
                sGisEvent.draggingObject = this;
            });
            tempPolyline.addListner('drag', function(sGisEvent) {
                if (editor.ignoreEvents) return;
                movePolyline(this, sGisEvent.offset, editor);
            });

            if (!polygon.hasListners('dragStart')) {
                polygon.addListner('dragStart.sGis-editor', function(sGisEvent) {
                    if (editor._ignoreEvents) return;
                    sGisEvent.draggingObject = this;
                });
                polygon.addListner('drag.sGis-editor', function(sGisEvent) {
                    if (editor._ignoreEvents) return;
                    movePolyline(editor._tempLayer.features[0], sGisEvent.offset, editor);
                });
            }

            return features;

            function addControlPoint(sGisEvent) {
                if (editor._ignoreEvents) return;
                var index = sGisEvent.intersectionType;

                var point = sGisEvent.point.projectTo(polygon.crs);

                polygon.insertPoint(index[0], index[1] + 1, polygon.crs === sGis.CRS.geo ? [point.y, point.x] : [point.x, point.y]);
                updateTempFeature(editor);

                sGisEvent.stopPropagation();
                sGisEvent.preventDefault();

                editor.fire('featurePointAdd', {feature: polygon, pointIndex: index + 1});
            }
        }
    };

    function movePolyline(feature, offset, editor) {
        var tempFeature = feature.projectTo(editor._map.crs),
            coordinates = tempFeature.coordinates;
        for (var ring = 0, l = coordinates.length; ring < l; ring++) {
            for (var i = 0, m = coordinates[ring].length; i < m; i++) {
                coordinates[ring][i] = [coordinates[ring][i][0] - offset.x, coordinates[ring][i][1] - offset.y];
            }
        }

        tempFeature.coordinates = coordinates;

        feature.coordinates = tempFeature.projectTo(feature.crs).coordinates;

        if (editor._selectedFeature.type === 'polygon') {
            var tempCoord = feature.coordinates;
            for (var i = 0, len = tempCoord.length; i < len; i++) {
                tempCoord[i].pop();
            }
            editor._selectedFeature.coordinates = tempCoord;
        } else {
            editor._selectedFeature.coordinates = feature.coordinates;
        }

        updateTempFeature(editor);
        editor.fire('featureMove', { feature: editor._selectedFeature });
    }

    function getControlPoints(feature, editor, isPolygon) {
        var coordinates = feature.coordinates,
            controlPoints = [];

        if (isPolygon) {
            for (var ring = 0, l = coordinates.length; ring < l; ring++) {
                coordinates[ring].pop();
            }
        }

        for (var ring = 0, l = coordinates.length; ring < l; ring++) {
            for (var i = 0, m = coordinates[ring].length; i < m; i++) {
                var point = new sGis.feature.Point(coordinates[ring][i], {
                    crs: feature.crs,
                    color: 'rgb(173, 90, 126)',
                    size: Math.max(12, parseInt(feature.width) + 4)
                });

                point.indexInPolyline = {ring: ring, i: i};
                controlPoints.push(point);

                point.addListner('click', doNothing.bind(editor));
                point.addListner('dragStart', pointDragStart);
                point.addListner('drag', dragControlPoint);
                point.addListner('dblclick', removeControlPoint);
            }
        }

        controlPoints = controlPoints.concat(getScalingControls(feature, controlPoints, editor));

        return controlPoints;

        function dragControlPoint(sGisEvent) {
            if (editor._ignoreEvents) return;
            if (this.crs === editor._map.crs) {
                this.x -= sGisEvent.offset.x;
                this.y -= sGisEvent.offset.y;

                var coordinates = [this.x, this.y];
            } else {
                var tempFeature = this.projectTo(editor._map.crs);
                tempFeature.x -= sGisEvent.offset.x;
                tempFeature.y -= sGisEvent.offset.y;

                var projected = tempFeature.projectTo(this.crs);
                this.x = projected.x;
                this.y = projected.y;

                coordinates = [this.y, this.x];
            }

            var ring = this.indexInPolyline.ring;

            feature.setPoint(ring, this.indexInPolyline.i, coordinates);
            if (isPolygon && this.indexInPolyline.i === 0) {
                feature.setPoint(ring, feature.coordinates[ring].length - 1, coordinates);
            }
            editor._selectedFeature.setPoint(this.indexInPolyline.ring, this.indexInPolyline.i, coordinates);

            updateScalingControls(feature, editor);

            editor._map.redrawLayer(editor._activeLayer);
            editor._map.redrawLayer(editor._tempLayer);

            editor.fire('featurePointChange', {feature: editor._selectedFeature, pointIndex: this.indexInPolyline});
        }

        function removeControlPoint(sGisEvent) {
            if (editor._ignoreEvents) return;
            if (coordinates[this.indexInPolyline.ring].length > 2) {
                editor._selectedFeature.removePoint(this.indexInPolyline.ring, this.indexInPolyline.i);
                updateTempFeature(editor);

                editor.fire('featurePointRemove', {feature: editor._selectedFeature, pointIndex: this.indexInPolyline});
            } else {
                removeActiveFeature(editor);
            }

            sGisEvent.stopPropagation();
            sGisEvent.preventDefault();
        }
    }

    function updateScalingControls(feature, editor) {
        var featureList = editor._tempLayer.features.slice(0, -9),
            scalingControls = getScalingControls(feature, featureList.slice(1), editor);
        editor._tempLayer.features = featureList.concat(scalingControls);
    }

    function getScalingControls(feature, controlPoints, editor) {
        var bbox = feature.bbox,
            scalingControls = [],
            midX = (bbox.p[0].x + bbox.p[1].x) / 2,
            midY = (bbox.p[0].y + bbox.p[1].y) / 2,
            symbol = new sGis.symbol.point.Square({size: 7, strokeWidth: 3}),
            coord = [
                [[bbox.p[0].x, bbox.p[0].y], [bbox.p[0].x, midY], [bbox.p[0].x, bbox.p[1].y]],
                [[midX, bbox.p[0].y], [midX, midY], [midX, bbox.p[1].y]],
                [[bbox.p[1].x, bbox.p[0].y], [bbox.p[1].x, midY], [bbox.p[1].x, bbox.p[1].y]]
            ];

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (i !== 1 || j !== 1) {
                    var point = new sGis.feature.Point(coord[i][j], {crs: feature.crs, symbol: symbol, style: {offset: {x: (i - 1) * 10, y: (1 - j) * 10}}});
                    point.scaleX = i !== 1;
                    point.scaleY = j !== 1;

                    point.addListner('dragStart', startDrag);
                    point.addListner('drag', scalingDrag);

                    scalingControls.push(point);
                }
            }
        }

        var rotationControl = new sGis.feature.Point([midX, bbox.p[1].y], {crs: feature.crs, style: {offset: {x: 0, y: -25}}});
        rotationControl.addListner('dragStart', rotationStart);
        rotationControl.addListner('drag', rotationDrag);
        rotationControl.addListner('dragEnd', rotationEnd);

        scalingControls.push(rotationControl);

        var pointGroup = new sGis.PointGroup(controlPoints.concat(scalingControls));

        return scalingControls;


        function startDrag(sGisEvent) {
            if (editor._ignoreEvents) return;
            sGisEvent.draggingObject = this;
        }

        function scalingDrag(sGisEvent) {
            if (editor._ignoreEvents) return;
            var basePoint = scalingControls[7 - scalingControls.indexOf(this)];
            if (this.scaleX && this.scaleY) {
                var scalingPoint = sGisEvent.point.coordinates;
            } else {
                var scalingPoint = sGis.geotools.pointToLineProjection(sGisEvent.point.coordinates, [this.coordinates, basePoint.coordinates]);
            }

            var kx = (basePoint.x - scalingPoint[0]) / (basePoint.x - this.x) || 1,
                ky = (basePoint.y - scalingPoint[1]) / (basePoint.y - this.y) || 1;

            pointGroup.scale([kx, ky], basePoint);
            feature.scale([kx, ky], basePoint);
            updateFeatureCoordinates(editor._selectedFeature, feature);

            editor._map.redrawLayer(editor._tempLayer);
            editor._map.redrawLayer(editor._activeLayer);
        }

        function rotationStart(sGisEvent) {
            if (editor._ignoreEvents) return;
            sGisEvent.draggingObject = this;
            this.rotationBase = feature.centroid;
            editor.fire('rotationStart', sGisEvent);
        }

        function rotationDrag(sGisEvent) {
            if (editor._ignoreEvents) return;
            var alpha1 = this.x === this.rotationBase[0] ? Math.PI / 2 : Math.atan2(this.y - this.rotationBase[1], this.x - this.rotationBase[0]),
                alpha2 = sGisEvent.point.x === this.rotationBase[0] ? Math.PI / 2 : Math.atan2(sGisEvent.point.y - this.rotationBase[1], sGisEvent.point.x - this.rotationBase[0]),
                angle = alpha2 - alpha1;

            pointGroup.rotate(angle, this.rotationBase);
            feature.rotate(angle, this.rotationBase);
            updateFeatureCoordinates(editor._selectedFeature, feature);
            updateScalingControls(feature, editor);

            sGisEvent.angle = alpha2 - Math.PI / 2;
            editor.fire('rotation', sGisEvent);

            editor._map.redrawLayer(editor._tempLayer);
            editor._map.redrawLayer(editor._activeLayer);
        }

        function rotationEnd(sGisEvent) {
            editor.fire('rotationEnd', sGisEvent);
        }
    }

    function updateFeatureCoordinates(feature, tempFeature) {
        if (feature.coordinates[0].length === tempFeature.coordinates[0].length) {
            feature.coordinates = tempFeature.coordinates;
        } else {
            var coord = [];
            for (var i = 0, len = tempFeature.coordinates.length; i < len; i++) {
                coord[i] = tempFeature.coordinates[i].slice(0, -1);
            }
            feature.coordinates = coord;
        }
    }

    function removeActiveFeature(editor) {
        if (editor._allowDeletion) {
            var features = editor._tempLayer.features,
                feature = editor._selectedFeature;
            editor._activeLayer.remove(feature);
            for (var i in features) {
                editor._tempLayer.remove(features[i]);
            }
            editor._map.redrawLayer(editor._activeLayer);
            editor._map.redrawLayer(editor._tempLayer);

            editor._map.removeListner('.sGis-editor');

            editor.fire('featureRemove', {feature: feature});
        }
    }

    function updateTempFeature(editor) {
        var features = editor._tempLayer.features;
        for (var i in features) {
            editor._tempLayer.remove(features[i]);
        }


        var feature = editor._selectedFeature,
            updatedFeatures = createTempFeature[feature.type](feature, editor);
        editor._tempLayer.add(updatedFeatures);

        editor._map.redrawLayer(editor._activeLayer);
        editor._map.redrawLayer(editor._tempLayer);
    }

    function pointDragStart(sGisEvent) {
        sGisEvent.draggingObject = this;
        sGisEvent.stopPropagation();
    }

})();