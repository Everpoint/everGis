sGis.module('spatialProcessor.mapService.TileService', [
    'spatialProcessor.MapService',
    'TileLayer',
    'TileScheme',
    'Bbox'
], (MapService, TileLayer, TileScheme, Bbox) => {

    'use strict';

    class TileService extends MapService {
        constructor(connector, name, serviceInfo) {
            super(connector, name, serviceInfo);
            this._setLayer();
        }
        
        _setLayer() {
            if (this.serviceInfo.tileInfo) {
                var tileScheme = getTileScheme(this.serviceInfo.tileInfo, this.crs);
            }

            this._tileScheme = tileScheme;
            this._layer = new TileLayer(this.url + 'tile/{z}/{y}/{x}?_sb=' + this.connector.sessionId, { tileScheme: tileScheme, crs: this.crs, isDisplayed: this.isDisplayed });
        }

        get fullExtent() {
            if (!this.serviceInfo.fullExtent) return null;
            return new Bbox([this.serviceInfo.fullExtent.xmin, this.serviceInfo.fullExtent.ymin], [this.serviceInfo.fullExtent.xmax, this.serviceInfo.fullExtent.ymax], this.crs);
        }

        get initialExtent() {
            if (!this.serviceInfo.initialExtent) return null;
            return new Bbox([this.serviceInfo.initialExtent.xmin, this.serviceInfo.initialExtent.ymin], [this.serviceInfo.initialExtent.xmax, this.serviceInfo.initialExtent.ymax], this.crs);
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