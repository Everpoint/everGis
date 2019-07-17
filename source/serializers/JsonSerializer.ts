import {PointFeature} from "@evergis/sgis/es/features/PointFeature";
import {Polyline} from "@evergis/sgis/es/features/Polyline";
import {Polygon} from "@evergis/sgis/es/features/Polygon";
import {PointSymbol} from "@evergis/sgis/es/symbols/point/Point";
import {PolylineSymbol} from "@evergis/sgis/es/symbols/PolylineSymbol";
import {PolygonSymbol} from "@evergis/sgis/es/symbols/polygon/Simple";
import {Point} from "@evergis/sgis/es/Point";
import {Bbox} from "@evergis/sgis/es/Bbox";
import {error} from "@evergis/sgis/es/utils/utils";

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

function normalizeFeatureAttribute(attributes: { Key: string, Value: any }[]) {
    return attributes && attributes.reduce((acc, { Key, Value }) => {
        acc[Key] = Value;
        return acc;
    }, {})
}

export const deserializeFeature = function(obj, crs) {
    let Constructor = geometryTypeMap[obj.geometryType];
    if (!Constructor) error('Unknown geometry type');

    const feature = new Constructor(obj.geometry, {
        crs,
        symbol: defaultSymbols[obj.geometryType]
    });
    // feature constructor not set other attributes
    feature.attributes = normalizeFeatureAttribute(obj.attributes);
    feature.sourceName = obj.sourceName;
    feature.id = obj.id;

    return feature;
};
