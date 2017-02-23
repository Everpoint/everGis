sGis.module('sp.services.TileService', [
    'sp.services.MapService',
    'TileLayer',
    'TileScheme',
    'sp.services.ServiceContainer'
], (MapService, TileLayer, TileScheme, ServiceContainer) => {

    'use strict';

    class TileService extends MapService {
        constructor(name, connector, serviceInfo) {
            super(name, connector, serviceInfo);
            this._setLayer();
            this._subscribeForNotifications();
        }
        
        _setLayer() {
            if (this.serviceInfo.tileInfo) {
                var tileScheme = getTileScheme(this.serviceInfo.tileInfo, this.crs);
            }

            this._tileScheme = tileScheme;
            this._layer = new TileLayer(this._getUrl(), { tileScheme: tileScheme, crs: this.crs, isDisplayed: this.isDisplayed });
        }

        get tileScheme() { return this._tileScheme; }

        _getUrl() {
            if (this.serviceInfo.sourceUrl) {
                return this.serviceInfo.sourceUrl.replace(/^https?:/, '');
            } else {
                return this.url + 'tile/{z}/{y}/{x}' + (this.connector.sessionId ? '?_sb=' + this.connector.sessionId : '');
            }
        }
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

    ServiceContainer.register(serviceInfo => serviceInfo.serviceType === 'DataView' && serviceInfo.capabilities.indexOf('tile') !== -1, TileService);

    return TileService;

});