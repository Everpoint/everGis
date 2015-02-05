$(function() {

    describe('Geotools', function() {
        describe('.contains()', function() {
            var simplePolygon = [[-10, -10], [0, 10], [10, -10]];
            var polygon = [[[-10, -10], [0, 10], [10, -10]], [[20, -10], [20, 10], [30, 10], [30, -10]]];
            var point = [0, 0];

            it('should throw exception in case of missing parameters', function() {
                expect(function() { sGis.geotools.contains(); }).toThrow();
                expect(function() { sGis.geotools.contains([[[1, 1], [2, 2]]]); }).toThrow();
                expect(function() { sGis.geotools.contains(undefined, [1, 1]); }).toThrow();
            });

            it('should throw exception in case of incorrect polygon format', function() {
                expect(function() { sGis.geotools.contains(1, point); }).toThrow();
                expect(function() { sGis.geotools.contains('1, 1', point); }).toThrow();
                expect(function() { sGis.geotools.contains({x: 1, y: 1}, point); }).toThrow();
                expect(function() { sGis.geotools.contains(null, point); }).toThrow();
                expect(function() { sGis.geotools.contains([1, 1], point); }).toThrow();
                expect(function() { sGis.geotools.contains([], point); }).toThrow();
            });

            it('should throw exception in case of incorrect point format', function() {
                expect(function() { sGis.geotools.contains(polygon, 1); }).toThrow();
                expect(function() { sGis.geotools.contains(polygon, '1, 1'); }).toThrow();
                expect(function() { sGis.geotools.contains(polygon, {x: 1, y: 1}); }).toThrow();
                expect(function() { sGis.geotools.contains(polygon, null); }).toThrow();
            });

            it('should return true if the point is inside of polygon', function() {
                expect(sGis.geotools.contains(polygon, point)).toBe(true);
                expect(sGis.geotools.contains(polygon, [0, 9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [-9, -9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [9, -9])).toBe(true);
            });

            it('should return true if the point is inside of any ring of polygon', function() {
                expect(sGis.geotools.contains(polygon, [25, 0])).toBe(true);
                expect(sGis.geotools.contains(polygon, [21, -9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [21, 9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [29, 9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [29, -9])).toBe(true);
            });

            it('should return true if the point is on one of the sides', function() {
                expect(sGis.geotools.contains(polygon, [0, -10])).toBe(true);
                expect(sGis.geotools.contains(polygon, [-9, -10])).toBe(true);
                expect(sGis.geotools.contains(polygon, [9, -10])).toBe(true);
                expect(sGis.geotools.contains(polygon, [-5, 0])).toBe(true);
                expect(sGis.geotools.contains(polygon, [5, 0])).toBe(true);
            });

            it('should return true if the point is on a side of any ring of polygon', function() {
                expect(sGis.geotools.contains(polygon, [20, 0])).toBe(true);
                expect(sGis.geotools.contains(polygon, [25, 10])).toBe(true);
                expect(sGis.geotools.contains(polygon, [30, 9])).toBe(true);
                expect(sGis.geotools.contains(polygon, [21, -10])).toBe(true);
            });

            it('should return true if the point is one of the points of the polygon', function() {
                expect(sGis.geotools.contains(polygon, polygon[0][0])).toBe(true);
                expect(sGis.geotools.contains(polygon, polygon[0][1])).toBe(true);
                expect(sGis.geotools.contains(polygon, polygon[0][2])).toBe(true);
            });

            it('should return true if the point is one of the points of any ring of the polygon', function() {
                expect(sGis.geotools.contains(polygon, polygon[1][0])).toBe(true);
                expect(sGis.geotools.contains(polygon, polygon[1][1])).toBe(true);
                expect(sGis.geotools.contains(polygon, polygon[1][2])).toBe(true);
                expect(sGis.geotools.contains(polygon, polygon[1][3])).toBe(true);
            });

            it('should return false if the point is outside the polygon', function() {
                expect(sGis.geotools.contains(polygon, [-100, -100])).toBe(false);
                expect(sGis.geotools.contains(polygon, [-10, 0])).toBe(false);
                expect(sGis.geotools.contains(polygon, [-5, 8])).toBe(false);
                expect(sGis.geotools.contains(polygon, [0, 11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [5, 8])).toBe(false);
                expect(sGis.geotools.contains(polygon, [11, -10])).toBe(false);
                expect(sGis.geotools.contains(polygon, [10, -11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [0, -11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [-10, -11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [20, -11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [20, 11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [31, 11])).toBe(false);
                expect(sGis.geotools.contains(polygon, [31, -11])).toBe(false);
            });

            it('should correctly understand 3 points in line', function() {
                var poly = [[[0, 0], [0, 10], [0, 20], [10, 10]]];
                expect(sGis.geotools.contains(poly, [0, -5])).toBe(false);
                expect(sGis.geotools.contains(poly, [0, 5])).toBe(true);
                expect(sGis.geotools.contains(poly, [0, 15])).toBe(true);
                expect(sGis.geotools.contains(poly, [0, 25])).toBe(false);

                poly = [[[0, 0], [10, 0], [20, 0], [10, 10]]];
                expect(sGis.geotools.contains(poly, [-5, 0])).toBe(false);
                expect(sGis.geotools.contains(poly, [5, 0])).toBe(true);
                expect(sGis.geotools.contains(poly, [15, 0])).toBe(true);
                expect(sGis.geotools.contains(poly, [25, 0])).toBe(false);
            });
        });
    });
});
