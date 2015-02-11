'use strict';

(function() {

    /**
     *
     * @mixes sGis.IEventHandler.prototype
     * @param options
     * @constructor
     */

    sGis.Map = function(options) {
        if (options && options.crs) initializeCrs(this, options.crs);
        utils.init(this, options);
        this._layerGroup = new sGis.LayerGroup(options ? options.layers : undefined);
    };

    sGis.Map.prototype = {
        _crs: sGis.CRS.webMercator,
        _animate: true,
        _position: new sGis.Point(55.755831, 37.617673).projectTo(sGis.CRS.webMercator),
        _resolution: 611.4962262812505 / 2,
        _wrapper: null,
        _autoUpdateSize: true,

        /**
         * Sets the size of map equal to size of its wrapper
         */
        updateSize: function() {
            var resolution = this.resolution,
                bbox = this.bbox,
                width = this._parent.clientWidth,
                height = this._parent.clientHeight;

            if (!width || ! height) return;

            this._wrapper.style.height = this._layerWrapper.style.height = height + 'px';
            this._wrapper.style.width = this._layerWrapper.style.width = width + 'px';

            if (bbox) {
                var p1 = new sGis.Point(bbox.p[0].x, bbox.p[1].y - this.height * resolution, this.crs),
                    p2 = new sGis.Point(bbox.p[0].x + this.width * resolution, bbox.p[1].y, this.crs);
                this.__setBbox(p1, p2);
                this.forceUpdate();
            }
        },

        /**
         * Sets the bounding box (extent) of the map to the rectangle, limited by start and end points
         * @param {sGis.Point} startPoint
         * @param {sGis.Point} endPoint
         */
        __setBbox: function(startPoint, endPoint) {
            this._bbox = new sGis.Bbox(startPoint, endPoint);
            this.fire('bboxChange', {map: this});
        },

        /**
         * Adds a layer to the map
         * @param {sGis.Layer} layer
         */
        addLayer: function(layer) {
            this._layerGroup.addLayer(layer);
            this.fire('layerAdd', {layer: layer});
        },

        /**
         * Removes the layer from the map
         * @param {sGis.Layer} layer
         */
        removeLayer: function(layer) {
            this._layerGroup.removeLayer(layer);
            this.fire('layerRemove', {layer: layer});
        },

        /**
         * Moves the map bounding box by the given number of pixels
         * @param {int} dx - Offset along X axis in pixels, positive direction is right
         * @param {int} dy - Offset along Y axis in pisels, positive direction is down
         */
        move: function(dx, dy) {
            for (var i in this._bbox.p) {
                this._bbox.p[i].x += dx;
                this._bbox.p[i].y += dy;
            }
            adjustCoordinates();
            this.fire('bboxChange', {map: this});
        },

        /**
         * Changes the scle of map by scalingK
         * @param {float} scalingK - Koefficient of scaling (Ex. 5 -> 5 times zoom in)
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         */
        changeScale: function(scalingK, basePoint) {
            var resolution = this.resolution;
            this.setResolution(resolution * scalingK, basePoint);
        },

        /**
         * Changes the scle of map by scalingK with animation
         * @param {float} scalingK - Koefficient of scaling (Ex. 5 -> 5 times zoom in)
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         */
        animateChangeScale: function(scalingK, basePoint) {
            if (this._animationTargetResolution) {
                var resolution = this._animationTargetResolution;
            } else {
                resolution = this.resolution;
            }
            this.animateSetResolution(resolution * scalingK, basePoint);
        },

        zoom: function(k, basePoint) {
            var tileScheme = this.tileScheme;

            if (this._animationTarget) {
                var currResolution = this._animationTarget.width / this.width;
            } else {
                currResolution = this.resolution;
            }

            var resolution;
            if (tileScheme) {
                for (var i in tileScheme.matrix) {
                    var ratio = currResolution / tileScheme.matrix[i].resolution;
                    if (ratio > 0.9) {
                        var newLevel = parseInt(i) + k;
                        while (!tileScheme.matrix[newLevel]) {
                            newLevel += k > 0 ? -1 : 1;
                        }
                        resolution = tileScheme.matrix[newLevel].resolution;
                        break;
                    }
                }
                if (!resolution) resolution = tileScheme.matrix[i] && tileScheme.matrix[i].resolution || currResolution;
            } else {
                resolution = currResolution * Math.pow(2, -k);
            }

            this.animateSetResolution(resolution, basePoint);
        },

        adjustResolution: function() {
            var resolution = this.resolution;
            var newResolution = this.getAdjustedResolution(resolution);
            var ratio = newResolution / resolution;
            if (ratio > 1.1 || ratio < 0.9) {
                this.animateSetResolution(newResolution);
                return true;
            } else if (ratio > 1.0001 || ratio < 0.9999) {
                this.setResolution(newResolution);
                return false;
            }
        },

        getAdjustedResolution: function(resolution) {
            var tileScheme = this.tileScheme;
            if (tileScheme) {
                var minDifference = Infinity;
                var index;
                for (var i in tileScheme.matrix) {
                    var difference = Math.abs(resolution - tileScheme.matrix[i].resolution);
                    if (difference < minDifference) {
                        minDifference = difference;
                        index = i;
                    }
                }
                return tileScheme.matrix[index].resolution;
            } else {
                return resolution;
            }
        },

        /**
         * Sets new resolution to the map with animation
         * @param {float} resolution
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         * @returns {undefined}
         */
        animateSetResolution: function(resolution, basePoint) {
            var bbox = getScaledBbox(this, resolution, basePoint);
            this._animateTo(bbox);
            this.fire('animationStart', {targetBbox: bbox});
            this._resolutionChanged = true;
        },

        _animationTime: 300,

        _animateTo: function(targetBbox) {
            this.stopAnimation();

            var originalBbox = this.bbox;
            var startTime = Date.now();
            this._painter.prohibitUpdate();
            this._animationStopped = false;
            this._animationTarget = targetBbox;

            var self = this;
            this._animationTimer = setInterval(function() {
                var time = Date.now() - startTime;
                if (time >= self._animationTime || self._animationStopped) {
                    self._bbox = targetBbox;
                    self.stopAnimation();
                    self.fire('animationEnd');
                } else {
                    var x1 = self._easeFunction(time, originalBbox.p[0].x, targetBbox.p[0].x - originalBbox.p[0].x, self._animationTime);
                    var y1 = self._easeFunction(time, originalBbox.p[0].y, targetBbox.p[0].y - originalBbox.p[0].y, self._animationTime);
                    var x2 = self._easeFunction(time, originalBbox.p[1].x, targetBbox.p[1].x - originalBbox.p[1].x, self._animationTime);
                    var y2 = self._easeFunction(time, originalBbox.p[1].y, targetBbox.p[1].y - originalBbox.p[1].y, self._animationTime);
                    var bbox = new sGis.Bbox(new sGis.Point(x1, y1, self.crs), new sGis.Point(x2, y2, self.crs));

                    self._bbox = bbox;
                }
                self.fire('bboxChange');
            }, 1000 / 60);
        },

        stopAnimation: function() {
            this._animationStopped = true;
            this._animationTarget = null;
            this._painter.allowUpdate();
            clearInterval(this._animationTimer);
        },

        _easeFunction: function(t, b, c, d) {
            return b + c * t / d;
        },

        /**
         * Sets new resolution to the map
         * @param {float} resolution
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         */
        setResolution: function(resolution, basePoint) {
            var bbox = getScaledBbox(this, resolution, basePoint);
            this.__setBbox(bbox.p[0], bbox.p[1]);
            this._resolutionChanged = true;
        },

        /**
         * Returns the pixel offset of the point from the left top corner of the map
         * @param {type} point
         * @returns {object} - {x: X offset, y: Y offset}
         */
        getPxPosition: function(point) {
            var p = point instanceof sGis.Point ? point.projectTo(this.crs) : {x: point[0], y: point[1]},
                resolution = this.resolution,
                bbox = this.bbox;
            var pxPosition = {
                x: (p.x - bbox.p[0].x) / resolution,
                y: (bbox.p[1].y - p.y) / resolution
            };
            return pxPosition;
        },

        /**
         * Returns a new point, that corresponds to the specified position on the screen
         * @param {int} x - X offset from the map left side
         * @param {int} y - Y offset from the map top side
         * @returns {sGis.Point}
         */
        getPointFromPxPosition: function(x, y) {
            var resolution = this.resolution,
                bbox = this.bbox;
            return new sGis.Point(
                bbox.p[0].x + x * resolution,
                bbox.p[1].y - y * resolution,
                this.crs
            );
        },

        /**
         * If map is in process of animation, the 'animationEnd' event is not fired
         */
        cancelAnimation: function() {
            this._cancelAnimation = true;
            //this._painter.cancelAnimation();
        },

        update: function() {

        },

        forceUpdate: function() {
            this.painter.forceUpdate();
        },

        /**
         * Updates the specified layer
         * @param {sGis.Layer} layer
         */
        redrawLayer: function(layer) {
            if (this._painter) this._painter.redrawLayer(layer);
        },

        /**
         * Changes order of layers, moves layer to the specified index
         * @param layer
         * @param index
         */
        moveLayerToIndex: function(layer, index) {
            var add = !this._layerGroup.contains(layer);
            this._layerGroup.insertLayer(layer, index);
            if (add) {
                this.fire('layerAdd', {layer: layer});
            }
            this.fire('layerOrderChange', {layer: layer});
        },

        moveLayerToTop: function(layer) {
            this.moveLayerToIndex(layer, Number.MAX_VALUE);
        },

        /**
         * Returns the order of the layer on the map
         * @param {type} layer
         * @returns {int}
         */
        getLayerIndex: function(layer) {
            return this._layerGroup.indexOf(layer);
        },

        _defaultHandlers: {
            bboxChange: function(mapEvent) {
                var map = this;
                var CHANGE_END_DELAY = 300;
                if (map._changeTimer) clearTimeout(map._changeTimer);
                map._changeTimer = setTimeout((function(map) {return function() {
                    map.fire('bboxChangeEnd', {map: map});
                    map._changeTimer = null;
                };})(map), CHANGE_END_DELAY);
            },

            bboxChangeEnd: function(mapEvent) {

            },

            animationStart: function(sGisEvent) {

            },

            animationEnd: function(mapEvent) {

            },

            click: function(sGisEvent) {

            },

            dblclick: function(sGisEvent) {
                this.zoom(2, sGisEvent.point);
            },

            mousemove: function(sGisEvent) {

            },

            mouseout: function(sGisEvent) {

            },

            layerAdd: function(sGisEvent) {
                this.update();
            },

            layerRemove: function(sGisEvent) {

            },

            layerOrderChange: function(sGisEvent) {
                this.update();
            },

            dragStart: function(sGisEvent) {
                this._draggingObject = sGisEvent.draggingObject || this;
            },

            drag: function(sGisEvent) {
                this.move(sGisEvent.offset.x, sGisEvent.offset.y);
            },

            dragEnd: function(sGisEvent) {
                this._draggingObject = null;
            },

            contextmenu: function(sGisEvent) {

            }
        }
    };

    Object.defineProperties(sGis.Map.prototype, {
        bbox: {
            get: function() {
                if (this._wrapper) {
                    if (!this._bbox) {
                        return undefined;
                    } else if (this._bbox.p[0].crs !== this.crs && (!this._bbox.p[0].crs.from || !this.crs.from)) {
                        this._bbox = new sGis.Bbox(new sGis.Point(0 - this.width / 2, 0 - this.height / 2, this.crs), new sGis.Point(this.width / 2, this.height / 2, this.crs));
                        return this._bbox;
                    } else {
                        return this._bbox.projectTo(this.crs);
                    }
                } else {
                    return undefined;
                }
            }
        },

        layers: {
            get: function() {
                if (this._layerGroup) {
                    return this._layerGroup.layers;
                } else {
                    return [];
                }
            },

            set: function(layers) {
                var layers = this.layers;
                for (var i = 0; i < layers.length; i++) {
                    this.removeLayer(layers[i]);
                }
                for (i = 0; i < layers.length; i++) {
                    this.addLayer(layers[i]);
                }
            }
        },

        crs: {
            get: function() {
                return this._crs;
            },
            set: function(crs) {
                if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');

                var currentCrs = this._crs;
                this._crs = crs;

                if (currentCrs !== crs && (!currentCrs.to || !crs.to)) {
                    this.position = new sGis.Point(0, 0, crs);
                } else {
                    this.position = this.position.projectTo(crs);
                }
            }
        },

        layerWrapper: {
            get: function() {
                return this._layerWrapper;
            }
        },

        resolution: {
            get: function() {
                if (this.bbox) {
                    var bbox = this.bbox;
                    return (bbox.p[1].x - bbox.p[0].x) / this.width || this._resolution;
                } else {
                    return this._resolution;
                }
            },

            set: function(resolution) {
                if (!utils.isNumber(resolution) || resolution <= 0) utils.error('Positive number is expected but got ' + resolution + ' instead');

                if (this.wrapper) {
                    this.setResolution(resolution);
                } else {
                    this._resolution = resolution;
                }
            }
        },

        height: {
            get: function() {
                return this._wrapper ? this._wrapper.clientHeight || this._wrapper.offsetWidth : undefined;
            }
        },

        width: {
            get: function() {
                return this._wrapper ? this._wrapper.clientWidth || this._wrapper.offsetWidth : undefined;
            }
        },

        wrapper: {
            get: function() {
                return this._wrapper;
            },

            set: function(wrapperId) {
                if (!utils.isString(wrapperId) && wrapperId !== null) utils.error('String or null value expected but got ' + wrapperId + ' instead');
                if (this._wrapper) {
                    this._parent.removeChild(this._wrapper);
                }
                if (wrapperId !== null) {
                    setDOMstructure(wrapperId, this);
                    this.updateSize();

                    if (this._position) {
                        this.prohibitEvent('bboxChange');
                        this.position = this._position;
                        this.allowEvent('bboxChange');
                        delete this._position;
                        delete this._resolution;
                    }

                    this._painter = new utils.Painter(this);
                    setEventHandlers(this);

                    this.fire('wrapperSet');
                } else {
                    this._wrapper = null;
                    delete this._layerWrapper;
                    delete this._parent;
                    delete this._painter;
                }
            }
        },

        position: {
            get: function() {
                if (this.bbox) {
                    var bbox = this.bbox;
                    return new sGis.Point(
                        (bbox.p[1].x + bbox.p[0].x) / 2,
                        (bbox.p[1].y + bbox.p[0].y) / 2,
                        this.crs
                    );
                } else {
                    return this._position.projectTo(this.crs);
                }
            },

            set: function(position) {
                if (this.wrapper) {
                    var height = this.height,
                        width = this.width,
                        crs = this.crs,
                        center = position.projectTo(crs),
                        startPoint = new sGis.Point(center.x - width / 2 * this.resolution, center.y - height / 2 * this.resolution, crs),
                        endPoint = new sGis.Point(center.x + width / 2 * this.resolution, center.y + height / 2 * this.resolution, crs);
                    this.__setBbox(startPoint, endPoint);
                } else {
                    this._position = position.projectTo(this.crs);
                    this._resolution = this.resolution;
                }
            }
        },

        tileScheme: {
            get: function() {
                var layers = this.layers;
                var tileScheme = null;
                for (var i = 0, len = layers.length; i < len; i++) {
                    if (layers[i] instanceof sGis.TileLayer) {
                        tileScheme = layers[i].tileScheme;
                        break;
                    }
                }
                return tileScheme;
            }
        },

        maxResolution: {
            get: function() {
                var tileScheme = this.tileScheme;
                if (tileScheme) {
                    return tileScheme.matrix[0].resolution;
                }
            }
        },

        minResolution: {
            get: function() {
                var tileScheme = this.tileScheme;
                if (tileScheme) {
                    var minResolution = Infinity;
                    for (var i in tileScheme.matrix) {
                        minResolution = Math.min(minResolution, tileScheme.matrix[i].resolution);
                    }

                    return minResolution;
                }
            }
        },

        painter: {
            get: function() {
                return this._painter;
            }
        }
    });

    utils.mixin(sGis.Map.prototype, sGis.IEventHandler.prototype);

    function initializeCrs(map, crs) {
        if (!(crs instanceof sGis.Crs)) utils.error('sGis.Crs instance is expected but got ' + crs + ' instead');
        map._crs = crs;
        if (!crs.from) {
            map._position = new sGis.Point(0, 0, crs);
        } else {
            map._position = map._position.projectTo(crs);
        }
    }

    function setDOMstructure(parentId, map) {
        var parent = document.getElementById(parentId);
        if (!parent) utils.error('The element with ID "' + parentId + '" could not be found. Cannot create a Map object');

        var wrapper = document.createElement('div');
        wrapper.className = 'sGis-mapWrapper';
        wrapper.id = 'mapWrapper';
        wrapper.map = map;
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        parent.appendChild(wrapper);
        parent.map = map;

        var layerWrapper = document.createElement('div');
        layerWrapper.className = 'sGis-layerWrapper';
        layerWrapper.style.position = 'absolute';
        wrapper.appendChild(layerWrapper);

        map._parent = parent;
        map._wrapper = wrapper;
        map._eventWrapper = parent;
        map._layerWrapper = layerWrapper;
    }

    function getScaledBbox(map, resolution, basePoint) {
        var crs = map.crs;

        basePoint = basePoint ? basePoint.projectTo(crs) : map.position;

        var currResolution = map.resolution,
            scalingK = resolution / currResolution,
            bbox = map.bbox,
            startPoint = new sGis.Point(
                basePoint.x - (basePoint.x - bbox.p[0].x) * scalingK,
                basePoint.y - (basePoint.y - bbox.p[0].y) * scalingK,
                crs
            ),
            endPoint = new sGis.Point(
                basePoint.x + (bbox.p[1].x - basePoint.x) * scalingK,
                basePoint.y + (bbox.p[1].y - basePoint.y) * scalingK,
                crs
            );
        return new sGis.Bbox(startPoint, endPoint, crs);
    }

    function setEventHandlers(map) {
        Event.add(map._eventWrapper, 'mousedown', onmousedown);
        Event.add(map._eventWrapper, 'wheel', onwheel);
        Event.add(map._eventWrapper, 'touchstart', ontouchstart);
        Event.add(map._eventWrapper, 'touchmove', ontouchmove);
        Event.add(map._eventWrapper, 'touchend', ontouchend);
        Event.add(map._eventWrapper, 'click', onclick);
        Event.add(map._eventWrapper, 'dblclick', ondblclick);
        Event.add(map._eventWrapper, 'mousemove', onmousemove);
        Event.add(map._eventWrapper, 'mouseout', onmouseout);
        Event.add(map._eventWrapper, 'contextmenu', oncontextmenu);
        Event.add(document, 'keydown', function(event) { map.fire('keydown', { browserEvent: event }); });
        Event.add(document, 'keypress', function(event) {
            map.fire('keypress', {browserEvent: event});
        });
        Event.add(document, 'keyup', function(event) {map.fire('keyup', {browserEvent: event});});
        Event.add(window, 'resize', function() {
            if (map._autoUpdateSize && (map._parent.clientHight !== map._wrapper.clientHeight || map._parent.clientWidth !== map._wrapper.clientWidth) ) {
                map.updateSize();
            }
        });

    }

    function onmouseout(event) {
        var map = event.currentTarget.map,
            offset = getMouseOffset(event.currentTarget, event),
            point = map.getPointFromPxPosition(offset.x, offset.y);

        event.currentTarget.map.fire('mouseout', {position: offset, point: point});
    }

    function onmousemove(event) {
        var mouseOffset = getMouseOffset(event.currentTarget, event);
        var map = event.currentTarget.map;
        var point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y);
        var resolution = map.resolution;
        var position = {x: point.x / resolution, y: -point.y / resolution};
        event.currentTarget.map.fire('mousemove', {map: map, mouseOffset: mouseOffset, point: point, position: position, ctrlKey: event.ctrlKey});
    }

    var touchHandler = {scaleChanged: false};

    function ontouchstart(event) {
        if (!event.currentTarget.dragPrevPosition) event.currentTarget.dragPrevPosition = {};
        for (var i in event.changedTouches) {
            var touch = event.changedTouches[i];
            event.currentTarget.dragPrevPosition[touch.identifier] = {x: touch.pageX, y: touch.pageY};
            event.currentTarget._lastDrag = {x: 0, y: 0};
        }
    }

    function ontouchmove(event) {
        var map = event.currentTarget.map;
        if (event.touches.length === 1 && event.currentTarget._lastDrag) {
            var touch = event.targetTouches[0],
                dxPx = event.currentTarget.dragPrevPosition[touch.identifier].x - touch.pageX,
                dyPx = event.currentTarget.dragPrevPosition[touch.identifier].y - touch.pageY,
                resolution = map.resolution,
                touchOffset = getMouseOffset(event.currentTarget, touch),
                point = map.getPointFromPxPosition(touchOffset.x, touchOffset.y),
                position = {x: point.x / resolution, y: 0 - point.y / resolution};

            if (event.currentTarget._lastDrag.x === 0 && event.currentTarget._lastDrag.y === 0) {
                map.fire('dragStart', {point: point, position: position, offset: {xPx: dxPx, yPx: dyPx, x: event.currentTarget._lastDrag.x, y: event.currentTarget._lastDrag.y}});
            }

            map._lastDrag = {x: dxPx * resolution, y: 0 - dyPx * resolution};
            map._draggingObject.fire('drag', {point: point, position: position, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}});

            event.currentTarget.dragPrevPosition[touch.identifier].x = touch.pageX;
            event.currentTarget.dragPrevPosition[touch.identifier].y = touch.pageY;
        } else if (event.touches.length === 2) {
            map._painter.prohibitUpdate();
            map._lastDrag = null;
            touchHandler.scaleChanged = true;
            var touch1 = event.touches[0],
                touch2 = event.touches[1];

            touch1.prevPosition = event.currentTarget.dragPrevPosition[touch1.identifier];
            touch2.prevPosition = event.currentTarget.dragPrevPosition[touch2.identifier];

            var x11 = touch1.prevPosition.x,
                x12 = touch1.pageX,
                x21 = touch2.prevPosition.x,
                x22 = touch2.pageX,
                baseX = (x11 - x12 - x21 + x22) === 0 ? (x11 + x21) / 2 : (x11*x22 - x12*x21) / (x11 - x12 - x21 + x22),
                y11 = touch1.prevPosition.y,
                y12 = touch1.pageY,
                y21 = touch2.prevPosition.y,
                y22 = touch2.pageY,
                baseY = (y11 - y12 - y21 + y22) === 0 ? (y11 + y21) / 2 : (y11*y22 - y12*y21) / (y11 - y12 - y21 + y22),
                len1 = Math.sqrt(Math.pow(x11 - x21, 2) + Math.pow(y11 - y21, 2)),
                len2 = Math.sqrt(Math.pow(x12 - x22, 2) + Math.pow(y12 - y22, 2));

            map.changeScale(len1/len2, map.getPointFromPxPosition(baseX, baseY));

            event.currentTarget.dragPrevPosition[touch1.identifier].x = touch1.pageX;
            event.currentTarget.dragPrevPosition[touch1.identifier].y = touch1.pageY;
            event.currentTarget.dragPrevPosition[touch2.identifier].x = touch2.pageX;
            event.currentTarget.dragPrevPosition[touch2.identifier].y = touch2.pageY;
        }
        event.preventDefault();
    }

    function ontouchend(event) {
        for (var i in event.changedTouches) {
            delete event.currentTarget.dragPrevPosition[event.changedTouches[i].identifier];
        }

        event.currentTarget._lastDrag = null;

        var map = event.currentTarget.map;
        if (touchHandler.scaleChanged) {
            map.adjustResolution();
            touchHandler.scaleChanged = false;
        } else {
            map.fire('dragEnd');
        }
    }

    function onclick(event) {
        if (mouseHandler.clickCatcher && !isFormElement(event.target)) {
            var map = event.currentTarget.map,
                mouseOffset = getMouseOffset(event.currentTarget, event),
                point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
                position = {x: point.x / map.resolution, y: - point.y / map.resolution};
            map.fire('click', {map: map, mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position});
        }
    }

    function oncontextmenu(event) {
        var map = event.currentTarget.map,
            mouseOffset = getMouseOffset(event.currentTarget, event),
            point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
            position = { x: point.x / map.resolution, y: -point.y / map.resolution };
        map.fire('contextmenu', { mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position });
        //event.preventDefault();
    }

    function ondblclick(event) {
        if (!isFormElement(event.target)) {
            mouseHandler.clickCatcher = null;
            var map = event.currentTarget.map,
                mouseOffset = getMouseOffset(event.currentTarget, event),
                point = map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y),
                position = {x: point.x / map.resolution, y: - point.y / map.resolution};
            map.fire('dblclick', {map: map, mouseOffset: mouseOffset, ctrlKey: event.ctrlKey, point: point, position: position});
        }
    }

    var wheelTimer = 0;
    var minDelay = 50;
    function onwheel(event) {
        var time = Date.now();
        if (time - wheelTimer > minDelay) {
            wheelTimer = time;
            var map = event.currentTarget.map,
                wheelDirection = getWheelDirection(event),
                mouseOffset = getMouseOffset(event.currentTarget, event);

            map.zoom(wheelDirection, map.getPointFromPxPosition(mouseOffset.x, mouseOffset.y));
        }
        event.preventDefault();
        return false;
    }

    var mouseHandler = {
        dragPosition: null,
        activeObject: null,
        clickCatcher: null
    };

    function onmousedown(event) {
        if (!isFormElement(event.target)) {
            mouseHandler.clickCatcher = true;
            if (event.which === 1) {
                mouseHandler.dragPosition = getMouseOffset(event.currentTarget, event);
                mouseHandler.activeObject = event.currentTarget.map;

                Event.add(document, 'mousemove', onDocumentMousemove);
                Event.add(document, 'mouseup', onDocumentMouseup);

                document.ondragstart = function() {return false;};
                document.body.onselectstart = function() {return false;};
            }
            return false;
        }
    }

    function onDocumentMousemove(event) {
        var map = mouseHandler.activeObject,
            mousePosition = getMouseOffset(map._wrapper, event),
            dxPx = mouseHandler.dragPosition.x - mousePosition.x,
            dyPx = mouseHandler.dragPosition.y - mousePosition.y,
            resolution = map.resolution,
            point = map.getPointFromPxPosition(mousePosition.x, mousePosition.y),
            position = {x: point.x / resolution, y: - point.y / resolution};

        if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2 || !mouseHandler.clickCatcher) {
            map._lastDrag = {x: dxPx * resolution, y: 0 - dyPx * resolution};

            if (mouseHandler.clickCatcher) {
                mouseHandler.clickCatcher = null;
                map.fire('dragStart', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}, browserEvent: event});
            }

//        map.move(map._lastDrag.x, map._lastDrag.y);

            mouseHandler.dragPosition = mousePosition;
            map._draggingObject.fire('drag', {map: map, mouseOffset: mousePosition, position: position, point: point, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}, browserEvent: event});
        }
    }

    function onDocumentMouseup(event) {
        var map = mouseHandler.activeObject;
        Event.remove(document, 'mousemove', onDocumentMousemove);
        Event.remove(document, 'mouseup', onDocumentMouseup);
        document.ondragstart = null;
        document.body.onselectstart = null;

        if (mouseHandler.activeObject._draggingObject) mouseHandler.activeObject._draggingObject.fire('dragEnd', {browserEvent: event});

        map._draggingObject = null;
        map._lastDrag = null;

        mouseHandler.activeObject._draggingObject = null;
        mouseHandler.activeObject = null;
    }

    function adjustCoordinates(map) {

    }

    function isFormElement(e) {
        var formElements = ['BUTTON', 'INPUT', 'LABEL', 'OPTION', 'SELECT', 'TEXTAREA'];
        for (var i in formElements) {
            if (e.tagName === formElements[i]) return true;
        }
        return false;
    }

})();