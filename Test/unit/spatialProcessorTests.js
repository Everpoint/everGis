'use strict';

$(document).ready(function() {

    $(document.body).html('<div id="map" style="width: 500px; height: 500px;"></div>');
    
    describe('Spatial Processor', function() {
        var folder,
            sessionId = 'AfdvXUNI085MlypGFNdTDnvS3DhIYkmURpIolenNJr93Krty795FXU2TMmB4FFhlhQAAAAAAAAAAAAAAAAAAAA==',
            mskDescription = 'PROJCS["Moscow_bessel",GEOGCS["GCS_Bessel_Moscow",DATUM["D_Bessel_Moscow",SPHEROID["Bessel_Moscow",6377397.0,299.15]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",37.5],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",55.66666666666666],UNIT["Meter",1.0]]';
            
        beforeEach(function() {
            $('#map').width(500).height(500);
            folder = new sGis.mapItem.Folder();
        
            spyOn(utils, 'ajax').andCallFake(function(params) {
                var response = '',
                    url = params.url.replace(/&ts=.+/, '');
                switch (url) {
                    case 'http://jasmineSP/':
                        response = '';
                        break;
                    case 'http://jasminSP/Strategis.JsClient/ApiLogin.aspx?authId=505741D8-C667-440D-9CA0-32FD1FF6AF88&userName=login&password=password':
                        response = '{"token":"' + sessionId + '"}';
                        break;
                    case 'http://jasminSP/MapItemStates/?_sb=sessionId':
                        response = 'true';
                        break;
                    case 'http://jasminSP/MapItemStates/?_sb=' + encodeURIComponent(sessionId):
                        response = 'true';
                        break;
                    case 'http://jasminSP/service1/MapServer/PackedInfo?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"ServiceInfo":{\
                                    "layers":[{"id":0,"name":"Станции метро г. Москва","parentLayerId":-1,"defaultVisibility":true,"minScale":500000.0,"maxScale":0.0},{"id":1,"name":"Автодороги г. Москва","parentLayerId":-1,"defaultVisibility":true,"minScale":250000.0,"maxScale":0.0},{"id":2,"name":"Границы Районов г. Москва","parentLayerId":-1,"defaultVisibility":true,"minScale":0.0,"maxScale":0.0}],\
                                    "spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"},\
                                    "initialExtent":{"xmin":-18539.710958705764,"ymin":-6557.5561209500738,"xmax":59475.633771015506,"ymax":43681.590350313454,"spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"}},\
                                    "fullExtent":{"xmin":-47450.32207380738,"ymin":-60395.668985333563,"xmax":30605.689107912429,"ymax":40714.733577120751,"spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"}},\
                                    "currentVersion":10.0,"fullName":"SpatialProcessor:evergisjs_msk_test/MapServer","mapName":"Layers","singleFusedMapCache":false,"units":"esriMeters","supportedImageFormatTypes":"PNG32,PNG24,PNG","capabilities":"Map, legend, PackedInfo"},\
                                    "LayersInfo":[{"LayerInfo":{"defaultVisibility":true,"currentVersion":10.0,"fullName":"SpatialProcessor:evergisjs_msk_test/MapServer/0","id":0,"name":"Станции метро г. Москва","type":"MapLayer","definitionExpression":"","geometryType":"esriGeometryPoint","subLayers":[],"minScale":500000.0,"maxScale":0.0,"drawingInfo":{"renderer":{"type":"simple","symbol":{"type":"esriPMS","imageData":"iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAhJJREFUOI2tlDtok1EUx383jfn6aU3T+ICkhIgOgUB90jhYUVzawccWGkLsYCniKA4qCD4oTi4BQUMHJaZoQTspdFUySKkIPuog0g5JKtpayPPma3NdGpMvaYKCf7jDveeeH+ece8618p9kbWsdTdmdhsWfX1NdTsVSZtL1GUTl70HhlB/EbYqcW0FZATICiGR+UEnfZ9V2j5c7c+1B4XQEmABsTbYKu4CbmqMcksOZ0zx1fd0UpA2nhyQ8AiztMpbgo0PNEEwFmOpdNoNGFjrlGrEqJHZG50SgE4fdSja3TvJdibHpArJWob1o4g5wyQwybCEEHoC3V7oJHNz6x7R7h5V9Xo1Dfhv946s1WIVRgqkbTPUu10CCQYDYWd0EqVefTyceMggm8tWjLWjiJPC8BlJ4EXDqqN6uPAwc0aEGgnXhNacmMAB6ujvaghz2BvuGX/2rzQPH84UKTkdrUL5o7kcN9UXWgzQlXkihxmY/lPC4m1uoqvefSvXbn1LXX5sikpOuGcLp5OVnhWOH/Rp7PFoTJL1kcPWJqaHHmeiRjakBnF8sq9mhW7+c0ZEu+vfr2LdbyOUrzH0scj2eYy6nqndfkXBFqxszKOH+RiQzsFBS04MPsz7ItsrwMdbyxfoBbp61uGteXsv0scgFhAoDB4BtwHcQbzRUVCbcyUa3zaf/rssAHmwsk2SLENv/R/+g3xBPq12rGknXAAAAAElFTkSuQmCC","contentType":"image/png","angle":0.0,"width":13.0,"height":13.0,"xoffset":0.0,"yoffset":0.0,"xscale":0.0,"yscale":0.0,"outline":{"type":"esriSLS","style":"esriSLSNull","width":0,"color":[0,0,0,0]}},"label":""}},"extent":{"xmin":-9100.6960000004619,"ymin":-14375.295299999416,"xmax":23114.049200000241,"ymax":25843.338400000706,"spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"}},"fields":[{"name":"OBJECTID","alias":"OBJECTID","editable":false,"nullable":false,"type":"esriFieldTypeOID"},{"name":"NAME","alias":"Наименование","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"LABEL","alias":"Подпись","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"ADDRESS","alias":"Адрес","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"NAMEOFSTATION","alias":"Станция метрополитена","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"LINE","alias":"Линия","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"MODEONEVENDAYS","alias":"Режим работы по чётным дням","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"MODEONODDDAYS","alias":"Режим работы по нечётным дням","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"FULLFEATUREDBPAAMOUNT","alias":"Количество полнофункциональных БПА (все типы билетов)","editable":false,"nullable":false,"type":"esriFieldTypeInteger"},{"name":"LITTLEFUNCTIONALBPAAMOUNT","alias":"Количество малофункциональных БПА (билеты на 1 и 2 поездки)","editable":false,"nullable":false,"type":"esriFieldTypeInteger"},{"name":"BPAAMOUNT","alias":"Общее количество БПА","editable":false,"nullable":false,"type":"esriFieldTypeInteger"},{"name":"REPAIROFESCALATORS","alias":"Ремонт эскалаторов","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"MODDATE","alias":"ModDate","editable":false,"nullable":false,"type":"esriFieldTypeDate"}],"capabilities":"Query","displayField":"NAME","storageId":"36c828ec-9bf7-44ac-b548-4421b84af74e","objectIdField":"OBJECTID"}},{"LayerInfo":{"defaultVisibility":true,"currentVersion":10.0,"fullName":"SpatialProcessor:evergisjs_msk_test/MapServer/1","id":1,"name":"Автодороги г. Москва","type":"MapLayer","definitionExpression":"","geometryType":"esriGeometryPolyline","subLayers":[],"minScale":250000.0,"maxScale":0.0,"drawingInfo":{"renderer":{"type":"simple","symbol":{"type":"esriSLS","style":"esriSLSSolid","width":1,"color":[250,52,17,255]},"label":""}},"extent":{"xmin":-47450.32207380738,"ymin":-60395.668985333563,"xmax":30605.689107912429,"ymax":40714.733577120751,"spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"}},"fields":[{"name":"OBJECTID_1","alias":"OBJECTID_1","editable":false,"nullable":false,"type":"esriFieldTypeOID"},{"name":"KATEGOR","alias":"Номер категории","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"TEXT_","alias":"Название","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"SHAPE_Length","alias":"SHAPE_Length","editable":false,"nullable":false,"type":"esriFieldTypeDouble"}],"capabilities":"Query","displayField":"TEXT_","storageId":"21586f25-459a-4204-882d-b7d11fba660f","objectIdField":"OBJECTID_1"}},{"LayerInfo":{"defaultVisibility":true,"currentVersion":10.0,"fullName":"SpatialProcessor:evergisjs_msk_test/MapServer/2","id":2,"name":"Границы Районов г. Москва","type":"MapLayer","definitionExpression":"","geometryType":"esriGeometryPolygon","subLayers":[],"minScale":0.0,"maxScale":0.0,"drawingInfo":{"renderer":{"type":"simple","symbol":{"type":"esriSFS","style":"esriSFSSolid","color":[0,0,0,0],"outline":{"type":"esriSLS","style":"esriSLSSolid","width":2,"color":[168,0,132,255]}},"label":""}},"extent":{"xmin":-38345.80999999959,"ymin":-19556.443399999291,"xmax":29490.6763000004,"ymax":39483.140599999577,"spatialReference":{"wkt":"PROJCS[\\"Moscow_bessel\\",GEOGCS[\\"GCS_Bessel_Moscow\\",DATUM[\\"D_Bessel_Moscow\\",SPHEROID[\\"Bessel_Moscow\\",6377397.0,299.15]],PRIMEM[\\"Greenwich\\",0.0],UNIT[\\"Degree\\",0.0174532925199433]],PROJECTION[\\"Transverse_Mercator\\"],PARAMETER[\\"False_Easting\\",0.0],PARAMETER[\\"False_Northing\\",0.0],PARAMETER[\\"Central_Meridian\\",37.5],PARAMETER[\\"Scale_Factor\\",1.0],PARAMETER[\\"Latitude_Of_Origin\\",55.66666666666666],UNIT[\\"Meter\\",1.0]]"}},"fields":[{"name":"OBJECTID","alias":"OBJECTID","editable":false,"nullable":false,"type":"esriFieldTypeOID"},{"name":"NAME","alias":"Название объекта","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"NAMEAO","alias":"Название АО","editable":false,"nullable":false,"type":"esriFieldTypeString"},{"name":"SHAPE_Length","alias":"SHAPE_Length","editable":false,"nullable":false,"type":"esriFieldTypeDouble"},{"name":"SHAPE_Area","alias":"SHAPE_Area","editable":false,"nullable":false,"type":"esriFieldTypeDouble"}],"capabilities":"Query","displayField":"NAME","storageId":"3afbcd93-f332-42db-bb7e-d3aa0802e3c7","objectIdField":"OBJECTID"}}]}';
                        break;
                    case 'http://jasminSP/service2/MapServer/PackedInfo?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"ServiceInfo":{"layers":[],"spatialReference":{},"initialExtent":{"xmin":0.0,"ymin":0.0,"xmax":0.0,"ymax":0.0,"spatialReference":{}},"fullExtent":{"xmin":0.0,"ymin":0.0,"xmax":0.0,"ymax":0.0,"spatialReference":{}},"currentVersion":10.0,"fullName":"SpatialProcessor:dit/MapServer","mapName":"dit","singleFusedMapCache":false,"units":"esriMeters","supportedImageFormatTypes":"PNG32,PNG24,PNG","capabilities":"legend, PackedInfo"},"LayersInfo":[]}';
                        break;
                    case 'http://jasminSP/service3/MapServer/PackedInfo?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"ServiceInfo":{"layers":[],"spatialReference":{"wkid":102100},"initialExtent":{"xmin":-38030386.2798317,"ymin":-38030386.2798317,"xmax":38030386.2798317,"ymax":38030386.2798317,"spatialReference":{}},"fullExtent":{"xmin":-38030386.2798317,"ymin":-38030386.2798317,"xmax":38030386.2798317,"ymax":38030386.2798317,"spatialReference":{}},"currentVersion":10.0,"fullName":"SpatialProcessor:osm/MapServer","mapName":"osm","singleFusedMapCache":true,"tileInfo":{"rows":256,"cols":256,"dpi":96,"format":"PNG","origin":{"x":-20037508.0342787,"y":20037508.0342787},"lods":[{"level":0,"resolution":156543.033928,"scale":591657527.591555},{"level":1,"resolution":78271.516964,"scale":295828763.7957775},{"level":2,"resolution":39135.758482,"scale":147914381.89788875},{"level":3,"resolution":19567.879241,"scale":73957190.948944375},{"level":4,"resolution":9783.9396205,"scale":36978595.474472187},{"level":5,"resolution":4891.96981025,"scale":18489297.737236094},{"level":6,"resolution":2445.984905125,"scale":9244648.8686180469},{"level":7,"resolution":1222.9924525625,"scale":4622324.4343090234},{"level":8,"resolution":611.49622628125,"scale":2311162.2171545117},{"level":9,"resolution":305.748113140625,"scale":1155581.1085772559},{"level":10,"resolution":152.87405657031249,"scale":577790.55428862793},{"level":11,"resolution":76.437028285156245,"scale":288895.27714431396},{"level":12,"resolution":38.218514142578123,"scale":144447.63857215698},{"level":13,"resolution":19.109257071289061,"scale":72223.819286078491},{"level":14,"resolution":9.55462853564453,"scale":36111.909643039246},{"level":15,"resolution":4.7773142678222653,"scale":18055.954821519623},{"level":16,"resolution":2.3886571339111327,"scale":9027.9774107598114},{"level":17,"resolution":1.1943285669555663,"scale":4513.9887053799057},{"level":18,"resolution":0.59716428347778316,"scale":2256.9943526899528}]},"units":"esriMeters","copyrights":[{"IsClickable":false,"MaxHeight":0.0,"MaxWidth":0.0,"HorizontalAlignment":0,"VerticalAlignment":1,"Text":"Картографические данные © Участники OpenStreetMap, CC-BY-SA","FontColor":4278190080,"FontName":"Arial","FontSize":12.0,"IsBold":false,"IsItalic":false,"IsUnderline":false,"Images":[]}],"supportedImageFormatTypes":"PNG32,PNG24,PNG","capabilities":"Map, legend, PackedInfo, tile"},"LayersInfo":[]}';
                        break;
                    case 'http://jasminSP/service1/MapServer/legend?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"layers":[{"layerId":0,"layerName":"Станции метро г. Москва","layerType":"MapLayer","minScale":500000.0,"maxScale":0.0,"legend":[{"id":0,"label":"","imageData":"iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAhhJREFUOI291EtoE1EUgOH/tmOmozVN4wMmEiK6CATqk8aFFcVNu/CxCw0hdmEp4lJcqCD4oLhyExA0dKHEFBW0K4VulSykVAQfdSHSLpJUfBXynKTNddMxSWdSqhQPzGLm3PNx7nDPVVjnUP4/OJx2uqttgcKi7HRL5rPj+kcQtb8HI+kAiBuUOP0TqQBkBRDNfqOWucOC4zbPt+bXBkYyUWAMcFhyNbYB11RXJWwMZk/wSP+8KqgOZgYMuA+0teweMMBPu5wklA7yZMcPe3BotsNYJG5i8ZMaR4MduJwKufwSqTdlRiaKGPU/uAtV3ATO24NVRxiBF+D1xS6C+zb+SW3forDbp7I/4KB3dKGO1hgmlL5qdtkMCvoB4qe0JqwxevwaiXCVULJgftqAKo4BT62gxIeA44c0W8yMvoMa1EFYEj77LQuqAN1d7auCLueK/HKdFYQZ4EihWMPtag0WSs3nWkV+MuxAVYpnhpAjU+/KeD3WI2jG2w/lxtfvhqa9tO3QGNcniWRSFx4XDx8IqOz0qhYsM1/l0sOmARllrNts0HZSzsxV5NTA9V/u2FAnvXs0nJvbyBdqTL8vcSWRZzovzbUvSOqxxmIrmPR8IZrtmy3Lif57OT/kWu38AUrl3MqLwn6WE/qMcTnbwxxnETIC7AU2AV9BvFKRMSPpSdmVtr5tbulV4O7y0xSGdfUawH+MdQd/A52Lq2U6xB3cAAAAAElFTkSuQmCC","contentType":"image/png"}]},{"layerId":1,"layerName":"Автодороги г. Москва","layerType":"MapLayer","minScale":250000.0,"maxScale":0.0,"legend":[{"id":0,"label":"","imageData":"iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADNJREFUOI1jYaAyYBk1cNTAwWTgL2P2/5QYxHb2JyOKgdQCcANhNlDNQGqBUQNHDSQDAABtxwYe2RyxLgAAAABJRU5ErkJggg==","contentType":"image/png"}]},{"layerId":2,"layerName":"Границы Районов г. Москва","layerType":"MapLayer","minScale":0.0,"maxScale":0.0,"legend":[{"id":0,"label":"","imageData":"iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAENJREFUOI1jYaAyYGFgYGBYwdD6nxqGRTBUM7JQwyBkgGJgBEM1IzmGIPuQti4cNXDUwFEDh4eB1CgXaeNCcstBbAAAdnAJUWlTsMwAAAAASUVORK5CYII=","contentType":"image/png"}]}]}';
                        break;
                    case 'http://jasminSP/service2/MapServer/legend?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"layers":[]}';
                        break;
                    case 'http://jasminSP/service3/MapServer/legend?f=json&_sb=' +encodeURIComponent(sessionId):
                        response = '{"layers":[]}';
                        break;
                    default:
                        console.log(url);
                }
                params.success(response);
            });
        });

        afterEach(function() {
            $('#map').html('').width(0).height(0);;
        });
        

        describe('Connector', function() {
            describe('creation', function() {
                it('should throw in case of incorrect parameters', function() {
                    expect(function() {var connector = new sGis.spatialProcessor.Connector();}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector(1);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector([]);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector({});}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/');}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', 1);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', 'not a mapItem');}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', []);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', {});}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder, 1);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder, []);}).toThrow();
                    expect(function() {var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder, {});}).toThrow();
                });
                
                it('should initialize session with specified login and password', function() {
                    var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder, 'login', 'password');
                    expect(connector.sessionId).toBe(encodeURIComponent(sessionId));
                });
                
                it('should use provided session id if password is not specified', function() {
                    var connector = new sGis.spatialProcessor.Connector('http://jasminSP/', folder, 'sessionId');
                    expect(connector.sessionId).toBe('sessionId');
                });
            });
        });
        
        
        describe('sGis.SpatialProcessor', function() {
            describe('creation', function() {
                it('should throw in case of incorrect parameters', function() {
                    expect(function() {var sp = new sGis.SpatialProcessor();}).toThrow();
                    expect(function() {var sp = new sGis.SpatialProcessor({url: 'http://jasminSP/', login: 'login'});}).toThrow();
                });
                
                it('should initialize Connector with provided login and passowrd', function() {
                    var sp = new sGis.SpatialProcessor({
                        url: 'http://jasminSP/', login: 'login', password: 'password'
                    });
                    
                    expect(sp.connector.sessionId).toBe(encodeURIComponent(sessionId));
                });
                
                it('should initialize Connector with provided sessionId', function() {
                    var sp = new sGis.SpatialProcessor({
                        url: 'http://jasminSP/', sessionId: 'sessionId'
                    });
                    
                    expect(sp.connector.sessionId).toBe('sessionId');
                });
                
                it('should initialize the specified Map Services', function() {
                    var sp = new sGis.SpatialProcessor({
                        url: 'http://jasminSP/', sessionId: sessionId,
                        services: ['service1', 'service2', 'service3']
                    });
                    
                    expect(sp.service.service1.initialized).toBe(true);
                    expect(sp.service.service2.initialized).toBe(true);
                    expect(sp.service.service3.initialized).toBe(true);
                });
            });
        });
    });

});