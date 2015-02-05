'use strict';

$(document).ready(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    /*
    * Geometry module tests
    */
    
    describe('Geometry', function() {
        
        /*
        * sGis.Point
        */
        
        describe('sGis.Point', function() {
            it ('should be created with default projection and throw exceptions', function() {
                expect(function() {new sGis.Point();}).toThrow();
                expect(function() {new sGis.Point(55);}).toThrow();
                expect(function() {new sGis.Point('a', 'b');}).toThrow();
                expect(function() {new sGis.Point([55, 37], [55, 37]);}).toThrow();
                expect(function() {new sGis.Point([55, 37]);}).toThrow();
                expect(function() {new sGis.Point({x: 55, y: 37});}).toThrow();
                
                expect(function() {new sGis.Point(55, 37, 'notProjection');}).toThrow();
                expect(function() {new sGis.Point(55, 37, 45);}).toThrow();
                expect(function() {new sGis.Point(55, 37, []);}).toThrow();
                expect(function() {new sGis.Point(55, 37, {crs: 'notProjection'});}).toThrow();
                
                var point1 = new sGis.Point(55, 37);
                
                expect(point1).toBeDefined();
                expect(point1.x).toBe(37);
                expect(point1.y).toBe(55);
                expect(point1.crs).toBe(sGis.CRS.geo);
                
                var point2 = new sGis.Point(56, 38, sGis.CRS.webMercator);
                expect(point2.x).toBe(56);
                expect(point2.y).toBe(38);
                expect(point2.crs).toBe(sGis.CRS.webMercator);
                
                var point3 = new sGis.Point(1000, 200000, sGis.CRS.ellipticalMercator);
                expect(point3.x).toBe(1000);
                expect(point3.y).toBe(200000);
                expect(point3.crs).toBe(sGis.CRS.ellipticalMercator);
            });
            
                
            it('clone() should make exact copy of a point', function() {
                var point1 = new sGis.Point(55, 37, sGis.CRS.webMercator),
                    point2 = point1.clone();

                expect(point2 instanceof sGis.Point).toBeTruthy();
                expect(point2).not.toBe(point1);
                expect(point2.x).toBe(point1.x);
                expect(point2.y).toBe(point1.y);
                expect(point2.crs).toBe(point1.crs);
            });

            it('getCoordinates() should return the coordinates in right order', function() {
                var point1 = new sGis.Point(55, 37);
                expect(point1.getCoordinates()).toEqual([55, 37]);

                var point2 = new sGis.Point(20000, 40000, sGis.CRS.webMercator);
                expect(point2.getCoordinates()).toEqual([20000, 40000]);
                point2 = point2.projectTo(sGis.CRS.geo);
                expect(point2.getCoordinates()).toEqual([point2.y, point2.x]);
            });
        });


        /*
         * sGis.Bbox
         */

        describe('sGis.Bbox', function() {
            var p1 = new sGis.Point(0, 0),
                p2 = new sGis.Point(10, 10),
                bbox;
                
            beforeEach(function() {
                bbox = new sGis.Bbox(p1, p2);
            });
            
            describe('creation', function() {
                it('should be created if two sGis.Point are specified', function() {
                    expect(bbox.p[0]).toEqual(p1);
                    expect(bbox.p[1]).toEqual(p2);
                    expect(bbox.p[0]).not.toBe(p1);
                    expect(bbox.p[1]).not.toBe(p2);
                });
                
                it('should be created if one of the points is specified as sGis.Point and another as array', function() {
                    var bbox1 = new sGis.Bbox(p1, [10, 10]);
                    expect(bbox1.p[0]).toEqual(p1);
                    expect(bbox1.p[1]).toEqual(new sGis.Point(10, 10, p1.crs));
                    
                    var bbox2 = new sGis.Bbox([0, 0], p2);
                    expect(bbox2.p[0]).toEqual(new sGis.Point(0, 0, p2.crs));
                    expect(bbox2.p[1]).toEqual(p2);
                });
                
                it('should be created if both points are arrays and crs is specified', function() {
                    var bbox = new sGis.Bbox([0, 0], [10, 10], sGis.CRS.webMercator);
                    expect(bbox.p[0]).toEqual(new sGis.Point(0, 0, sGis.CRS.webMercator));
                    expect(bbox.p[1]).toEqual(new sGis.Point(10, 10, sGis.CRS.webMercator));
                });
                
                it('should use the default crs if it is not speciefied', function() {
                    var defaultCrs = sGis.CRS.geo,
                        bbox = new sGis.Bbox([0, 0], [10, 10]);
                    expect(bbox).toEqual(new sGis.Bbox([0, 0], [10, 10], defaultCrs));
                });
                
                it('should reproject the points if different crs is specified for bbox', function() {
                    var bbox = new sGis.Bbox(p1, p2, sGis.CRS.ellipticalMercator);
                    expect(bbox.p[0]).toEqual(p1.projectTo(sGis.CRS.ellipticalMercator));
                    expect(bbox.p[1]).toEqual(p2.projectTo(sGis.CRS.ellipticalMercator));
                });
                
                it('should reproject second point to the crs of the first point', function() {
                    var point = new sGis.Point(0, 10, sGis.CRS.ellipticalMercator),
                        bbox = new sGis.Bbox(p1, point);
                    expect(bbox.p[0]).toEqual(p1);
                    expect(bbox.p[1]).toEqual(point.projectTo(p1.crs));
                });
                
                it('should throw exception if one of the points cannot be projected to the prefered coordinate system', function() {
                    expect(function() {var bbox = new sGis.Bbox(p1, p2, sGis.CRS.plain);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox(p1, [10, 10], sGis.CRS.plain);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox([0, 0], p2, sGis.CRS.plain);}).toThrow();
                });
                
                it('should throw if only one point is specified', function() {
                    expect(function() {var bbox = new sGis.Bbox(p1);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox([10, 10]);}).toThrow();
                });
                
                it('should throw in case of incorrect parameters', function() {
                    expect(function() {var bbox = new sGis.Bbox();}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox('a', p1);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox(p1, 'a');}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox(1, 2);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox(p1, p2, 'crs');}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox([p1, p2]);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox([[0, 0], [10, 10]]);}).toThrow();
                    expect(function() {var bbox = new sGis.Bbox({}, p2);}).toThrow();
                });
            });
            
            describe('properties', function() {
                it('.crs should return the crs of the bbox', function() {
                    expect(bbox.crs).toBe(p1.crs);
                    var bbox1 = new sGis.Bbox([0, 0], p2);
                    expect(bbox1.crs).toBe(p2.crs);
                    var bbox2 = new sGis.Bbox(p1, [10, 10]);
                    expect(bbox2.crs).toBe(p1.crs);
                    var bbox3 = new sGis.Bbox(p1, p2, sGis.CRS.ellipticalMercator);
                    expect(bbox3.crs).toBe(sGis.CRS.ellipticalMercator);
                    var bbox4 = new sGis.Bbox([0, 0], [10, 10], sGis.CRS.ellipticalMercator);
                    expect(bbox4.crs).toBe(sGis.CRS.ellipticalMercator);
                    var bbox5 = new sGis.Bbox([0, 0], [10, 10]);
                    expect(bbox5.crs).toBe(sGis.CRS.geo);
                });
                
                it('.crs should set the crs and reproject the points', function() {
                    bbox.crs = sGis.CRS.ellipticalMercator;
                    expect(bbox.crs).toBe(sGis.CRS.ellipticalMercator);
                    expect(bbox.p[0]).toEqual(p1.projectTo(sGis.CRS.ellipticalMercator));
                    expect(bbox.p[1]).toEqual(p2.projectTo(sGis.CRS.ellipticalMercator));
                });
                
                it('.crs should throw exception in case of incorrect argument', function() {
                    expect(function() {bbox.crs = undefined;}).toThrow();
                    expect(function() {bbox.crs = 1;}).toThrow();
                    expect(function() {bbox.crs = 'crs';}).toThrow();
                    expect(function() {bbox.crs = [];}).toThrow();
                    expect(function() {bbox.crs = {};}).toThrow();
                });
                
                it('.crs should throw exception if it is impossible to reproject to the new crs', function() {
                    expect(function() {bbox.crs = sGis.CRS.plain;}).toThrow();
                });
                
                it('.p1 and .p2 should return the first and the second points of bbox respectivly', function() {
                    expect(bbox.p1).toEqual(p1);
                    expect(bbox.p2).toEqual(p2);
                    
                    var bbox1 = new sGis.Bbox(p2, p1);
                    expect(bbox1.p1).toEqual(p2);
                    expect(bbox1.p2).toEqual(p1);
                });
                
                it('.p1 and .p2 should set the respective points', function() {
                    var point = new sGis.Point(20, 20);
                        
                    bbox.p2 = point;
                    expect(bbox.p2).toEqual(point);
                    expect(bbox.p2).not.toBe(point);
                    
                    bbox.p1 = [40, 40];
                    expect(bbox.p1).toEqual(new sGis.Point(40, 40, bbox.crs));
                });
                
                it('.p1 and .p2 should reproject the point if necessary', function() {
                    var point = new sGis.Point(30, 30, sGis.CRS.ellipticalMercator);
                        
                    bbox.p1 = point;
                    expect(bbox.p1).toEqual(point.projectTo(bbox.crs));
                    expect(point.crs).toBe(sGis.CRS.ellipticalMercator);
                    
                    bbox.p2 = point;
                    expect(bbox.p2).toEqual(point.projectTo(bbox.crs));
                });
                
                it('.p1 and .p2 should throw exceptions in case of incorrect argument', function() {
                    expect(function() {bbox.p1 = undefined;}).toThrow();
                    expect(function() {bbox.p1 = null;}).toThrow();
                    expect(function() {bbox.p1 = 1;}).toThrow();
                    expect(function() {bbox.p1 = 'point';}).toThrow();
                    expect(function() {bbox.p1 = [];}).toThrow();
                    expect(function() {bbox.p1 = {};}).toThrow();
                    expect(function() {bbox.p2 = undefined;}).toThrow();
                    expect(function() {bbox.p2 = null;}).toThrow();
                    expect(function() {bbox.p2 = 1;}).toThrow();
                    expect(function() {bbox.p2 = 'point';}).toThrow();
                    expect(function() {bbox.p2 = [];}).toThrow();
                    expect(function() {bbox.p2 = {};}).toThrow();
                });
                
                it('.p1 and .p2 should throw exceptions if new point cannot be projected to the bbox crs', function() {
                    expect(function() {bbox.p1 = sGis.CRS.plain;}).toThrow();
                    expect(function() {bbox.p2 = sGis.CRS.plain;}).toThrow();
                });
                
                it('.xMax, yMax should return the upper border of the bbox', function() {
                    expect(bbox.xMax).toBe(10);
                    expect(bbox.yMax).toBe(10);
                    bbox.p1 = [20, 20];
                    expect(bbox.xMax).toBe(20);
                    expect(bbox.yMax).toBe(20);
                    bbox.p2 = [20, 20];
                    expect(bbox.xMax).toBe(20);
                    expect(bbox.yMax).toBe(20);
                    bbox.p1 = [0, 20];
                    expect(bbox.xMax).toBe(20);
                    expect(bbox.yMax).toBe(20);
                    bbox.p2 = [-10, 30];
                    expect(bbox.xMax).toBe(30);
                    expect(bbox.yMax).toBe(0);
                });
                
                it('.xMin, yMin should return the lower border of the bbox', function() {
                    expect(bbox.xMin).toBe(0);
                    expect(bbox.yMin).toBe(0);
                    bbox.p1 = [20, 20];
                    expect(bbox.xMin).toBe(10);
                    expect(bbox.yMin).toBe(10);
                    bbox.p2 = [20, 20];
                    expect(bbox.xMin).toBe(20);
                    expect(bbox.yMin).toBe(20);
                    bbox.p1 = [0, 20];
                    expect(bbox.xMin).toBe(20);
                    expect(bbox.yMin).toBe(0);
                    bbox.p2 = [-10, 30];
                    expect(bbox.xMin).toBe(20);
                    expect(bbox.yMin).toBe(-10);                    
                });
                
                it('.xMax and .yMax should set the upper border of the bbox', function() {
                    bbox.xMax = 30;
                    expect(bbox).toEqual(new sGis.Bbox([0, 0], [10, 30]));
                    bbox.yMax = 40;
                    expect(bbox).toEqual(new sGis.Bbox([0, 0], [40, 30]));
                    bbox.xMax = 5;
                    bbox.yMax = 7;
                    expect(bbox).toEqual(new sGis.Bbox([0, 0], [7, 5]));
                    
                    var bbox1 = new sGis.Bbox([20, 20], [10, 10]);
                    bbox1.xMax = 30;
                    bbox1.yMax = 15;
                    expect(bbox1).toEqual(new sGis.Bbox([15, 30], [10, 10]));
                    
                    var bbox2 = new sGis.Bbox([10, 20], [20, 10]);
                    bbox2.xMax = 15;
                    bbox2.yMax = 25;
                    expect(bbox2).toEqual(new sGis.Bbox([10, 15], [25, 10]));
                });
                
                it('.xMax, xMin, yMax, yMin should throw error in case of incorrect argument', function() {
                    expect(function() {bbox.xMax = null;}).toThrow();
                    expect(function() {bbox.yMax = 'abc';}).toThrow();
                    expect(function() {bbox.xMin = {};}).toThrow();
                    expect(function() {bbox.yMin = [];}).toThrow();
                });
                
                it('.xMax and .yMax should throw an exception if new border is less then lower border', function() {
                    expect(function() {bbox.xMax = -5;}).toThrow();
                    expect(function() {bbox.yMax = -5;}).toThrow();
                });

                it('.xMin and .yMin should throw an exception if new border is more then higher border', function() {
                    expect(function() {bbox.xMin = 15;}).toThrow();
                    expect(function() {bbox.yMin = 15;}).toThrow();
                });
            });
            
            describe('methods', function() {
                it('.projectTo() should return a new bbox in the specified crs', function() {
                    var projected = bbox.projectTo(sGis.CRS.webMercator);
                    
                    expect(projected.p1).toEqual(p1.projectTo(sGis.CRS.webMercator));
                    expect(projected.p2).toEqual(p2.projectTo(sGis.CRS.webMercator));
                });
                
                it('.projectTo() should throw an exception in case of incorrect argument', function() {
                    expect(function() {bbox.projectTo();}).toThrow();
                    expect(function() {bbox.projectTo(1);}).toThrow();
                    expect(function() {bbox.projectTo('crs');}).toThrow();
                    expect(function() {bbox.projectTo([]);}).toThrow();
                    expect(function() {bbox.projectTo({});}).toThrow();
                    expect(function() {bbox.projectTo(null);}).toThrow();
                });
                
                it('.projectTo() should throw an exception if it is impossible to reproject to the specified crs', function() {
                    expect(function() {bbox.projectTo(sGis.CRS.plain);}).toThrow();
                });
                
                it('.equals() should return true if one bbox equals another and false otherwise', function() {
                    expect(bbox.equals(bbox)).toBe(true);
                    expect(bbox.equals(new sGis.Bbox(p1, p2))).toBe(true);
                    expect(bbox.equals(new sGis.Bbox([0, 0], [10, 10], p1.crs))).toBe(true);
                    expect(bbox.equals(new sGis.Bbox(p2, p1))).toBe(false);
                    expect(bbox.equals(new sGis.Bbox(p1, p2, sGis.CRS.ellipticalMercator))).toBe(false);
                    expect(bbox.equals(bbox.projectTo(sGis.CRS.ellipticalMercator))).toBe(false);
                });
                
                it('.equals() should throw an exception in case of incorrect argument', function() {
                    expect(function() {bbox.equals();}).toThrow();
                    expect(function() {bbox.equals(1);}).toThrow();
                    expect(function() {bbox.equals('bbox');}).toThrow();
                    expect(function() {bbox.equals([]);}).toThrow();
                    expect(function() {bbox.equals({});}).toThrow();
                    expect(function() {bbox.equals(null);}).toThrow();
                });
                
                it('.intersects() should return true if two bboxes have common area', function() {
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([-10, 20], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([20, -10], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([20, 20], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([7, 7], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([10, 10], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([0, 10], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([10, 0], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([0, 0], [5, 5]))).toBe(true);
                    expect(bbox.intersects(new sGis.Bbox([-5, -5], [15, 15]))).toBe(true);
                });
                
                it('.intersects() should return false if two bboxes do not have commom area', function() {
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [-1, -1]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [-1, 20]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [20, -1]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([20, 20], [11, 11]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([20, 20], [-1, 11]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([20, 20], [11, -1]))).toBe(false);                    
                });
                
                it('.intersects() should return false in case of border touch', function() {
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [5, 0]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([-10, -10], [0, 5]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([10, -10], [5, 0]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([10, -10], [10, 5]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([10, 10], [10, 5]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([10, 10], [5, 10]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([-10, 10], [5, 10]))).toBe(false);                    
                    expect(bbox.intersects(new sGis.Bbox([-10, 10], [0, 5]))).toBe(false);                    
                });
                
                it('.intersects() should throw an exception in case of incorrect parameter', function() {
                    expect(function() {bbox.intersects();}).toThrow();
                    expect(function() {bbox.intersects(1);}).toThrow();
                    expect(function() {bbox.intersects('a');}).toThrow();
                    expect(function() {bbox.intersects(null);}).toThrow();
                    expect(function() {bbox.intersects([]);}).toThrow();
                    expect(function() {bbox.intersects({});}).toThrow();
                });
                
                it('.intersects() should throw an exception if target bbox cannot be projected to the current crs', function() {
                    expect(function() {bbox.intersects(new sGis.Bbox([0, 0], [10, 10], sGis.CRS.plain));}).toThrow();
                });

                it('.clone() should make an exect copy of the bbox', function() {
                    expect(bbox.clone()).toEqual(bbox);
                    expect(bbox.clone()).not.toBe(bbox);

                    var bbox1 = new sGis.Bbox([1000, 1000], [2000, 2000], sGis.CRS.plain);
                    expect(bbox1.clone()).toEqual(bbox1);
                    expect(bbox1.clone()).not.toBe(bbox1);
                    expect(bbox1.clone()).not.toBe(bbox1.clone());
                })
            });
        });

        /*
         * sGis.geom.Point
         */
        
        describe('sGis.geom.Point', function() {
            it ('should be created with default settings and throw exceptions', function() {
                expect(function() {new sGis.geom.Point();}).toThrow();
                expect(function() {new sGis.geom.Point(55);}).toThrow();
                expect(function() {new sGis.geom.Point('a', 'b');}).toThrow();
                expect(function() {new sGis.geom.Point(55, 37);}).toThrow();
                expect(function() {new sGis.geom.Point({x: 55, y: 37});}).toThrow();
                
                expect(function() {new sGis.geom.Point(55, 37, 45);}).toThrow();
                expect(function() {new sGis.geom.Point(55, 37, []);}).toThrow();
                
                var point1 = new sGis.geom.Point([55, 37]);
                
                expect(point1).toBeDefined();
            });


            it('should set the parameters correctly', function() {
                expect(function() {new sGis.geom.Point([55, 37], {color: 1});}).toThrow();
                expect(function() {new sGis.geom.Point([55, 37], {color: []});}).toThrow();
                expect(function() {new sGis.geom.Point([55, 37], {size: 'a'});}).toThrow();
                expect(function() {new sGis.geom.Point([55, 37], {size: [1]});}).toThrow();
                    
                var point1 = new sGis.geom.Point([55, 37], {color: 'green', size: 10});
                
                expect(point1.color).toBe('green');
                expect(point1.size).toBe(10);
            });
        });

        /*
        * sGis.geom.Polyline
        */
       
        describe('Polyline', function() {
            describe('creation', function() {
                it('should be created with default settings', function() {
                    expect(function() {new sGis.geom.Polyline(1, 2);}).toThrow();
                    expect(function() {new sGis.geom.Polyline([33,57]);}).toThrow();
                    expect(function() {new sGis.geom.Polyline([['a', 'b'], ['c', 'd']]);}).toThrow();
                    expect(function() {new sGis.geom.Polyline([[1, 2], ['a', 3]]);}).toThrow();

                    var polyline1 = new sGis.geom.Polyline([]);
                    expect(polyline1).toBeDefined;
                    expect(polyline1.color).toBe(sGis.geom.Polyline.prototype._color);
                    expect(polyline1.width).toBe(sGis.geom.Polyline.prototype._width);
                });

                it('should set the parameters correctly', function() {
                    expect(function() {new sGis.geom.Polyline([], {color: 2});}).toThrow();
                    expect(function() {new sGis.geom.Polyline([], {color: []});}).toThrow();
                    expect(function() {new sGis.geom.Polyline([], {color: {}});}).toThrow();
                    expect(function() {new sGis.geom.Polyline([], {width: 'abc'});}).toThrow();
                    expect(function() {new sGis.geom.Polyline([], {width: []});}).toThrow();
                    expect(function() {new sGis.geom.Polyline([], {width: {}});}).toThrow();

                    var polyline1 = new sGis.geom.Polyline([[10000, 20000], [20000, 3000000]], {color: 'green', width: 10});

                    expect(polyline1.color).toBe('green');
                    expect(polyline1.width).toBe(10);
                });

                it('should set coordinates in [[]] format', function() {
                    var coordinates = [[55, 37], [56,38]],
                        polyline = new sGis.geom.Polyline(coordinates);

                    expect(polyline.coordinates).toEqual([coordinates]);
                    expect(polyline.coordinates[0]).not.toBe(coordinates);

                    var polyline1 = new sGis.geom.Polyline([]);
                    expect(polyline1.coordinates).toEqual([[]]);
                });

                it('should set coordinates in [[[]]] format', function() {
                    var coordinates = [[[10, 10], [20, 20]], [[30, 30], [40, 40]]],
                        polyline = new sGis.geom.Polyline(coordinates);

                    expect(polyline.coordinates).toEqual(coordinates);
                    expect(polyline.coordinates).not.toBe(coordinates);
                });
            });
            
            describe('methods', function() {
                var polyline;
                
                beforeEach(function() {
                    polyline = new sGis.geom.Polyline([[[10, 10], [20, 20]], [[30, 30], [40, 40]]], {color: 'red', width: 10});
                });
                
                it('.getRing() should return the coordinate ring of specified index', function() {
                    var ring0 = polyline.getRing(0);
                    expect(ring0).toEqual([[10, 10], [20, 20]]);
                    expect(ring0).not.toBe(polyline.getRing(0));
                    expect(ring0[0]).not.toBe(polyline.getRing(0)[0]);
                    expect(polyline.getRing(1)).toEqual([[30, 30], [40, 40]]);
                    
                    expect(polyline.getRing(4)).toBe(undefined);
                });
                
                it('.getPoint() should return the coordinates of the specified point', function() {
                    var point00 = polyline.getPoint(0,0);
                    expect(point00).toEqual([10,10]);
                    expect(point00).not.toBe(polyline.getPoint(0,0));
                    expect(polyline.getPoint(1,1)).toEqual([40,40]);
                    
                    expect(polyline.getPoint(2, 0)).toBe(undefined);
                    expect(polyline.getPoint(0, 2)).toBe(undefined);
                });
                
                it('.addPoint() should add a point to the end of specified ring', function() {
                    expect(function() {polyline.addPoint();}).toThrow();
                    expect(function() {polyline.addPoint([]);}).toThrow();
                    expect(function() {polyline.addPoint(1,1);}).toThrow();
                    expect(function() {polyline.addPoint(['a', 'b']);}).toThrow();
                    expect(function() {polyline.addPoint({x: 1, y: 1});}).toThrow();
                    
                    var point = [10, 50];
                    polyline.addPoint(point, 1);
                    expect(polyline.getPoint(0, 2)).toBe(undefined);
                    expect(polyline.getRing(1).length).toBe(3);
                    expect(polyline.getPoint(1,2)).toEqual(point);
                    expect(polyline.getPoint(1,2)).not.toBe(point);
                });
                
                it('.addPoint() should add a point to the ring 0 if the ring is not specified', function() {
                    var point = [10, 50];
                    polyline.addPoint(point);
                    expect(polyline.getRing(0).length).toBe(3);
                    expect(polyline.getRing(1).length).toBe(2);
                    expect(polyline.getPoint(0,2)).toEqual(point);
                });
                
                it('.clone() should make a new polyline with same properties', function() {
                    var polyline1 = polyline.clone();
                    expect(polyline1.coordinates).toEqual(polyline.coordinates);
                    expect(polyline1.coordinates).not.toBe(polyline.coordinates);
                    expect(polyline1.color).toBe(polyline.color);
                    expect(polyline1.width).toBe(polyline.width);
                });
                
                it('.contains() should return true if the point is close to the polyline', function() {
                    expect(function() {polyline.contains();}).toThrow();
                    expect(function() {polyline.contains([]);}).toThrow();
                    expect(function() {polyline.contains(10, 20);}).not.toThrow();
                    expect(function() {polyline.contains([10, 20]);}).not.toThrow();
                    expect(function() {polyline.contains({x: 10, y: 20});}).not.toThrow();
                    expect(function() {polyline.contains(['a', 20]);}).toThrow();
                    expect(function() {polyline.contains([10, NaN]);}).toThrow();
                    
                    expect(polyline.contains(10, 20)).toBe(false);
                    expect(polyline.contains(10, 10)).not.toBe(false);
                    expect(polyline.contains([20, 20])).not.toBe(false);
                    expect(polyline.contains(25, 25)).toBe(false);
                    expect(polyline.contains({x: 35,y: 35})).not.toBe(false);
                    expect(polyline.contains(9, 9)).not.toBe(false);
                });
            });
        });

        /*
        * sGis.geom.Polygon
        */
        
        describe('Polygon', function() {
            describe('creation', function() {
                it('should be created with default settings', function() {
                    expect(function() {new sGis.geom.Polygon(1, 2);}).toThrow();
                    expect(function() {new sGis.geom.Polygon([33,57]);}).toThrow();
                    expect(function() {new sGis.geom.Polygon([['a', 'b'], ['c', 'd']]);}).toThrow();
                    expect(function() {new sGis.geom.Polygon([[1, 2], ['a', 3]]);}).toThrow();
                    expect(function() {new sGis.geom.Polygon([new sGis.Point(55, 37), new sGis.Point(55,37)]);}).toThrow();

                    var polygon1 = new sGis.geom.Polygon([]);
                    expect(polygon1).toBeDefined();
                    expect(polygon1.color).toBe(sGis.geom.Polygon.prototype._color);
                    expect(polygon1.width).toBe(sGis.geom.Polygon.prototype._width);
                    expect(polygon1.fillColor).toBe(sGis.geom.Polygon.prototype._fillColor);
                });

                it('should set the parameters correctly', function() {
                    expect(function() {new sGis.geom.Polygon([], {color: 2});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {color: []});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {color: {}});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {width: 'abc'});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {width: []});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {width: {}});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {fillColor: 2});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {fillColor: []});}).toThrow();
                    expect(function() {new sGis.geom.Polygon([], {fillColor: {}});}).toThrow();

                    var polygon1 = new sGis.geom.Polygon([[10000, 20000], [20000, 3000000]], {color: 'green', width: 10, fillColor: 'yellow'});

                    expect(polygon1.color).toBe('green');
                    expect(polygon1.width).toBe(10);
                    expect(polygon1.fillColor).toBe('yellow');
                });
            
                it('should set coordinates in [[]] format', function() {
                    var coordinates = [[55, 37], [56,38]],
                        polygon = new sGis.geom.Polygon(coordinates);

                    expect(polygon.coordinates).toEqual([coordinates]);
                    expect(polygon.coordinates[0]).not.toBe(coordinates);

                    var polygon1 = new sGis.geom.Polygon([]);
                    expect(polygon1.coordinates).toEqual([[]]);
                });

                it('should set coordinates in [[[]]] format', function() {
                    var coordinates = [[[10, 10], [20, 20]], [[30, 30], [40, 40]]],
                        polygon = new sGis.geom.Polygon(coordinates);

                    expect(polygon.coordinates).toEqual(coordinates);
                    expect(polygon.coordinates).not.toBe(coordinates);
                });
            });
            
            describe('methods', function() {
                var polygon;
                
                beforeEach(function() {
                    polygon = new sGis.geom.Polygon([[[100, 100], [200, 200], [100, 200]], [[300, 300], [400, 400], [300, 400]]], {color: 'red', width: 10, fill: 'blue'});
                });
                
                it('.getRing() should return the coordinate ring of specified index', function() {
                    var ring0 = polygon.getRing(0);
                    expect(ring0).toEqual([[100, 100], [200, 200], [100, 200]]);
                    expect(ring0).not.toBe(polygon.getRing(0));
                    expect(ring0[0]).not.toBe(polygon.getRing(0)[0]);
                    expect(polygon.getRing(1)).toEqual([[300, 300], [400, 400], [300, 400]]);
                    
                    expect(polygon.getRing(4)).toBe(undefined);
                });
                
                it('.getPoint() should return the coordinates of the specified point', function() {
                    var point00 = polygon.getPoint(0,0);
                    expect(point00).toEqual([100, 100]);
                    expect(point00).not.toBe(polygon.getPoint(0,0));
                    expect(polygon.getPoint(1,1)).toEqual([400, 400]);
                    
                    expect(polygon.getPoint(2, 0)).toBe(undefined);
                    expect(polygon.getPoint(0, 3)).toBe(undefined);
                });
                
                it('.addPoint() should add a point to the end of specified ring', function() {
                    expect(function() {polygon.addPoint();}).toThrow();
                    expect(function() {polygon.addPoint([]);}).toThrow();
                    expect(function() {polygon.addPoint(1,1);}).toThrow();
                    expect(function() {polygon.addPoint(['a', 'b']);}).toThrow();
                    expect(function() {polygon.addPoint({x: 1, y: 1});}).toThrow();
                    
                    var point = [10, 50];
                    polygon.addPoint(point, 1);
                    expect(polygon.getPoint(0, 3)).toBe(undefined);
                    expect(polygon.getRing(1).length).toBe(4);
                    expect(polygon.getPoint(1,3)).toEqual(point);
                    expect(polygon.getPoint(1,3)).not.toBe(point);
                });
                
                it('.addPoint() should add a point to the ring 0 if the ring is not specified', function() {
                    var point = [10, 50];
                    polygon.addPoint(point);
                    expect(polygon.getRing(0).length).toBe(4);
                    expect(polygon.getRing(1).length).toBe(3);
                    expect(polygon.getPoint(0,3)).toEqual(point);
                });
                
                it('.clone() should make a new polyline with same properties', function() {
                    var polygon1 = polygon.clone();
                    expect(polygon1.coordinates).toEqual(polygon.coordinates);
                    expect(polygon1.coordinates).not.toBe(polygon.coordinates);
                    expect(polygon1.color).toBe(polygon.color);
                    expect(polygon1.width).toBe(polygon.width);
                    expect(polygon1.fill).toBe(polygon.fill);
                });
                
                it('.contains() should return true if the point is close to the polygon', function() {
                    expect(function() {polygon.contains();}).toThrow();
                    expect(function() {polygon.contains([]);}).toThrow();
                    expect(function() {polygon.contains(10, 20);}).not.toThrow();
                    expect(function() {polygon.contains([10, 20]);}).not.toThrow();
                    expect(function() {polygon.contains({x: 10, y: 20});}).not.toThrow();
                    expect(function() {polygon.contains(['a', 20]);}).toThrow();
                    expect(function() {polygon.contains([10, NaN]);}).toThrow();
                    
                    expect(polygon.contains(100, 200)).not.toBe(false);
                    expect(polygon.contains(300, 300)).not.toBe(false);
                    expect(polygon.contains(250, 250)).toBe(false);
                    expect(polygon.contains(152, 152)).not.toBe(false);
                });
                
                it('.contains() should return true if the point is insed the polygon', function() {
                    expect(polygon.contains(170, 190)).not.toBe(false);
                    expect(polygon.contains(170, 130)).toBe(false);
                    
                    var polygon1 = new sGis.geom.Polygon([[[100, 100], [100, 200], [200, 200], [200, 100]], 
                                                          [[300, 100], [400, 100], [400, 200], [300, 200]],
                                                          [[100, 300], [200, 300], [200, 400], [100, 400]]]);
                                                      
                    expect(polygon1.contains(150, 150)).not.toBe(false);
                    expect(polygon1.contains(250, 150)).toBe(false);
                    expect(polygon1.contains(150, 250)).toBe(false);
                });
            });
        });
    });
});