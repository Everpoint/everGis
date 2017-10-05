import {ServiceContainer} from "./ServiceContainer";
import {MapService} from "./MapService";
import {TileLayer} from "../../../sGis/source/TileLayer";
import {TileScheme} from "../../../sGis/source/TileScheme";
import {wgs84} from "../../../sGis/source/Crs";
import {Point} from "../../../sGis/source/Point";

class TileService extends MapService {
    private _tileScheme: TileScheme;
    constructor(name, connector, serviceInfo) {
        super(name, connector, serviceInfo);
        this._setLayer();
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
    let scheme = {
        tileWidth: tileInfo.rows,
        tileHeight: tileInfo.cols,
        dpi: tileInfo.dpi,
        origin: [tileInfo.origin.x, tileInfo.origin.y],
        reversedY: tileInfo.reversedY,
        levels: [],
        limits: null
    };

    if (tileInfo.boundingRectangle) {
        let {MinX, MinY, MaxX, MaxY} = tileInfo.boundingRectangle;
        if (MinX !== MaxX && MinY !== MaxY) scheme.limits = [MinX, MinY, MaxX, MaxY];
    }

    let projection = wgs84.projectionTo(crs);
    if (projection && scheme.tileWidth) {
        let point1 = new Point([0, -180]).projectTo(crs);
        let point2 = new Point([0, 180]).projectTo(crs);
        var fullWidth = point2.x - point1.x;
    }
    for (let i = 0, len = tileInfo.lods.length; i < len; i++) {
        let resolution = tileInfo.lods[i].resolution;
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
