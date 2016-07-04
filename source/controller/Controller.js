sGis.module('spatialProcessor.Controller', [
    'utils',
    'spatialProcessor.utils',
    'feature.Point',
    'feature.Polyline',
    'feature.Polygon',
    'spatialProcessor.parseXML',
    'utils.proto',
    'IEventHandler',
    'symbol.point.Point',
    'symbol.polyline.Simple',
    'symbol.polygon.Simple'
], function(utils, spUtils, Point, Polyline, Polygon, parseXML, proto, IEventHandler, pointSymbols, polylineSymbols, polygonSymbols) {
    'use strict';

    var Controller = function(extention) {
        for (var key in extention) {
            this[key] = extention[key];
        }
    };

    Controller.prototype = {
        _display: true,

        show: function() {
            if (this._layer) {
                this._layer.display = true;
            }
            this._display = true;
        },

        hide: function() {
            if (this._layer) {
                this._layer.display = false;
            }
            this._display = false;
        },

        __initialize: function(spatialProcessor, properties, callback) {
            if (!this._operationQueue) this._operationQueue = [];

            var sessionId = spatialProcessor.sessionId;
            if (sessionId) {
                this._spatialProcessor = spatialProcessor;
                this._spatialProcessorUrl = spatialProcessor.url;
                this._url = this._spatialProcessorUrl + 'ControllerService/';
                this._sessionId = sessionId;

                this.__connect(properties, callback);
            } else {
                var self = this;
                spatialProcessor.addListener('sessionInitialized', function() {self.__initialize(spatialProcessor, properties, callback);});
            }
        },

        __connect: function(properties, callback) {
            var request = '';
            if (properties) {
                for (var param in properties) {
                    request += '&' + param + '=' + properties[param];
                }
            }
            request = 'create=' + this._type + request;

            var self = this;

            sGis.utils.ajax({
                url: this._url + '?_sb=' + this._spatialProcessor._sessionId + '&ts=' + new Date().getTime(),
                type: 'POST',
                data: request,
                success: function(data, textStatus) {
                    var response = JSON.parse(data);
                    self._id = response.ServiceId;
                    self._mapServiceId = response.MapServiceId;
                    self._storageId = response.StorageId;


                    if (callback) callback.call(self);
                    for (var i in self._operationQueue) {
                        self.__operation(self._operationQueue[i]);
                    }
                },
                error: function() {
                    sGis.utils.message('Could not create controller');
                }
            });
        },

        remove: function() {
            sGis.utils.ajax({
                url: this._url + '?_sb=' + this._sessionId + '&delete=' + this._id
            });
        },

        __operation: function(f) {
            var self = this;
            if (this._id) {
                var parameters = f.call(this);

                if (this._spatialProcessor.synchronized) {
                    requestOperation();
                } else {
                    this._spatialProcessor.once('synchronize', requestOperation);
                }
            } else {
                this._operationQueue.push(f);
            }

            function requestOperation() {
                self._spatialProcessor.removeListener('.' + self.id);
                sGis.utils.ajax({
                    url: self._url + self._id + '/' + parameters.operation + '?' + (parameters.uriParameters || '') + '_sb=' + self._spatialProcessor.sessionId + '&timeout=20000&ts=' + new Date().getTime(),
                    type: parameters.dataParameters ? 'POST' : 'GET',
                    data: parameters.dataParameters,
                    success: function(data) {
                        var response = parseOperationResponse(data);

                        if (response.status === 'success') {
                            if (parameters.requested) {
                                parameters.requested(response);
                            }
                            if (parameters.success || parameters.error) {
                                self._spatialProcessor.registerOperation(response.operationId, function(result) {
                                    if (result.operation && result.operation.status === 'Success') {
                                        if (parameters.success) parameters.success(result);
                                    } else {
                                        if (parameters.error) parameters.error(result);
                                    }
                                });
                            }

                        } else if (response.status === 'error' && parameters.error) {
                            parameters.error(data);
                        }

                        if (parameters.callback) parameters.callback(data);
                    },

                    error: function(data) {
                        if (parameters.error) parameters.error(data);
                    }
                });
            }
        },

        query: function(properties) {
            this.__operation(function() {
                var data;
                var self = this;
                if (properties.geometry) {
                    data = JSON.stringify({rings: properties.geometry.coordinates, spatialReference: properties.geometry.crs.getWkidString()});
                } else if (properties.storageId) {
                    data = JSON.stringify(sGis.utils.isArray(properties.storageId) ? properties.storageId : [properties.storageId]);
                } else {
                    sGis.utils.error('Lacking the query data');
                }
                data = encodeURIComponent(data);

                if (properties.layerStorageId) data += '&id=' + encodeURIComponent(properties.layerStorageId);

                return {
                    operation: 'query',
                    dataParameters: 'data=' + data + '&geometryVersion=2',
                    requested: properties.requested,
                    error: properties.error,
                    success: !properties.success ? undefined : function(response) {
                        properties.success(createFeatures(response, properties.crs || properties.geometry && properties.geometry.crs || self._map && self._map.crs));
                    }
                };
            });
        },

        clear: function(properties) {
            properties = properties || {};
            this.__operation(function() {
                return {
                    operation: 'clear',
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                }
            });
        },

        save: function(properties) {
            if (!properties.added && !properties.updated && !properties.deleted) sGis.utils.error('Edit description must contain at least one feature');

            var edit = {added: properties.added, updated: properties.updated, deleted: properties.deleted},
                xmlString = encodeURIComponent('<?xml version="1.0" encoding="utf-8"?>' + sGis.spatialProcessor.serializeGeometryEdit(edit, false, properties.ignoreSymbol));

            if (properties.layerStorageId) xmlString += '&id=' + encodeURIComponent(properties.layerStorageId);
            this.__operation(function() {
                return {
                    operation: 'edit',
                    dataParameters: 'action=edit&edit=' + xmlString,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        createObject: function(properties) {
            var geomDescription = {spatialReference: properties.object.crs.getWkidString()};
            if (properties.object instanceof sGis.feature.Point) {
                geomDescription.x = properties.object.x;
                geomDescription.y = properties.object.y;
            } else if (properties.object instanceof sGis.feature.Polygon) {
                geomDescription.rings = properties.object.coordinates;
            } else {
                geomDescription.paths = properties.object.coordinates;
            }

            var geometryString = encodeURIComponent(JSON.stringify(geomDescription)),
                self = this;

            if (properties.layerStorageId) geometryString += '&StorageId=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

            self.__operation(function() {
                return {
                    operation: 'createVisualObject',
                    dataParameters: 'geometry=' + geometryString + '&geometryVersion=2&generatorFile=' + encodeURIComponent(properties.templatePath),
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.deserializeResponse ? properties.success : function(response) { //TODO: this option must be eliminated in the new release of the library, left for compatibility
                        if (properties.success) {
                            properties.success(createFeatures(response, properties.crs || properties.object && properties.object.crs || self._map && self._map.crs));
                        }
                    }
                };
            });
        },

        autoComplete: function(properties) {
            var coordinates = properties.line.coordinates;
            var crs = properties.line.crs;
            var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids))// + '&geometryVersion=2';

            if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

            this.__operation(function() {
                return {
                    operation: 'autoComplete',
                    dataParameters: dataParameters,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });
        },

        reshape: function(properties) {
            var coordinates = properties.line.coordinates;
            var crs = properties.line.crs;
            var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids)) + '&geometryVersion=2';

            if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

            this.__operation(function() {
                return {
                    operation: 'reshape',
                    dataParameters: dataParameters,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });

        },

        cut: function(properties) {
            var coordinates = properties.line.coordinates;
            var crs = properties.line.crs;
            var dataParameters = 'a=' + encodeURIComponent(JSON.stringify([{paths: coordinates, spatialReference: crs.getWkidString()}])) + '&b=i' + encodeURIComponent(JSON.stringify(properties.ids)) + '&geometryVersion=2';

            if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));

            this.__operation(function() {
                return {
                    operation: 'cut',
                    dataParameters: dataParameters,
                    requested: properties.requested,
                    error: properties.error,
                    success: properties.success
                };
            });

        },

        extent: function(properties) {
            var dataParameters = '';
            if (properties.layerStorageId) dataParameters += '&id=' + encodeURIComponent(properties.layerStorageId.replace(/-/g, ''));
            this.__operation(function() {
                return {
                    operation: 'extent',
                    dataParameters: dataParameters,
                    requested: properties.requested,
                    error: properties.error,
                    success: function(response) {
                        if (properties.success) properties.success(response.content);
                    }
                };
            });
        },

        projectGeometry: function(properties) {
            var features = properties.features;
            var geometry = [];
            for (var i = 0; i < features.length; i++) {
                geometry.push({rings: features[i].coordinates});
            }
            var geometryString = JSON.stringify(geometry);
            this.__operation(function() {
                return {
                    operation: 'gcProject',
                    dataParameters: 'sourceGeom=' + geometryString + '&sourceSr=' + properties.sourceSr + '&destSr=' + properties.destinationSr,
                    requested: properties.requested,
                    error: properties.error,
                    success: function(response) {
                        if (properties.success) properties.success(response.content);
                    }
                };
            });
        },

        _createFeatures: function(response, crs) {
            return createFeatures(response, crs);
        },

        _serializeGeometry: function(geometry) {
            var obj;
            var crs = geometry.crs || this._map && this._map.crs;
            if (geometry instanceof sGis.feature.Polygon) {
                obj = {rings: geometry.coordinates, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.feature.Point || geometry instanceof sGis.Point) {
                obj = {x: geometry.x, y: geometry.y, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.feature.Polyline) {
                obj = {paths: geometry.coordinates, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.Bbox) {
                obj = {xmin: geometry.xMin, xmax: geometry.xMax, ymin: geometry.yMin, ymax: geometry.yMax, spatialReference: crs && crs.getWkidString()};
            } else {
                sGis.utils.error('Unknown geometry type');
            }

            return encodeURIComponent(JSON.stringify(obj));
        }
    };

    sGis.utils.proto.setMethods(Controller.prototype, sGis.IEventHandler);

    function createFeatures(response, mapCrs) {
        var features = [];
        if (response.objects) {
            for (var i in response.objects) {
                var object = response.objects[i];

                if (object.geometry && object.visualDefinition) {
                    var geometry = object.geometry.data,
                        points = geometry.coordinates,
                        attributes = object.attributes,
                        color = object.visualDefinition.stroke ? parseColor(object.visualDefinition.stroke) : undefined,
                        fillColor = object.visualDefinition.fill ? object.visualDefinition.fill : undefined;

                    var serverCrs = object.geometry.data.crs || mapCrs.getWkidString();
                    var crs;

                    if (serverCrs.wkid === 102100 || serverCrs.wkid === 102113) {
                        crs = sGis.CRS.webMercator;
                    } else if (mapCrs.description === serverCrs) {
                        crs = mapCrs;
                    } else {
                        crs = new sGis.Crs({description: serverCrs});
                    }

                    if (geometry.type === 'polygon') {
                        var feature = new sGis.feature.Polygon(points, {id: i, attributes: attributes, crs: crs, color: color, width: object.visualDefinition.strokeThickness});
                        if (fillColor && fillColor.brush) {
                            feature.symbol = new sGis.symbol.polygon.BrushFill({
                                strokeWidth: parseFloat(object.visualDefinition.strokeThickness),
                                strokeColor: color,
                                fillBrush: fillColor.brush,
                                fillForeground: parseColor(fillColor.foreground),
                                fillBackground: parseColor(fillColor.background)
                            });
                        } else {
                            feature.style = {
                                strokeWidth: parseFloat(object.visualDefinition.strokeThickness),
                                strokeColor: color,
                                fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                            };
                        }
                    } else if (geometry.type === 'polyline') {
                        feature = new sGis.feature.Polyline(points, {id: i, attributes: attributes, crs: crs, color: color, width: parseFloat(object.visualDefinition.strokeThickness)});
                    } else if (geometry.type === 'point' || geometry.type === 'multipoint') {
                        var symbol;

                        if (object.visualDefinition.imageSrc) {
                            symbol = new sGis.symbol.point.Image({
                                source: object.visualDefinition.imageSrc,
                                size: parseFloat(object.visualDefinition.size),
                                anchorPoint: object.visualDefinition.anchorPoint
                            });
                        } else if (object.visualDefinition.shape === 'Circle') {
                            symbol = new sGis.symbol.point.Point({
                                size: parseFloat(object.visualDefinition.size),
                                fillColor: fillColor ? parseColor(fillColor) : 'transparent',
                                strokeColor: color,
                                strokeWidth: parseFloat(object.visualDefinition.strokeThickness)
                            });
                        } else {
                            symbol = new sGis.symbol.point.Square({
                                size: parseFloat(object.visualDefinition.size),
                                strokeWidth: parseFloat(object.visualDefinition.strokeThickness),
                                strokeColor: color,
                                fillColor: fillColor ? parseColor(fillColor) : 'transparent'
                            });
                        }

                        var featureClass = geometry.type === 'point' ? sGis.feature.Point : sGis.feature.MultiPoint;
                        if (geometry.type === 'multipoint') points = points[0];
                        feature = new featureClass(points, {id: i, attributes: attributes, crs: crs, symbol: symbol});
                    }
                }

                if (feature && response.attributesDefinitions && object.attributesDefinition) {
                    feature.displayField = response.attributesDefinitions[object.attributesDefinition]._display;
                    feature.visualDefinitionId = object.visualDefinitionId;
                    feature.generatorId = object.generatorId;
                    features.push(feature);
                }
            }
        }

        return features;
    }


    function parseOperationResponse(data) {
        if (data.charAt(0) === '{') {
            return parseOperationError(data);
        } else {
            return parseOperationSuccess(data);
        }
    }

    function parseOperationError(data) {
        try {
            var response = JSON.parse(data);
        } catch (e) {
            response = data;
        } finally {
            response.status = 'error';
            return response;
        }
    }

    function parseOperationSuccess(data) {
        var parser = new DOMParser(),
            xml = parser.parseFromString(data, 'text/xml'),
            attributes = xml.getElementsByTagName('Defered')[0].attributes,
            initDataNode = xml.getElementsByTagName('InitializationData')[0],
            response = {
                status: 'success'
            };

        for (var i in attributes) {
            if (attributes[i].nodeName === 'Id') {
                response.operationId = attributes[i].nodeValue;
            } else if (attributes[i].nodeName === 'Name') {
                response.operationName = attributes[i].nodeValue;
            }
        }

        if (initDataNode) {
            response.initializationData = JSON.parse(initDataNode.childNodes[0].nodeValue);
        }

        return response;
    }

    function parseColor(color) {
        var c = new sGis.utils.Color(color);
        return c.toString();
    }

    return Controller;
    
});
