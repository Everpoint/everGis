'use strict';

$(document).ready(function() {

    var polygon = new sGis.feature.Polygon([[100, 100], [200, 200], [150, 100]], {
        color: 'rgba(255, 0, 100, 1)',
        fillColor: 'rgba(255, 100, 0, 0.2)',
        width: 5,
        crs: sGis.CRS.moscowBessel,
        attributes: {
            FID: {
                title: 'FID',
                value: '1841',
                type: 'Strategis.Server.SpatialProcessor.Core.ObjectId',
                size: 0
            },
            NAME_OBJ: {
                title: 'NAME_OBJ',
                value: 'ROAD',
                type: 'System.String',
                size: 20
            },
            ID: {
                title: 'ID',
                value: '305',
                type: 'System.Double',
                size: 0
            }
        }
    }),
    
    polyline = new sGis.feature.Polyline([[100, 100], [200, 200], [150, 100]], {
        color: 'rgba(255, 0, 100, 1)',
        width: 5,
        crs: sGis.CRS.moscowBessel,
        attributes: {
            FID: {
                title: 'FID',
                value: 'Hello',
                type: 'Strategis.Server.SpatialProcessor.Core.ObjectId',
                size: 0
            },
            NAME_OBJ: {
                title: 'NAME_OBJ',
                value: 'LONG ROAD',
                type: 'System.String',
                size: 20
            },
            ID: {
                title: 'ID',
                value: '305',
                type: 'System.Double',
                size: 0
            }
        }
    }),
    
    point = new sGis.feature.Point([100, 100], {
        color: 'rgba(255, 0, 100, 1)',
        size: 10,
        crs: sGis.CRS.moscowBessel,
        attributes: {
            FID: {
                title: 'FID',
                value: 'Bye',
                type: 'Strategis.Server.SpatialProcessor.Core.ObjectId',
                size: 0
            },
            NAME_OBJ: {
                title: 'NAME_OBJ',
                value: 'SHORT ROAD',
                type: 'System.String',
                size: 20
            },
            ID: {
                title: 'ID',
                value: '305',
                type: 'System.Double',
                size: 0
            }
        }            
    });

    describe('Geometry xml serializer', function() {
        it('should serializer polygon correctly', function() {
            var text = sGis.spatialProcessor.serializeGeometry([polygon, polyline, point]);
            
            expect(text).toBeDefined();
        });
    });

});