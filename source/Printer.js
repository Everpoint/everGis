sGis.module('spatialProcessor.Printer', [
    'utils'
], function(utils) {
    'use strict';

    var defaults = {
        dpi: 96,
        paperSize: {
            width: 210,
            height: 297
        },
        margin: {
            left: 10,
            top: 10,
            right: 10,
            bottom: 10
        }
    };

    var Printer = function(map, connector) {
        this._serverConnector = connector;
        this._map = map;
    };

    Printer.prototype = {
        getTemplates: function(properties) {
            sGis.utils.ajax({
                url: this._serverConnector.url + 'export/templates/' + (this._serverConnector.sessionId ? '?_sb=' + this._serverConnector.sessionId : ''),
                cache: false,
                success: function(data) {
                    try {
                        var templates = sGis.utils.parseJSON(data);
                    } catch (e) {
                        if (properties.error) properties.error('Incorrect response: ' + data);
                    }

                    if (properties.success) properties.success(templates);
                },
                error: function(data) {
                    if (properties.error) properties.error('Server responded with error: ' + data);
                }
            });
        },

        getPreview: function(properties) {
            var successHandler = properties.success,
                self = this;
            properties.success = function() {
                var link = self._serverConnector.url + 'export/preview/?noHeader=true&f=binary' + self._serverConnector.sessionSuffix + '&ts=' + Date.now();
                if (successHandler) successHandler(link);
            };

            this.__store(properties);
        },

        getImage: function(properties) {
            var successHandler = properties.success,
                self = this;
            properties.success = function() {
                var link = self._serverConnector.url + 'export/print/?noHeader=true&f=' + (properties.useApi ? 'json' : 'binary') + self._serverConnector.sessionSuffix + '&ts=' + Date.now() + (properties.useApi ? '&asLink=true' : '');
                if (successHandler) {
                    if (properties.useApi) {
                        sGis.utils.ajax({url: link, success: function(id) {
                            successHandler(id);
                        }});
                    } else {
                        successHandler(link);
                    }
                }
            };

            this.__store(properties);
        },

        __store: function(properties) {
            var description = {
                ServiceStateDefinition: [],
                MapCenter: {
                    X: properties.position ? properties.position.x : this._map.centerPoint.x,
                    Y: properties.position ? properties.position.y : this._map.centerPoint.y
                },
                SpatialReference: this._map.crs.getWkidString(),
                Dpi: properties.dpi || defaults.dpi,
                Resolution: properties.resolution || this._map.resolution,
                PaperSize: {
                    Width: properties.paperSize && properties.paperSize.width || defaults.paperSize.width,
                    Height: properties.paperSize && properties.paperSize.height || defaults.paperSize.height
                },
                Margin: {
                    Left: properties.margin && properties.margin.left || defaults.margin.left,
                    Top: properties.margin && properties.margin.top || defaults.margin.top,
                    Right: properties.margin && properties.margin.right || defaults.margin.right,
                    Bottom: properties.margin && properties.margin.bottom || defaults.margin.bottom
                },
                PrintingTemplateName: properties.template.Name,
                Parameters: []
            };

            for (var i = 0, len = properties.template.BindingGroups.length; i < len; i++) {
                description.Parameters = description.Parameters.concat(properties.template.BindingGroups[i].Parameters);
            }

            var services = properties.services;
            for (var i = 0, len = services.length; i < len; i++) {
                let service = services[i];
                description.ServiceStateDefinition.push({
                    UniqueName: service.name || service.id,
                    Opactiy: service.layer.opacity,
                    IsVisible: service.isDisplayed,
                    Title: service.Name,
                    CustomParameters: {},
                    Layers: [{ LayerId: -1, LegendItemId: -1, Children: [] }]
                });
            }

            // description.Legend = {
            //     LayerId: -1,
            //     LegendItemId: -1,
            //     Children: getLayerTree(servicesWithLegend)
            // };

            sGis.utils.ajax({
                url: this._serverConnector.url + 'export/store/' + (this._serverConnector.sessionId ? '?_sb=' + this._serverConnector.sessionId : ''),
                type: 'POST',
                data: 'exportDefinition=' + encodeURIComponent(JSON.stringify(description)) + '&f=json',
                cache: false,
                success: properties.success,
                error: properties.error
            });
        }
    };

    function getLayerTree(mapItems) {
        var tree = [];
        for (var i = 0, len = mapItems.length; i < len; i++) {
            var mapItem = mapItems[i];
            if (hasLegend(mapItem)) {
                if (mapItem instanceof sGis.mapItem.MapServer) {
                    tree.push({
                        LayerId: -1,
                        LegendItemId: -1,
                        Name: mapItem.name,
                        Children: getLayerTree(mapItem.children)
                    });
                } else if (mapItem instanceof sGis.mapItem.DynamicServiceLayer && mapItem.isDisplayed) {
                    if (mapItem.children && mapItem.children.length > 0) {
                        tree.push({
                            LayerId: -1,
                            LegendItemId: -1,
                            Name: mapItem.name,
                            Children: getLayerTree(mapItem.children)
                        });
                    } else {
                        var legend = mapItem.legend,
                            legendItems = [];

                        for (var j = 0, length = legend.length; j < length; j++) {
                            legendItems.push({
                                Type: 2,
                                ServiceFullName: mapItem.parentName,
                                Name: legend[j].label,
                                LegendItemId: j,
                                LayerId: legend[j].label ? undefined : mapItem.layerId,
                                Children: []
                            });
                        }

                        tree.push({
                            LayerId: -1,
                            LegendItemId: -1,
                            Name: mapItem.name,
                            Children: legendItems
                        });
                    }
                }
            }
        }

        return tree;
    }

    function hasLegend(mapItem) {
        if (mapItem instanceof sGis.mapItem.DynamicServiceLayer) {
            var legend = mapItem.legend;
            if (legend && legend.length > 0) {
                return true;
            }
        }

        var children = mapItem.getChildren();
        for (var i = 0, len = children.length; i < len; i++) {
            if (hasLegend(children[i])) {
                return true;
            }
        }
        return false;
    }

    return Printer;
    
});
