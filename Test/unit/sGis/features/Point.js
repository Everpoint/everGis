$(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    describe('sGis.feature.Point', function () {
        beforeEach(function () {
            $('#map').width(500).height(500);
        });

        afterEach(function () {
            $('#map').html('').width(0).height(0);
            ;
        });

        describe('initialization', function () {
            it('should be created with default parameters', function () {
                expect(function () {
                    new sGis.feature.Point();
                }).toThrow();

                var point1 = new sGis.feature.Point([55, 37]);

                expect(point1).toBeDefined();
                expect(point1.render(1000, sGis.CRS.webMercator)[0] instanceof sGis.geom.Arc).toBeTruthy();
            });

            it('should have unique id', function () {
                var points = [];
                for (var i = 0; i < 10; i++) {
                    points.push(new sGis.feature.Point([55, 37]));
                }

                expect(points[0].id).toBeDefined();

                var hasDuplicateId = false;
                for (var i = 0; i < 10; i++) {
                    for (var j = i + 1; j < 10; j++) {
                        if (points[i].id === points[j].id) hasDuplicateId = true;
                    }
                }
                expect(hasDuplicateId).toBeFalsy();
            });
        });

        describe('properties', function() {
            describe('.symbol', function() {
                it('should by default be a simple point symbol', function() {
                    var point = new sGis.feature.Point([10, 10]);
                    expect(point.symbol instanceof sGis.symbol.point.Point).toBe(true);
                });

                it('should set the property correctly in constructor', function() {
                    var point = new sGis.feature.Point([10, 10], {symbol: new sGis.symbol.point.Image()});
                    expect(point.symbol instanceof sGis.symbol.point.Image).toBe(true);
                });

                it('should set the symbol in assigned', function() {
                    var point = new sGis.feature.Point([10, 10]);
                    point.symbol = new sGis.symbol.point.Square();
                    expect(point.symbol instanceof sGis.symbol.point.Square).toBe(true);
                });
            });
        });

        describe('methods', function() {
            describe('.setTempSymbol()', function() {

            });
        });
    });
});