import {PointFeature} from "sGis/source/features/Point";
import {Polyline} from "sGis/source/features/Polyline";
import {Polygon} from "sGis/source/features/Polygon";
import {PointSymbol} from "sGis/source/symbols/point/Point";
import {PolylineSymbol} from "sGis/source/symbols/Polyline";
import {PolygonSymbol} from "sGis/source/symbols/polygon/Simple";
import {Point} from "sGis/source/Point";
import {Bbox} from "sGis/source/Bbox";
import {error} from "sGis/source/utils/utils";

let geometryTypeMap = { 'point': PointFeature, 'polyline': Polyline, 'polygon': Polygon };

let defaultSymbols = {
    'point': new PointSymbol({ fillColor: 'transparent' }),
    'polyline': new PolylineSymbol({ strokeColor: 'transparent' }),
    'polygon': new PolygonSymbol({ strokeColor: 'transparent' })
};

export const serializeGeometry = function(geometry) {
    let crs = geometry.crs;
    if (geometry instanceof Polygon) {
        return {rings: geometry.coordinates, spatialReference: crs && crs.toString()};
    } else if (geometry instanceof PointFeature || geometry instanceof Point) {
        return {x: geometry.x, y: geometry.y, spatialReference: crs && crs.toString()};
    } else if (geometry instanceof Polyline) {
        return {paths: geometry.coordinates, spatialReference: crs && crs.toString()};
    } else if (geometry instanceof Bbox) {
        return {xmin: geometry.xMin, xmax: geometry.xMax, ymin: geometry.yMin, ymax: geometry.yMax, spatialReference: crs && crs.toString()};
    } else {
        error('Unknown geometry type');
    }
};

export const deserializeFeature = function(obj, crs) {
    let Constructor = geometryTypeMap[obj.geometryType];
    if (!Constructor) error('Unknown geometry type');

    return new Constructor(obj.geometry, { crs: crs, attributes: obj.attributes, sourceName: obj.sourceName, id: obj.id, symbol: defaultSymbols[obj.geometryType] });
};
