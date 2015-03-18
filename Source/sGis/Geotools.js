'use strict';

(function() {
    
sGis.geotools = {};

sGis.geotools.distance = function(a, b) {
    if (a.crs.from) {
        var p1 = a.projectTo(sGis.CRS.geo),
            p2 = b.projectTo(sGis.CRS.geo),
            d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(toRadians((p2.y - p1.y) / 2)), 2) + Math.cos(toRadians(p1.y)) * Math.cos(toRadians(p2.y)) * Math.pow(Math.sin(toRadians((p2.x - p1.x) / 2)), 2))),
            R = 6372795,
            l = d * R;
    } else {
        var l = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    }

    return l;
};

function toRadians(degree) {
    return degree * Math.PI / 180;
}

sGis.geotools.length = function(geometry, crs) {
    var coord = geometry instanceof sGis.feature.Polyline ? geometry.coordinates : geometry;
    crs = geometry instanceof sGis.feature.Polyline ? geometry.crs : crs ? crs : sGis.CRS.geo;
    
    var tempFeature = new sGis.feature.Polyline(coord, {crs: crs}),
        length = 0;
    
    if (crs.from) {
        var projected = tempFeature.projectTo(sGis.CRS.CylindicalEqualArea).coordinates;
    } else {
        projected = tempFeature.coordinates;
    }

    if (geometry instanceof sGis.feature.Polygon) projected.push(projected[0]);

    for (var ring = 0, l = projected.length; ring < l; ring++) {
        for (var i = 0, m = projected[ring].length - 1; i < m; i++) {
            length += sGis.geotools.distance(new sGis.Point(projected[ring][i][0], projected[ring][i][1], crs), new sGis.Point(projected[ring][i + 1][0], projected[ring][i + 1][1], crs));
        }
    }
    
    return length;
};

sGis.geotools.area = function(geometry, crs) {
    var coord = geometry instanceof sGis.feature.Polyline ? geometry.coordinates : geometry;
    crs = geometry instanceof sGis.feature.Polyline ? geometry.crs : crs ? crs : sGis.CRS.geo;
    
    var tempFeature = new sGis.feature.Polyline(coord, {crs: crs}),
        area = 0;
        
    
    if (crs.from) {
        var projected = tempFeature.projectTo(sGis.CRS.CylindicalEqualArea).coordinates;
    } else {
        projected = tempFeature.coordinates;
    }

    for (var ring = 0, l = projected.length; ring < l; ring++) {
        area += polygonArea(projected[ring]);
    }
    return area;        
};

function polygonArea(coord) {
    coord = coord.concat([coord[0]]);
    
    var area = 0;
    for (var i = 0, l = coord.length - 1; i < l; i++) {
        area += (coord[i][0] + coord[i+1][0]) * (coord[i][1] - coord[i + 1][1]);
    }
    return Math.abs(area / 2);
}

sGis.geotools.pointToLineProjection = function(point, line) {
    if (line[0][0] === line[1][0]) {
        return [line[0][0], point[1]];
    } else if (line[0][1] === line[1][1]) {
        return [point[0], line[0][1]];
    } else {
        var lx = line[1][0] - line[0][0],
            ly = line[1][1] - line[0][1],
            dx = line[0][0] - point[0],
            dy = line[0][1] - point[1],
            t = - (dx * lx + dy * ly) / (lx * lx + ly * ly),
            x = line[0][0] + t * lx,
            y = line[0][1] + t * ly;
        return [x, y];
    }
};

/**
 * Checks if a point is located inside a polygon.
 * @param {Number[]} polygon - coordinates of polygon in format [[[x11, y11], [x12, y12], ...], [x21, y21], [x22, y22], ...], ...]. If there is only one counter outer array can be omitted.
 * @param {[Number, Number]} point - coordinates of the point [x, y]
 * @param {Number} [tolerance=0] - the tolerance of check. If the point is out of the polygon, but is closer then tolerance, the returned result will be true.
 * @returns {boolean|Array} - true, if the point is inside of polygon, [ring, index] - index of vertex if the point is closer then 'tolerance' to one of the sides of polygon, false otherwise
 */
sGis.geotools.contains = function(polygon, point, tolerance) {
    sGis.utils.validate(polygon[0], 'array');
    sGis.utils.validate(point, 'array');
    tolerance = tolerance || 0;
    var intersectionCount = 0;

    var polygonCoord = polygon[0][0][0] === undefined ? [polygon] : polygon;
    for (var ring = 0, l = polygonCoord.length; ring < l; ring++) {
        var points = polygonCoord[ring].concat([polygonCoord[ring][0]]),
            prevD = points[0][0] > point[0],
            prevH = points[0][1] > point[1];

        for (var i = 1; i < points.length; i++) {
            if (sGis.geotools.pointToLineDistance(point, [points[i - 1], points[i]]) <= tolerance) {
                return [ring, i-1];
            }

            var D = points[i][0] > point[0],
                H = points[i][1] > point[1];

            if (H !== prevH //otherwise line does not intersect horizontal line
                && (D > 0 || prevD > 0) //line is to the left from the point, but we look to the right
            ) {
                if (!(point[1] === points[i][1] && point[1] === points[i-1][1])) { //checks if line is horizontal and has same Y with point
                    if (sGis.geotools.intersects([[points[i][0], points[i][1]], [points[i - 1][0], points[i - 1][1]]], [point, [Math.max(points[i][0], points[i - 1][0]), point[1]]])) {
                        intersectionCount++;
                    }
                }
            }
            prevD = D;
            prevH = H;
        }
        if (intersectionCount % 2 === 1) return true;
    }

    return false;
};

sGis.geotools.pointToLineDistance = function(point, line) {
    var lx = line[1][0] - line[0][0],
        ly = line[1][1] - line[0][1],
        dx = line[0][0] - point[0],
        dy = line[0][1] - point[1],
        t = 0 - (dx * lx + dy * ly) / (lx * lx + ly * ly);

    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.sqrt(Math.pow(lx * t + dx, 2) + Math.pow(ly * t + dy, 2));
};

sGis.geotools.intersects = function(line1, line2) {
    if (line1[0][0] === line1[1][0]) {
        return line1[0][0] > line2[0][0];
    } else {
        var k = (line1[0][1] - line1[1][1]) / (line1[0][0] - line1[1][0]),
            b = line1[0][1] - k * line1[0][0],
            x = (line2[0][1] - b) / k;

        return x > line2[0][0];
    }
};

})();