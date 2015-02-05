(function() {

    sGis.spatialProcessor.Template = function(asset) {
        this.name = asset.Name;
        this.serverBuilder = asset.ServerBuilder;
        this.categories = asset.Categories;
        this.geometryType = asset.GeometryType;
        this.isServerAsset = asset.IsServerAsset;
        this.overrideIcon = asset.OverrideIcon;
        this.visualDefinition = asset.JsonVisualDefinition;
    };

    sGis.spatialProcessor.Template.prototype = {
        _name: 'Undefined',
        _overrideIcon: '',
        _isServerAsset: false,
        _geometryType: undefined,
        _categories: [],
        _serverBuilder: null,

        createObject: function(coordinates, crs) {
            var objectClass = this.objectClass;
            if (objectClass !== undefined) {
                var feature = new this.objectClass(coordinates, {crs: crs, symbol: this.symbol});
                feature.visualDefinitionId = this._visualDefinition.visualDefinitions[Object.keys(this._visualDefinition.visualDefinitions)[0]];
                return feature;
            } else {
                return null;
            }
        }
    };

    Object.defineProperties(sGis.spatialProcessor.Template.prototype, {
        name: {
            get: function() {
                return this._name;
            },
            set: function(name) {
                if (!utils.isString(name)) utils.error('String is expected but got ' + name + ' instead');
                this._name = name;
            }
        },

        visualDefinition: {
            get: function() {
                return this._visualDefinition;
            },
            set: function(visualDefinition) {
                var symbolDescription = visualDefinition.symbol[Object.keys(visualDefinition.visualDefinitions)[0]],
                    featureType = featureTypes[this._geometryType];
                if (featureType) {
                    var symbol = getSymbol[featureType](symbolDescription);
                }

                this._symbol = symbol;
                this._visualDefinition = visualDefinition;
            }
        },

        serverBuilder: {
            get: function() {
                return this._serverBuilder;
            },
            set: function(serverBuilder) {
                this._serverBuilder = serverBuilder;
            }
        },

        geometryType: {
            get: function() {
                return this._geometryType;
            },

            set: function(type) {
                if (!utils.isNumber(type)) utils.error('Number is expected but got ' + type + ' instead');
                this._geometryType = type;
            }
        },

        objectClass: {
            get: function() {
                return featureClasses[this._geometryType];
            }
        },

        symbol: {
            get: function() {
                return this._symbol;
            }
        },

        style: {
            get: function() {
                return !this._symbol || this._symbol.style;
            }
        }
    });


    var featureClasses = [undefined, sGis.feature.Point, sGis.feature.Polyline, sGis.feature.Polygon],
        featureTypes = [undefined, 'point', 'polyline', 'polygon'],

        getSymbol = {
            point: function(symbolDescription) {
                if (symbolDescription.imageSrc) {
                    return new sGis.symbol.point.Image({
                        source: symbolDescription.imageSrc,
                        size: symbolDescription.size,
                        anchorPoint: symbolDescription.anchorPoint
                    });
                } else if (symbolDescription.shape === 'Circle') {
                    return new sGis.sybmol.point.Point({
                        size: symbolDescription.size,
                        color: parseColor(symbolDescription.stroke)
                    });
                } else {
                    return new sGis.symbol.point.Square({
                        size: symbolDescription.size,
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillColor: parseColor(symbolDescription.fill)
                    }); //TODO: there should be anchor point here
                }
            },

            polyline: function(symbolDescription) {
                return new sGis.symbol.polyline.Simple({
                    strokeWidth: symbolDescription.strokeThickness,
                    strokeColor: parseColor(symbolDescription.stroke)
                });
            },

            polygon: function(symbolDescription) {
                if (symbolDescription.fill && symbolDescription.fill.brush) {
                    return new sGis.symbol.polygon.BrushFill({
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillBrush: symbolDescription.fill.brush,
                        fillForeground: parseColor(symbolDescription.fill.foreground),
                        fillBackground: parseColor(symbolDescription.fill.background)
                    });
                } else {
                    return new sGis.symbol.polygon.Simple({
                        strokeWidth: symbolDescription.strokeThickness,
                        strokeColor: parseColor(symbolDescription.stroke),
                        fillColor: parseColor(symbolDescription.fill)
                    });
                }
            }
        };


    /*
     public enum GeometryType
     {
     Unknown,
     Point,
     Line,
     Polygon,
     Mixed,
     Envelope,
     Multipoint
     }
     */

    function parseColor(color) {
        if (color) {
            return 'rgba(' + parseInt(color.substring(3, 5), 16) + ', ' + parseInt(color.substring(5, 7), 16) + ', ' + parseInt(color.substring(7, 9), 16) + ', ' + parseInt(color.substring(1, 3), 16) / 255 + ')';
        } else {
            return color;
        }
    }

})();