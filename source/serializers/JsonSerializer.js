sGis.module('sp.serializers.JsonSerializer', [
    'utils',
    'Crs',
    'feature.Point',
    'feature.Polyline',
    'feature.Polygon',
    'symbol.point.Point',
    'symbol.polyline.Simple',
    'symbol.polygon.Simple'
], (utils, Crs, Point, Polyline, Polygon, PointSymbol, PolylineSymbol, PolygonSymbol) => {

    let geometryTypeMap = { 'point': Point, 'polyline': Polyline, 'polygon': Polygon };

    let defaultSymbols = {
        'point': new PointSymbol({ fillColor: 'transparent' }),
        'polyline': new PolylineSymbol({ strokeColor: 'transparent' }),
        'polygon': new PolygonSymbol({ strokeColor: 'transparent' })
    };

    return {
        serializeGeometry(geometry) {
            let crs = geometry.crs;
            if (geometry instanceof sGis.feature.Polygon) {
                return {rings: geometry.coordinates, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.feature.Point || geometry instanceof sGis.Point) {
                return {x: geometry.x, y: geometry.y, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.feature.Polyline) {
                return {paths: geometry.coordinates, spatialReference: crs && crs.getWkidString()};
            } else if (geometry instanceof sGis.Bbox) {
                return {xmin: geometry.xMin, xmax: geometry.xMax, ymin: geometry.yMin, ymax: geometry.yMax, spatialReference: crs && crs.getWkidString()};
            } else {
                utils.error('Unknown geometry type');
            }
        },

        deserializeFeature(obj, crs) {
            let Constructor = geometryTypeMap[obj.geometryType];
            if (!Constructor) utils.error('Unknown geometry type');

            return new Constructor(obj.geometry, { crs: crs, attributes: obj.attributes, sourceName: obj.sourceName, id: obj.id, symbol: defaultSymbols[obj.geometryType] });
        }
    };

});