import {TileLayer, TileLayerConstructorParams} from "sgis/layers/TileLayer";

export class ConditionalTileLayer extends TileLayer {
    private _ts: number;
    private _condition?: string;
    private readonly _serviceUrl: string;
    private readonly _sessionId: string;

    constructor(serviceUrl: string, sessionId: string, params: TileLayerConstructorParams) {
        super(serviceUrl, params);

        this._serviceUrl = serviceUrl;
        this._sessionId = sessionId;
        this._setTs();
    }

    _setTs(): void {
        this._ts = Date.now();
    }

    getTileUrl(x: number, y: number, z: number): string {
        return `${this._serviceUrl}tile/${z}/${y}/${x}?_ts=${this._ts}${this._sessionId ? '&_sb=' + this._sessionId : ''}${this.condition ? '&condition=' + this.escapedCondition : ''}`;
    }

    get condition(): string {
        return this._condition;
    }
    set condition(value: string) {
        if (this._condition === value) return;
        this._condition = value;
        this.forceUpdate();
    }

    get escapedCondition(): string {
        return encodeURIComponent(this.condition);
    }

    forceUpdate(): void {
        this._setTs();
        this.clearCache();
        this.redraw();
    }
}