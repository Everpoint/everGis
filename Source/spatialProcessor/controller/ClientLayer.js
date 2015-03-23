(function() {

sGis.spatialProcessor.controller.ClientLayer = function(spatialProcessor, options) {
    this._map = options.map;
    this._serviceName = options.serviceName;

    var parameters = {};
    if (options.serviceName) parameters.service = options.serviceName;

    this.__initialize(spatialProcessor, parameters, function() {
        this._layer = new sGis.spatialProcessor.MapServer('VisualObjectsRendering/' + this._mapServiceId, this._spatialProcessor, { map: options.map, display: this._display });
        var self = this;
        
        this._layer.addListner('initialize.sGis-controller-initialization', function() {
            this.removeListner('.sGis-controller-initialization');
            self.initialized = true;
            self.fire('initialize');
        });
    });
};

sGis.spatialProcessor.controller.ClientLayer.prototype = new sGis.spatialProcessor.Controller({
    _type: 'clientLayer',

    loadFile: function(properties) {
        this.__operation(function() {
            return {
                operation: 'bulk',
                dataParameters: 'uid=d7b47c78-9dbc-4dc9-b89b-124fdf23d237&fileName=' + encodeURIComponent(properties.fileName),
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    copy: function(properties) {
        var dataParameters = 'sourceStorage=' + properties.storageId;
        if (properties.items) dataParameters += '&items=' + encodeURIComponent(JSON.stringify(properties.items));

        this.__operation(function() {
            return {
                operation: 'copy',
                dataParameters: dataParameters,
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    saveAs: function(properties) {
        this.__operation(function() {
            return {
                operation: 'save',
                dataParameters: 'uid=e42eac4f-ff1a-4d7e-a15f-21eb601baafd&fileName=' + encodeURIComponent(properties.fileName),
                requested: properties.requested,
                error: properties.error,
                success: properties.success
            };
        });
    },

    queryGeometryTypes: function(properties) {
        this.__operation(function() {
            return {
                operation: 'queryGeometryTypes',
                success: function(data) {
                    if (properties.success) {
                        var response = [];
                        for (var i = 0, len = data.content.length; i < len; i++) {
                            response.push(geometryTypes[data.content[i]]);
                        }

                        properties.success(response);
                    }
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    queryAttributes: function(properties) {
        var dataParameters = '';
        if (properties.geometryType) dataParameters += geometryTypes.indexOf(properties.geometryType) + '&';
        if (properties.numericOnly) dataParameters += properties.numericOnly + '&';
        this.__operation(function() {
            return {
                operation: 'queryAttributes',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    getClassifiableProperties: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType);
        this.__operation(function() {
            return {
                operation: 'getClassifiableProperties',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    getClassifiers: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType) + '&propertyName=' + properties.propertyName;
        this.__operation(function() {
            return {
                operation: 'getClassifiers',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    buildClassifierTable: function(properties) {
        var dataParameters = 'geometryType=' + geometryTypes.indexOf(properties.geometryType) + '&settings=' + encodeURIComponent(JSON.stringify(properties.settings));
        this.__operation(function() {
            return {
                operation: 'buildClassifierTable',
                dataParameters: dataParameters,
                success: function(data) {
                    if (properties.success) properties.success(data.content);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    },

    /*
    *   {
    *      tables: {
    *           point: [table1, table2, ...],
    *           polyline: [],
    *           polygon: []
    *       },
    *
    *       defaultSymbols: {
    *           point: symbol,
    *           polyline: symbol,
    *           polygon: symbol
    *       }
    *   }
    *
    */

    applySymbolizer: function(properties) {
        var symbolizerOptions = {
            SettersByAttributes: {},
            SymbolOverrideDefinitions: [],
            SerealizedDefaultSymbols: ''
        };

        for (var className in properties.tables) {
            symbolizerOptions.SettersByAttributes[geometryTypeTranslation[className]] = {};
            for (var i = 0, len = properties.tables[className].length; i < len; i++) {
                var table = properties.tables[className][i];
                var attributeName = table[0].AttributeName;
                normolizeColor(table);
                symbolizerOptions.SettersByAttributes[geometryTypeTranslation[className]][attributeName] = table;
            }
        }

        var symbols = [];
        var propDefaultSymbols = properties.defaultSymbols || [];
        for (var i in defaultSymbols) {
            symbols.push(propDefaultSymbols[i] || defaultSymbols[i]);
        }
        symbolizerOptions.SerealizedDefaultSymbols = sGis.spatialProcessor.serializeSymbols(symbols);

        this.__operation(function() {
            return {
                operation: 'applySymbolizer',
                dataParameters: 'symbolizer=' + encodeURIComponent(JSON.stringify(symbolizerOptions)),
                success: function(data) {
                    if (properties.success) properties.success(data);
                },
                requested: properties.requested,
                error: properties.error
            };
        });
    }
});

Object.defineProperties(sGis.spatialProcessor.controller.ClientLayer.prototype, {
    mapServer: {
        get: function() {
            return this._layer;
        }
    },

    storageId: {
        get: function() {
            return this._storageId;
        }
    },

    map: {
        get: function() {
            return this._map;
        },
        set: function(map) {
            this._map = map;
        }
    }
});

var geometryTypes = [undefined, 'point', 'polyline', 'polygon'];
var geometryTypeTranslation = {
    point: 'Point',
    polyline: 'Line',
    polygon: 'Polygon'
};

var defaultSymbols = {
    point: new sGis.symbol.point.Point({
        size: 5,
        color: 'blue'
    }),
    polyline: new sGis.symbol.polyline.Simple({
        strokeWidth: 1,
        strokeColor: 'red'
    }),
    polygon: new sGis.symbol.polygon.Simple({
        strokeWidth: 1,
        strokeColor: 'green',
        fillColor: 'blue'
    })
};

function normolizeColor(table) {
    for (var i = 0, len = table.length; i < len; i++) {
        if (table[i].PropertyValue.Color) table[i].PropertyValue.Color = hexToRGBA(table[i].PropertyValue.Color);
    }
}

function hexToRGBA(hex) {
    return {
        A: parseInt(hex.substr(1, 2), 16),
        R: parseInt(hex.substr(3, 2), 16),
        G: parseInt(hex.substr(5, 2), 16),
        B: parseInt(hex.substr(7, 2), 16)
    };
}

})();