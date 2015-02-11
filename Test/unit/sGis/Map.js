'use strict';

$(document).ready(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');

    /*
     * sGis.Map
     */

    describe('Map', function() {
        beforeEach(function() {
            $('#map').width(500).height(500);
        });

        afterEach(function() {
            $('#map').html('').width(0).height(0);;
        });
        
        describe('creation', function() {
            it('should be created with default parameters', function() {
                var map = new sGis.Map();

                expect(map).toBeDefined();
                expect(map.crs).toBe(sGis.Map.prototype._crs);
                expect(map.resolution).toBe(sGis.Map.prototype._resolution);
                expect(map.position).not.toBe(sGis.Map.prototype._position);
                expect(map.position.x).toBe(sGis.Map.prototype._position.x);
                expect(map.position.y).toBe(sGis.Map.prototype._position.y);
                expect(map.position.crs).toBe(sGis.Map.prototype._position.crs);
                expect(map.wrapper).toBe(null);
                expect(map.layerWrapper).toBe(undefined);
                expect(map.height).toBe(undefined);
                expect(map.width).toBe(undefined);
                expect(map.bbox).toBe(undefined);
                expect(map.layers).toEqual([]);
                expect(map.layers).not.toBe(map._layers);
            });
            
            it('should set the layers as specified in options', function() {
                var layer1 = new sGis.FeatureLayer(),
                    layer2 = new sGis.FeatureLayer(),
                    layers = [layer1, layer2],
                    map = new sGis.Map({layers: layers});
                    
                expect(map.layers).not.toBe(layers);
                expect(map.layers).toEqual(layers);
            });
            
            it('should throw an error if at least one layer in the list of layers is not a valid layer', function() {
                var layers = [
                    new sGis.FeatureLayer(),
                    new sGis.TileLayer('url'),
                    new sGis.ESRIDynamicLayer('url')
                ];
                
                expect(function() {new sGis.Map({layers: layers});}).not.toThrow();
                    
                layers.push('not a layer');
                expect(function() {new sGis.Map({layers: layers});}).toThrow();
            });
            
            it('should set the position to 0,0 if map crs cannot be converted to WGS', function() {
                var map = new sGis.Map({crs: sGis.CRS.plain});
                
                expect(map.position.x).toBe(0),
                expect(map.position.y).toBe(0),
                expect(map.position.crs).toBe(sGis.CRS.plain);
            });
        });
        
        describe('properties', function() {
            it ('getter only properties should throw exceptions', function() {
                var map = new sGis.Map(),
                    layerWrapper = map.layerWrapper,
                    height = map.height,
                    width = map.width,
                    bbox = map.bbox;
                    
                    expect(function() {map.layerWrapper = 'wrapper';}).toThrow();
                    expect(function() {map.height = 100;}).toThrow();
                    expect(function() {map.width = 200;}).toThrow();
                    expect(function() {map.bbox = new sGis.Bbox([33, 57], [44, 58]);}).toThrow();
                    expect(map.layerWrapper).toBe(layerWrapper);
                    expect(map.height).toBe(height);
                    expect(map.width).toBe(width);
                    expect(map.bbox).toBe(bbox);
            });
            
            it('getter only properties should retrun correct values', function() {
                var map = new sGis.Map({wrapper: 'map'});
                
                expect(map.eventWrapper).not.toBe(null);
                expect(map.layerWrapper).not.toBe(null);
                
                expect(map.height).toBe(500);
                expect(map.width).toBe(500);
                
                expect(map.bbox).not.toBe(null);
            });
            
            it('.wrapper should set the wrapper of the map', function() {
                var map = new sGis.Map();
                
                map.wrapper = 'map';
                expect(map.wrapper).not.toBe(null);
                expect(map.eventWrapper).not.toBe(null);
                expect(map.layerWrapper).not.toBe(null);
                expect(map.bbox).not.toBe(null);
                expect(map.width).toBe(500);
                expect(map.height).toBe(500);
                expect(map._painter instanceof utils.Painter).toBeTruthy();
            });
            
            it('.wrapper should remove the map from the old wrapper and add to the new one', function() {
                var $wrapper = $('<div id="map1" style="height: 400px; width: 400px;"></div>');
                $(document.body).append($wrapper);
                
                var map = new sGis.Map({wrapper: 'map'}),
                    layerWrapper = map.layerWrapper,
                    painter = map._painter;
                    
                map.wrapper = 'map1';
                
                expect(map.height).toBe(400);
                expect(map.width).toBe(400);
                expect(map.layerWrapper).not.toBe(layerWrapper);
                expect(map._painter).not.toBe(painter);
                expect($('#map').html()).toBe('');
                
                $wrapper.remove();
            });
            
            it('.wrapper should remove the map from the DOM if the value set to null', function() {
                var html = document.getElementById('map').innerHTML,
                    map = new sGis.Map({wrapper: 'map'});
                    
                map.wrapper = null;
                expect(map.wrapper).toBe(null);
                expect(map.layerWrapper).toBe(undefined);
                expect(map.width).toBe(undefined);
                expect(map.height).toBe(undefined);
                expect(map._painter).toBe(undefined);
                
                expect(document.getElementById('map').innerHTML).toBe(html);
            });
            
            it('.crs should set the crs of the map or throw exception', function() {
                var map = new sGis.Map(),
                    tileLayer = new sGis.TileLayer('url', {crs: sGis.CRS.ellipticalMercator});
                    
                expect(function() {map.crs = {};}).toThrow();
                
                map.addLayer(tileLayer);
                expect(map.crs).toBe(sGis.Map.prototype._crs);
                
                map.crs = sGis.CRS.ellipticalMercator;
                expect(map.crs).toBe(sGis.CRS.ellipticalMercator);
            });
            
            it('.crs should set the position of map to (0, 0) if current position cannot be projected to the new crs', function() {
                var map = new sGis.Map();
                map.crs = sGis.CRS.plain;
                
                expect(map.position).toEqual(new sGis.Point(0, 0, sGis.CRS.plain));
            });
            
            it('.position should return the central point of the map in map crs', function() {
                var map = new sGis.Map();
                expect(map.position.crs).toBe(sGis.Map.prototype._crs);
                
                map.crs = sGis.CRS.ellipticalMercator;
                expect(map.position.crs).toBe(sGis.CRS.ellipticalMercator);
                
                var map2 = new sGis.Map({wrapper: 'map'});
                expect(map2.position).toEqual(sGis.Map.prototype._position);
            });
            
            it('.position should set set the central point of the map, and reproject it if necessary', function() {
                var map = new sGis.Map(),
                    point = new sGis.Point(10000, 10000, sGis.CRS.webMercator);
                    
                map.position = point;
                expect(map.position).not.toBe(point);
                expect(map.position.x).toBe(10000);
                expect(map.position.y).toBe(10000);
                
                var point2 = new sGis.Point(10, 10, sGis.CRS.geo),
                    point2Projected = point2.projectTo(sGis.CRS.webMercator);
                map.position = point2;
                
                expect(map.position.x).toBe(point2Projected.x);
                expect(map.position.y).toBe(point2Projected.y);
                expect(map.position.crs).toBe(sGis.CRS.webMercator);
                
                var map2 = new sGis.Map({wrapper: 'map', crs: sGis.CRS.ellipticalMercator}),
                    pointProjected = point.projectTo(sGis.CRS.ellipticalMercator);
                map2.position = point;
                
                expect(map2.position.x).toBe(pointProjected.x);
                expect(Math.abs(map2.position.y - pointProjected.y)).toBeLessThan(0.000001);
            });
            
            it('.position should throw error if the specified position cannot be reprojected into the map crs', function() {
                var map = new sGis.Map(),
                    point = new sGis.Point(10, 10, sGis.CRS.plain);
                    
                expect(function() {map.position = point;}).toThrow();
                expect(map.position).toEqual(sGis.Map.prototype._position);
                
                var map = new sGis.Map({crs: sGis.CRS.plain}),
                    point2 = new sGis.Point(10, 10);
                map.position = point;
                expect(map.position).toEqual(point);
                expect(function() {map.position = point2;}).toThrow();
            });
            
            it('.resolution should set the resolution with base point in the center of the map, or throw an exception in case of incorrect parameters', function() {
                var map = new sGis.Map();

                expect(function() {map.resolution = undefined;}).toThrow();
                expect(function() {map.resolution = 0;}).toThrow();
                expect(function() {map.resolution = -1;}).toThrow();
                expect(function() {map.resolution = NaN;}).toThrow();
                expect(function() {map.resolution = [1];}).toThrow();
                expect(function() {map.resolution = {};}).toThrow();
                
                expect(map.resolution).toBe(sGis.Map.prototype._resolution);
                map.resolution = 200;
                expect(map.resolution).toBe(200);
            });
            
            it('.bbox should return undefined if no wrapper is set for the map', function() {
                var map = new sGis.Map();
                
                expect(map.bbox).toBe(undefined);
                
                var map = new sGis.Map({wrapper: 'map'});
                expect(map.bbox).toBeDefined();
                
                map.wrapper = null;
                
                expect(map.bbox).toBe(undefined);
            });
            
            it('.bbox should be returned in the crs of the map', function() {
                var map = new sGis.Map({wrapper: 'map'}),
                    bbox = map.bbox;
                
                expect(bbox instanceof sGis.Bbox).toBeTruthy();
                expect(bbox.p[0].crs).toBe(sGis.Map.prototype._crs);
                expect(bbox).not.toBe(map.bbox);
                expect(bbox).toEqual(map.bbox);
                
                map.crs = sGis.CRS.ellipticalMercator;
                expect(map.bbox).not.toEqual(bbox);
                expect(map.bbox.p[0].crs).toBe(sGis.CRS.ellipticalMercator);
                
                var map = new sGis.Map({wrapper: 'map', crs: sGis.CRS.plain});
                expect(map.bbox.p[0].crs).toBe(sGis.CRS.plain);
            });
            
            it('.bbox should change if the position is changed', function() {
                var map = new sGis.Map({wrapper: 'map'}),
                    bbox = map.bbox;
                    
                map.position = new sGis.Point(10000, 10000, sGis.CRS.webMercator);
                expect(map.bbox).not.toEqual(bbox);
                expect(map.bbox.p[0].x).toBeLessThan(10000);
                expect(map.bbox.p[1].x).toBeGreaterThan(10000);
                expect(map.bbox.p[0].y).toBeLessThan(10000);
                expect(map.bbox.p[1].y).toBeGreaterThan(10000);
                
                var bbox2 = map.bbox;
                
                map.crs = sGis.CRS.plain;
                expect(map.bbox.p[0].crs).toBe(sGis.CRS.plain);
                expect(map.bbox.p[0]).not.toEqual(bbox2.p[0]);
                expect(map.bbox.p[0].x).toBeLessThan(0);
                expect(map.bbox.p[1].x).toBeGreaterThan(0);
                expect(map.bbox.p[0].y).toBeLessThan(0);
                expect(map.bbox.p[1].y).toBeGreaterThan(0);
            });
            
            it('.bbox should change if the resolution is changed', function() {
                var map = new sGis.Map({wrapper: 'map'}),
                    bbox = map.bbox;
                    
                map.resolution *= 2;
                expect(map.bbox).not.toEqual(bbox);
            });
            
            it('.layers should return the list of the layers on the map', function() {
                var map = new sGis.Map(),
                    tileLayer = new sGis.TileLayer('url'),
                    featureLayer = new sGis.FeatureLayer();
                
                expect(map.layers).toEqual([]);
                
                map.addLayer(tileLayer);
                expect(map.layers).toEqual([tileLayer]);
                
                map.addLayer(featureLayer);
                expect(map.layers).toEqual([tileLayer, featureLayer]);
                
                var list = [tileLayer, featureLayer];
                map = new sGis.Map({layers: list});
                
                expect(map.layers).not.toBe(list);
                expect(map.layers).toEqual(list);
            });
        });
        
        describe('methods', function() {
            it('.addLayer() should add the layer and fire event, and throw exceptions in case of incorrect parameters', function() {
                var map = new sGis.Map(),
                   layer1 = new sGis.FeatureLayer(),
                   layer2 = new sGis.FeatureLayer(),
                   fired = false,
                   eventLayer = null;
                    
                expect(function() {map.addLayer();}).toThrow();
                expect(function() {map.addLayer(1);}).toThrow();
                expect(function() {map.addLayer([]);}).toThrow();
                expect(function() {map.addLayer('a');}).toThrow();
                expect(function() {map.addLayer({});}).toThrow();
                    
                map.addListner('layerAdd', function(sGisEvent) {
                    fired = true;
                    eventLayer = sGisEvent.layer;
                });
                
                expect(map.layers.length).toBe(0);
                map.addLayer(layer1);
                expect(map.layers.length).toBe(1);
                expect(map.layers[0]).toBe(layer1);
                expect(fired).toBeTruthy();
                expect(eventLayer).toBe(layer1);
                
                map.addLayer(layer2);
                expect(map.layers.length).toBe(2);
                expect(map.layers[1]).toBe(layer2);
            });
            
            it('.addLayer() should throw an error if the layer is already on the map', function() {
                var map = new sGis.Map(),
                    layer = new sGis.FeatureLayer();
                    
                map.addLayer(layer);
                expect(function() {map.addLayer(layer);}).toThrow();
                expect(map.layers.length).toBe(1);
            });
            
            it('.removeLayer() should remove the layer and fire event, and throw exception if the layer is not found', function() {
                var layer1 = new sGis.FeatureLayer(),
                    layer2 = new sGis.FeatureLayer(),
                    layer3 = new sGis.FeatureLayer(),
                    map = new sGis.Map({layers: [layer1, layer2]}),
                    fired = false,
                    eventLayer = null;
                
                expect(function() {map.removeLayer();}).toThrow();
                expect(function() {map.removeLayer(1);}).toThrow();
                expect(function() {map.removeLayer('a');}).toThrow();
                expect(function() {map.removeLayer({});}).toThrow();
                expect(function() {map.removeLayer([]);}).toThrow();
                expect(function() {map.removeLayer(layer3);}).toThrow();

                expect(map.layers).toEqual([layer1, layer2]);
                map.addListner('layerRemove', function(sGisEvent) {
                    fired = true;
                    eventLayer = sGisEvent.layer;
                });
                
                map.removeLayer(layer1);
                expect(map.layers.length).toBe(1);
                expect(map.layers[0]).toBe(layer2);
                expect(fired).toBeTruthy();
                expect(eventLayer).toBe(layer1);
                
                map.removeLayer(layer2);
                expect(map.layers.length).toBe(0);
            });
            
            it('.getLayerIndex() should return the index of the layer in the layer list', function() {
                var layer1 = new sGis.FeatureLayer({name: 'layer1'}),
                    layer2 = new sGis.FeatureLayer({name: 'layer2'}),
                    layer3 = new sGis.TileLayer('url', {name: 'layer3'}),
                    layer4 = new sGis.ESRIDynamicLayer('url', {name: 'layer4'}),
                    map = new sGis.Map({layers: [layer1, layer2, layer3, layer4]});
                    
                expect(map.getLayerIndex(layer1)).toBe(0);
                expect(map.getLayerIndex(layer2)).toBe(1);
                expect(map.getLayerIndex(layer3)).toBe(2);
                expect(map.getLayerIndex(layer4)).toBe(3);
            });
            
            it('.moveLayerToIndex() should change the order of the layers and fire the event', function() {
                var layer1 = new sGis.FeatureLayer({name: 'layer1'}),
                    layer2 = new sGis.FeatureLayer({name: 'layer2'}),
                    layer3 = new sGis.TileLayer('url', {name: 'layer3'}),
                    layer4 = new sGis.ESRIDynamicLayer('url', {name: 'layer4'}),
                    map = new sGis.Map({layers: [layer1, layer2, layer3, layer4]}),
                    firedNo = 0;
                    
                map.addListner('layerOrderChange', function() {
                    firedNo++;
                });
                
                expect(function() {map.moveLayerToIndex();}).toThrow();
                expect(function() {map.moveLayerToIndex('not a layer');}).toThrow();
                expect(function() {map.moveLayerToIndex(layer1, 'not a number');}).toThrow();
                expect(function() {map.moveLayerToIndex(layer1, 1.5);}).toThrow();
                
                map.moveLayerToIndex(layer1, 0);
                expect(map.layers).toEqual([layer1, layer2, layer3, layer4]);
                map.moveLayerToIndex(layer3, 2);
                expect(map.layers).toEqual([layer1, layer2, layer3, layer4]);
                
                map.moveLayerToIndex(layer2, 2);
                expect(map.layers).toEqual([layer1, layer3, layer2, layer4]);
                
                map.moveLayerToIndex(layer4, 0);
                expect(map.layers).toEqual([layer4, layer1, layer3, layer2]);
                
                map.moveLayerToIndex(layer3, 5);
                expect(map.layers).toEqual([layer4, layer1, layer2, layer3]);
                
                map.moveLayerToIndex(layer1, 0);
                expect(map.layers).toEqual([layer1, layer4, layer2, layer3]);
                
                expect(firedNo).toBe(6);
            });
            
            it('.moveLayerToIndex() should count negative indexes from the end of the list', function() {
                var layer1 = new sGis.FeatureLayer({name: 'layer1'}),
                    layer2 = new sGis.FeatureLayer({name: 'layer2'}),
                    layer3 = new sGis.TileLayer('url', {name: 'layer3'}),
                    layer4 = new sGis.ESRIDynamicLayer('url', {name: 'layer4'}),
                    map = new sGis.Map({layers: [layer1, layer2, layer3, layer4]});
                    
                map.moveLayerToIndex(layer4, -1);
                expect(map.layers).toEqual([layer1, layer2, layer3, layer4]);
                
                map.moveLayerToIndex(layer4, -2);
                expect(map.layers).toEqual([layer1, layer2, layer4, layer3]);

                map.moveLayerToIndex(layer1, -4);
                expect(map.layers).toEqual([layer1, layer2, layer4, layer3]);
                
                map.moveLayerToIndex(layer2, -7);
                expect(map.layers).toEqual([layer2, layer1, layer4, layer3]);
            });
            
            it('.moveLayerToIndex() should add the layer to the map if it was not there and should fire the layerAdd event', function() {
                var map = new sGis.Map(),
                    layer = new sGis.FeatureLayer(),
                    addFired = false,
                    moveFired = false;
                    
                map.addListner('layerAdd', function() {
                    addFired = true;
                });
                map.addListner('layerOrderChange', function() {
                    moveFired = true;
                });
                
                map.moveLayerToIndex(layer, 2);
                expect(map.layers).toEqual([layer]);
                expect(addFired).toBeTruthy();
                expect(moveFired).toBeTruthy();
            });
        });
    });
});