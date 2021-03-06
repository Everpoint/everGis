import {ServiceContainer} from "./ServiceContainer";
import {MapService} from "./MapService";
import {TileLayer} from "@evergis/sgis/layers/TileLayer";
import {TileScheme} from "@evergis/sgis/TileScheme";
import {wgs84} from "@evergis/sgis/Crs";
import {Point} from "@evergis/sgis/Point";
import {LayerGroup} from "@evergis/sgis/LayerGroup";
import {ConditionalTileLayer} from "../layers/ConditionalTileLayer";
import {ajaxp} from "../utils";
import {DataFilter} from "../DataFilter";

export class TileService extends MapService {
    private _tileScheme: TileScheme;
    private _activeTileSets: number[] | null = null;
    private _condition?: string;

    constructor(name, connector, serviceInfo) {
        super(name, connector, serviceInfo);
        this._setLayer();
    }

    _setLayer() {
        if (this.serviceInfo.tileInfo) {
            this._tileScheme = getTileScheme(this.serviceInfo.tileInfo, this.crs);
        }

        let layerParams = {tileScheme: this._tileScheme, crs: this.crs, isDisplayed: this.isDisplayed};

        if (!this._activeTileSets && this.serviceInfo.attributesDefinition) {
            this._layer = new ConditionalTileLayer(this.url, this.connector.sessionId, layerParams);
            return;
        }

        if (!this._activeTileSets) {
            this._layer = new TileLayer(this._getUrl(), layerParams);
        } else {
            let layers = this._activeTileSets.map(setId => new TileLayer(this._getUrl(setId), layerParams));
            this._layer = new LayerGroup(layers);
        }
    }

    get tileScheme() { return this._tileScheme; }

    _getUrl(setId: number = -1) {
        if (this.serviceInfo.sourceUrl && setId < 0) {
            return this.serviceInfo.sourceUrl.replace(/^https?:/, '');
        } else {
            let url = this.url + 'tile/{z}/{y}/{x}' + (this.connector.sessionId ? '?_sb=' + this.connector.sessionId : '');
            if (setId >=0) {
                url += this.connector.sessionId ? '&' : '?';
                url += `tileSetId=${setId}`;
            }
            return url;
        }
    }

    get activeTileSets(): number[] { return this._activeTileSets; }
    set activeTileSets(sets: number[] | null) {
        if (!sets || sets.length === 0) sets = null;
        this._activeTileSets = sets;
        let currLayer = this._layer;
        this._setLayer();
        this.fire('layerChange', {prevLayer: currLayer});

        let condition = "";
        if (sets !== null && sets.length > 0) {
            let idField = this.attributesDefinition.idField;
            condition = `${idField} in [${sets.join(',')}]`;
        }

        let filter = new DataFilter({condition});

        let data = filter ? 'filterDescription=' + encodeURIComponent(JSON.stringify(filter.serialize())) : '';
        ajaxp({
            url: `${this.url}setTempDataFilter?_sb=${this.connector.sessionId}`,
            type: 'POST',
            data: data
        });

    }

    get condition(): string { return this._condition; }
    set condition(condition: string) {
        this._condition = condition;
    }
}

function getTileScheme(tileInfo, crs) {
    let scheme: any = {
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
