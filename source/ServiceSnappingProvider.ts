import {Coordinates} from "sgis/dist/baseTypes";
import {DataViewService} from "./services/DataViewService";
import {Map} from "sgis/dist/Map";
import {ajaxp, message} from "./utils";
import {SnappingProviderBase} from "sgis/dist/controls/snapping/SnappingProviderBase";
import {SnappingData} from "sgis/dist/controls/snapping/SnappingMethods";
import {ISnappingProvider} from "sgis/dist/controls/snapping/ISnappingProvider";

const TILE_SIZE = 512;
const CACHE_SIZE = 64;

export class ServiceSnappingProvider extends SnappingProviderBase {
    private _tileCache: SnappingTileCache;
    private _service: DataViewService;

    constructor(service: DataViewService, map: Map) {
        super(map);
        this._service = service;
        this._tileCache = new SnappingTileCache();

        this._service.on('edit dataFilterChange', this._clearCache.bind(this));
    }

    protected _getSnappingData(point: Coordinates): SnappingData {
        if (!this._canSnap() || !this._service.isDisplayed) return {points: [], lines: []};

        this._updateSnappingSets(point);
        const snappingTiles = this._getSnappingTiles(point);
        let points = [];
        let lines = [];
        snappingTiles.forEach(tile => {
            const snappingData = this._tileCache.get(tile);
            if (!snappingData) return;

            points = points.concat(snappingData.points);
            lines = lines.concat(snappingData.lines);
        });

        return {points, lines};
    }

    private _updateSnappingSets(point) {
        const snappingTiles = this._getSnappingTiles(point);
        snappingTiles.forEach(tile => {
            if (!this._tileCache.has(tile)) {
                this._tileCache.set(tile, {points: [], lines: []});
                this._loadSnappingTile(tile);
            }
        });
    }

    private _getSnappingTiles(point: Coordinates): TileIndex[] {
        const resolution = this._map.resolution;
        const tileSize = resolution * TILE_SIZE;
        const x = Math.floor(point[0] / tileSize);
        const y = Math.floor(point[1] / tileSize);
        const z = this._map.tileScheme.getLevel(resolution);

        const tiles = [];
        const offset = resolution * this.snappingDistance;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                let borders = [(x + i)*tileSize - offset, (y + j) * tileSize - offset, (x + i + 1) * tileSize + offset, (y + j + 1) * tileSize + offset];
                if (point[0] > borders[0] && point[0] < borders[2] && point[1] > borders[1] && point[1] < borders[3]) tiles.push([x + i, y + j, z]);
            }
        }

        return tiles;
    }

    private _loadSnappingTile(tile: TileIndex) {
        const resolution = this._map.resolution;
        const tileSize = TILE_SIZE * resolution;
        const bbox = [tile[0] * tileSize, tile[1] * tileSize, (tile[0] + 1) * tileSize, (tile[1] + 1) * tileSize];
        const params = {bbox: bbox.join(','), resolution, bboxSR: this._map.crs.toString(), snappingDistance: this.snappingDistance, _sb: undefined};

        let paramsString = Object.keys(params).filter(key => params[key] !== undefined).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
        if (this._service.connector.sessionId) paramsString += this._service.connector.sessionSuffix;

        ajaxp({url: `${this._service.url}snapping?${paramsString}`})
            .then(([response]) => {
                const data = JSON.parse(response);
                this._tileCache.set(tile, data);
            }).catch(err => {
                message(`Failed to load snapping data: ${err}`);
            });
    }

    private _clearCache() {
        this._tileCache.clear();
    }

    private _canSnap() { return this._service.serviceInfo && this._service.serviceInfo.capabilities && this._service.serviceInfo.capabilities.indexOf('snapping') !== -1; }

    get service() { return this._service; }

    clone(): ISnappingProvider {
        return new ServiceSnappingProvider(this.service, this._map);
    }
}

class SnappingTileCache {
    _tiles: {[key: string]: SnappingData} = {};
    _order: string[] = [];

    set(tile: TileIndex, data: SnappingData): void {
        const key = this._getKey(tile);
        this._tiles[key] = data;
        this._order.push(key);

        this._trim();
    }

    private _trim() {
        while (this._order.length > CACHE_SIZE) {
            const key = this._order.shift();
            delete this._tiles[key];
        }
    }

    clear(): void {
        this._tiles = {};
        this._order = [];
    }

    get(tile: TileIndex): SnappingData | null {
        const key = this._getKey(tile);
        return this._tiles[key] || null;
    }

    private _getKey(tile: TileIndex): string {
        return tile.join(';');
    }

    has(tile: TileIndex): boolean {
        return this._tiles[this._getKey(tile)] !== undefined;
    }
}

type TileIndex = [number, number, number];