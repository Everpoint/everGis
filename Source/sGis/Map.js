'use strict';

(function() {

    /**
     *
     * @mixes sGis.IEventHandler.prototype
     * @param {Object} options
     * @param {sGis.Crs} [options.crs=sGis.CRS.webMercator] - setting a crs that cannot be converted into WGS resets default values of position to [0, 0].
     * @param {sGis.Point|sGis.feature.Point|Array} [options.position] - the start position of the map. If the array is specified as [x, y], it should be in map crs. By default center it is of Moscow.
     * @param {Number} [options.resolution=305.74811] - initial resolution of the map
     * @param {HTMLElement} [options.wrapper] - DOM container that will contain the map. It should be block element. If not specified, the map will not be displayed.
     * @param {sGis.Layer} [options.layers[]] - the list of layers that will be initially on the map. The first in the list will be displayed at the bottom.
     * @constructor
     */

    sGis.Map = function(options) {
        utils.init(this, options);
        this._layerGroup = new sGis.LayerGroup(options ? options.layers : undefined);
    };

    sGis.Map.prototype = {
        _crs: sGis.CRS.webMercator,
        _position: new sGis.Point(55.755831, 37.617673).projectTo(sGis.CRS.webMercator),
        _resolution: 611.4962262812505 / 2,
        _wrapper: null,
        _autoUpdateSize: true,

        /**
         * @deprecated
         * Does nothing
         */
        updateSize: function() {

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
         * Moves the map position by the specified offset
         * @param {Number} dx - Offset along X axis in map coordinates, positive direction is right
         * @param {Number} dy - Offset along Y axis in map coordinates, positive direction is down
         */
        move: function(dx, dy) {
            if (!utils.isNumber(dx) || !utils.isNumber(dy)) utils.error('Number, Number is expected but got ' + dx + ', ' + dy + ' instead');
            var position = this.position;
            position.x += dx;
            position.y += dy;
            this.position = position;
        },

        /**
         * Changes the scale of map by scalingK
         * @param {Number} scalingK - Coefficient of scaling (Ex. 5 -> 5 times zoom in)
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         */
        changeScale: function(scalingK, basePoint) {
            var resolution = this.resolution;
            this.setResolution(resolution * scalingK, basePoint);
        },

        /**
         * Changes the scale of map by scalingK with animation
         * @param {float} scalingK - Coefficient of scaling (Ex. 5 -> 5 times zoom in)
         * @param {sGis.Point} basePoint - /optional/ Base point of zooming
         */
        animateChangeScale: function(scalingK, basePoint) {
            this.animateSetResolution(this.resolution * scalingK, basePoint);
        },

        zoom: function(k, basePoint) {
            var tileScheme = this.tileScheme;

            if (this._animationTarget) {
                var currResolution = this._animationTarget[1];
            } else {
                currResolution = this.resolution;
            }

            var resolution;
            if (tileScheme) {
                var levels = Object.keys(tileScheme.matrix);
                for (var i = 0; i < levels.length; i++) {
                    var ratio = currResolution / tileScheme.matrix[levels[i]].resolution;
                    if (ratio > 0.9) {
                        var newLevel = parseInt(i) + k;
                        while (!tileScheme.matrix[newLevel]) {
                            newLevel += k > 0 ? -1 : 1;
                        }
                        resolution = tileScheme.matrix[newLevel].resolution;
                        break;
                    }
                }
                if (!resolution) resolution = tileScheme.matrix[levels[i]] && tileScheme.matrix[levels[i]].resolution || currResolution;
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
                var levels = Object.keys(tileScheme.matrix);
                for (var i = 0; i < levels.length; i++) {
                    var difference = Math.abs(resolution - tileScheme.matrix[levels[i]].resolution);
                    if (difference < minDifference) {
                        minDifference = difference;
                        index = levels[i];
                    }
                }
                return tileScheme.matrix[index].resolution;
            } else {
                return resolution;
            }
        },

        /**
         * Sets new resolution to the map with animation
         * @param {Number} resolution
         * @param {sGis.Point} [basePoint] - Base point of zooming
         * @returns {undefined}
         */
        animateSetResolution: function(resolution, basePoint) {
            var adjustedResolution = this.getAdjustedResolution(resolution);
            var newPosition = this._getScaledPosition(adjustedResolution, basePoint);
            this._animateTo(newPosition, adjustedResolution);
            this.fire('animationStart');
        },

        _animationTime: 300,

        _animateTo: function(position, resolution) {
            this.stopAnimation();

            var originalPosition = this.position;
            var originalResolution = this.resolution;
            var dx = position.x - originalPosition.x;
            var dy = position.y - originalPosition.y;
            var dr = resolution - originalResolution;
            var startTime = Date.now();
            this._painter.prohibitUpdate();
            this._animationStopped = false;
            this._animationTarget = [position, resolution];

            var self = this;
            this._animationTimer = setInterval(function() {
                var time = Date.now() - startTime;
                if (time >= self._animationTime || self._animationStopped) {
                    self.setPosition(position, resolution);
                    self.stopAnimation();
                    self.fire('animationEnd');
                } else {
                    var x = self._easeFunction(time, originalPosition.x, dx, self._animationTime);
                    var y = self._easeFunction(time, originalPosition.y, dy, self._animationTime);
                    var r = self._easeFunction(time, originalResolution, dr, self._animationTime);
                    self.setPosition(new sGis.Point(x, y, self.crs), r);
                }
            }, 1000 / 60);
        },

        _getScaledPosition: function(newResolution, basePoint) {
            var position = this.position;
            basePoint = basePoint ? basePoint.projectTo(this.crs) : position;
            var resolution = this.resolution;
            var scalingK = newResolution / resolution;
            return new sGis.Point((position.x - basePoint.x) * scalingK + basePoint.x, (position.y - basePoint.y) * scalingK + basePoint.y, position.crs);
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

        setPosition: function(position, resolution) {
            this.prohibitEvent('bboxChange');
            this.position = position;
            if (resolution) this.resolution = resolution;
            this.allowEvent('bboxChange');
            this.fire('bboxChange');
        },

        /**
         * Sets new resolution to the map
         * @param {Number} resolution
         * @param {sGis.Point} [basePoint] - Base point of zooming
         */
        setResolution: function(resolution, basePoint) {
            this.setPosition(this.getAdjustedResolution(resolution), this._getScaledPosition(this.resolution, basePoint));
        },

        /**
         * Returns the pixel offset of the point from the left top corner of the map
         * @param {sGis.Point|Array} point
         * @returns {object} - {x: X offset, y: Y offset}
         */
        getPxPosition: function(point) {
            var p = point instanceof sGis.Point ? point.projectTo(this.crs) : {x: point[0], y: point[1]},
                resolution = this.resolution,
                bbox = this.bbox;

            return {
                x: (p.x - bbox.p[0].x) / resolution,
                y: (bbox.p[1].y - p.y) / resolution
            };
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
         * TODO: remove
         */
        cancelAnimation: function() {

        },

        /**
         * TODO: remove
         */
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
            bboxChange: function() {
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

            layerAdd: function() {
                this.update();
            },

            layerRemove: function(sGisEvent) {

            },

            layerOrderChange: function() {
                this.update();
            },

            dragStart: function(sGisEvent) {
                this._draggingObject = sGisEvent.draggingObject || this;
            },

            drag: function(sGisEvent) {
                this.move(sGisEvent.offset.x, sGisEvent.offset.y);
            },

            dragEnd: function() {
                this._draggingObject = null;
            },

            contextmenu: function(sGisEvent) {

            }
        },

        _autoupdateSize: function() {
            if (this._wrapper) {
                var width = this._wrapper.clientWidth || this._wrapper.offsetWidth;
                var height = this._wrapper.clientHeight || this._wrapper.offsetHeight;
                var changed = width !== this._width || height !== this._height;

                this._width = width;
                this._height = height;
                if (changed) {
                    this.fire('bboxChange');
                }

                utils.requestAnimationFrame(this._autoupdateSize.bind(this));
            } else {
                this._width = this._height = undefined;
            }
        }
    };

    Object.defineProperties(sGis.Map.prototype, {
        bbox: {
            get: function() {
                var resolution = this.resolution;
                var halfWidth = this.width / 2 * resolution;
                var halfHeight = this.height / 2 * resolution;
                var position = this.position;

                if (halfWidth && halfHeight) {
                    return new sGis.Bbox([position.x - halfWidth, position.y - halfHeight], [position.x + halfWidth, position.y + halfHeight], position.crs);
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

            set: function(array) {
                var layers = this.layers;
                for (var i = 0; i < layers.length; i++) {
                    this.removeLayer(layers[i]);
                }
                for (i = 0; i < array.length; i++) {
                    this.addLayer(array[i]);
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
                return this._resolution;
            },

            set: function(resolution) {
                if (!utils.isNumber(resolution) || resolution <= 0) utils.error('Positive number is expected but got ' + resolution + ' instead');
                this._resolution = resolution;
                this.fire('bboxChange');
            }
        },

        height: {
            get: function() {
                return this._height;
            }
        },

        width: {
            get: function() {
                return this._width;
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
                    this._autoupdateSize();

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
                return this._position.projectTo(this.crs);
            },

            set: function(position) {
                this._position = position.projectTo(this.crs);
                this.fire('bboxChange');
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
                    var levels = Object.keys(tileScheme.matrix);
                    for (var i = 0; i < levels.length; i++) {
                        minResolution = Math.min(minResolution, tileScheme.matrix[levels[i]].resolution);
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

    sGis.utils.proto.setMethods(sGis.Map.prototype, sGis.IEventHandler);

    function setDOMstructure(parentId, map) {
        var parent = document.getElementById(parentId);
        if (!parent) utils.error('The element with ID "' + parentId + '" could not be found. Cannot create a Map object');

        var wrapper = document.createElement('div');
        wrapper.className = 'sGis-mapWrapper';
        wrapper.id = 'mapWrapper';
        wrapper.map = map;
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        parent.appendChild(wrapper);
        parent.map = map; //todo: this should be deleted

        var layerWrapper = document.createElement('div');
        layerWrapper.className = 'sGis-layerWrapper';
        layerWrapper.style.position = 'absolute';
        layerWrapper.style.width = '100%';
        layerWrapper.style.height = '100%';
        wrapper.appendChild(layerWrapper);

        map._parent = parent;
        map._wrapper = wrapper;
        map._eventWrapper = parent; //todo: why have two names for one thing?
        map._layerWrapper = layerWrapper;
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
                var originalPoint = map.getPointFromPxPosition(mouseHandler.dragPosition.x, mouseHandler.dragPosition.y);
                var originalPosition = {x: originalPoint.x / resolution, y: - originalPoint.y / resolution};
                map.fire('dragStart', {map: map, mouseOffset: mousePosition, position: originalPosition, point: originalPoint, ctrlKey: event.ctrlKey, offset: {xPx: dxPx, yPx: dyPx, x: map._lastDrag.x, y: map._lastDrag.y}, browserEvent: event});
            }

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

    function isFormElement(e) {
        var formElements = ['BUTTON', 'INPUT', 'LABEL', 'OPTION', 'SELECT', 'TEXTAREA'];
        for (var i = 0; i < formElements.length; i++) {
            if (e.tagName === formElements[i]) return true;
        }
        return false;
    }

})();