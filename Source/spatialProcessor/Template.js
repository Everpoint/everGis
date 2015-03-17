(function() {

    sGis.spatialProcessor.Template = function(asset, path) {
        this.symbol = this._getSymbol(asset.JsonVisualDefinition);
        this.id = asset.Id;
        this.path = path;
        if (!this.symbol) debugger;
    };

    sGis.spatialProcessor.Template.prototype = {
        getImage: function() {
            var tempFeature;
            if (this.symbol.type === 'point') {
                tempFeature = new sGis.feature.Point([0,0],{crs: sGis.CRS.plain});
            } else {
                var type = this.symbol.type === 'polyline' ? sGis.feature.Polyline : sGis.feature.Polygon;
                tempFeature = new type([[-15,-15], [0,15], [15,0]], {crs: sGis.CRS.plain});
            }

            tempFeature.symbol = this.symbol;
            var render = tempFeature.render(1, sGis.CRS.plain);
            return render[0].svg;
        },

        _getSymbol: function(visualDefinition) {
            var object = sGis.spatialProcessor.parseXML(visualDefinition);
            var keys = Object.keys(object.visualDefinitions);
            var key = keys[0];
            var symbolDefinition = object.symbol[key];
            var symbolId = object.visualDefinitions[key];

            var symbol;
            if (symbolDefinition.symbol === 'SimplePointSymbol') {
                if (symbolDefinition.shape === 'Circle') {
                    symbol = new sGis.symbol.point.Point({
                        size: symbolDefinition.size,
                        color: parseColor(symbolDefinition.fill),
                        strokeColor: parseColor(symbolDefinition.stroke),
                        strokeWidth: symbolDefinition.strokeThickness
                    });
                } else {
                    symbol = new sGis.symbol.point.Square({
                        size: symbolDefinition.size,
                        fillColor: parseColor(symbolDefinition.fill),
                        strokeColor: parseColor(symbolDefinition.stroke),
                        strokeWidth: symbolDefinition.strokeThickness
                    }); //todo: what about offset?!!
                }
            } else if (symbolDefinition.symbol === 'ImagePointSymbol') {
                symbol = new sGis.symbol.point.Image({
                    source: symbolDefinition.imageSrc,
                    size: symbolDefinition.size,
                    anchorPoint: symbolDefinition.anchorPoint
                });
            } else if (symbolDefinition.symbol === 'SimplePolylineSymbol') {
                symbol = new sGis.symbol.polyline.Simple({
                    strokeWidth: symbolDefinition.strokeThickness,
                    strokeColor: parseColor(symbolDefinition.stroke)
                });
            } else if (symbolDefinition.symbol === 'SimplePolygonSymbol') {
                if (symbolDefinition.fill && symbolDefinition.fill.brush) {
                    symbol = new sGis.symbol.polygon.BrushFill({
                        strokeWidth: symbolDefinition.strokeThickness,
                        strokeColor: parseColor(symbolDefinition.stroke),
                        fillBrush: symbolDefinition.fill.brush,
                        fillForeground: parseColor(symbolDefinition.fill.foreground),
                        fillBackground: parseColor(symbolDefinition.fill.background)
                    });
                } else {
                    symbol = new sGis.symbol.polygon.Simple({
                        strokeWidth: symbolDefinition.strokeThickness,
                        strokeColor: parseColor(symbolDefinition.stroke),
                        fillColor: parseColor(symbolDefinition.fill)
                    });
                }
            }

            if (!symbol) debugger;
            return symbol;
        }
    };

    function parseColor(color) {
        if (color) {
            return new sGis.utils.Color(color).toString();
        }
    }

    sGis.utils.proto.setProperties(sGis.spatialProcessor.Template.prototype, {
        symbol: null,
        id: null,
        path: null
    });



})();