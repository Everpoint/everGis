'strict mode';

(function() {

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

sGis.spatialProcessor.Printer = function(sp, properties) {
    this._serverConnector = sp.connector;
    this._sp = sp;
};

sGis.spatialProcessor.Printer.prototype = {
    getTemplates: function(properties) {
        utils.ajax({
            url: this._serverConnector.url + 'export/templates/?_sb=' + this._serverConnector.sessionId,
            cache: false,
            success: function(data) {
                try {
                    var templates = utils.parseJSON(data);
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
            var link = self._serverConnector.url + 'export/preview/?noHeader=true&f=binary&_sb=' + self._serverConnector.sessionId + '&ts=' + Date.now();
            if (successHandler) successHandler(link);
        };

        this.__store(properties);
    },

    getImage: function(properties) {
        var successHandler = properties.success,
            self = this;
        properties.success = function() {
            var link = self._serverConnector.url + 'export/print/?noHeader=true&f=binary&_sb=' + self._serverConnector.sessionId + '&ts=' + Date.now();
            if (successHandler) successHandler(link);
        };

        this.__store(properties);
    },

    __store: function(properties) {
        var description = {
            ServiceStateDefinition: [],
            MapCenter: {
                X: properties.position ? properties.position.x : this._sp.map.position.x,
                Y: properties.position ? properties.position.y :this._sp.map.position.y
            },
            SpatialReference: this._sp.map.crs.getWkidString(),
            Dpi: properties.dpi || defaults.dpi,
            Resolution: properties.resolution || this._sp.map.resolution,
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

        var layers = this._sp.map.layers,
            servicesWithLegend = [];
        for (var i = 0, len = layers.length; i < len; i++) {
            if (layers[i].mapServer) {
                if (layers[i].isDisplayed && layers[i].mapServer.mapItem && layers[i].mapServer.mapItem.legend && layers[i].mapServer.mapItem.legend.length > 0) servicesWithLegend.push(layers[i].mapServer.mapItem);
                description.ServiceStateDefinition.push({
                    UniqueName: layers[i].mapServer.fullName || layers[i].mapServer.id,
                    Opactiy: layers[i].opacity,
                    IsVisible: layers[i].isDisplayed,
                    Title: layers[i].mapServer.Name,
                    CustomParameters: {},
                    Layers: [{ LayerId: -1, LegendItemId: -1, Children: [] }]
                });

                var subLayersInfo = layers[i].mapServer.mapItem && layers[i].mapServer.mapItem.getChildren(true) || [],
                    activeLayers = layers[i].mapServer.mapItem && layers[i].mapServer.mapItem.getActiveChildren(true) || [];

                for (var j = 0, length = subLayersInfo.length; j < length; j++) {
                    description.ServiceStateDefinition[description.ServiceStateDefinition.length - 1].Layers.push({
                        LayerId: subLayersInfo[j].layerId,
                        Opactiy: 1,
                        IsVisible: activeLayers.indexOf(subLayersInfo[j]) !== -1,
                        Title: subLayersInfo[j].name
                    });
                }
            }
        }

        description.Legend = {
            LayerId: -1,
            LegendItemId: -1,
            Children: getLayerTree(servicesWithLegend)
        };

        utils.ajax({
            url: this._serverConnector.url + 'export/store/?_sb=' + this._serverConnector.sessionId,
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

})();