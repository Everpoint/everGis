sGis.module('spatialProcessor.mapService.TileService', [
    'spatialProcessor.MapService',
    'TileLayer',
    'TileScheme'
], (MapService, TileLayer, TileScheme) => {

    'use strict';

    class TileService extends MapService {
        constructor(connector, serviceInfo) {
            super(connector, serviceInfo);
            this._setLayer();
            this._subscribeForNotifications();
        }
        
        _setLayer() {
            if (this.serviceInfo.tileInfo) {
                var tileScheme = getTileScheme(this.serviceInfo.tileInfo, this.crs);
            }

            this._tileScheme = tileScheme;
            this._layer = new TileLayer(this.url + 'tile/{z}/{y}/{x}?_sb=' + this.connector.sessionId, { tileScheme: tileScheme, crs: this.crs, isDisplayed: this.isDisplayed });
        }

        get tileScheme() { return this._tileScheme; }
    }

    function getTileScheme(tileInfo, crs) {
        var scheme = {
            tileWidth: tileInfo.rows,
            tileHeight: tileInfo.cols,
            dpi: tileInfo.dpi,
            origin: [tileInfo.origin.x, tileInfo.origin.y],
            levels: []
        };

        var projection = sGis.CRS.wgs84.projectionTo(crs);
        if (projection && scheme.tileWidth) {
            var point1 = new sGis.Point([0, -180]).projectTo(crs);
            var point2 = new sGis.Point([0, 180]).projectTo(crs);
            var fullWidth = point2.x - point1.x;
        }
        for (var i = 0, len = tileInfo.lods.length; i < len; i++) {
            var resolution = tileInfo.lods[i].resolution;
            scheme.levels[i] = {
                resolution: resolution,
                scale: tileInfo.lods[i].scale,
                indexCount: Math.round(fullWidth / resolution / scheme.tileWidth),
                zIndex: tileInfo.lods[i].level
            };
        }

        return new TileScheme(scheme);
    }

    MapService.register('TileService', TileService);

    return TileService;

});