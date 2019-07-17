import {Layer} from "@evergis/sgis/es/layers/Layer";
import {DynamicLayer} from "@evergis/sgis/es/layers/DynamicLayer";
import {ClusterLayer} from "./ClusterLayer";
import {SpDynamicLayer} from "./SpDynamicLayer";
import {Bbox} from "@evergis/sgis/es/Bbox";
import {Render} from "@evergis/sgis/es/renders/Render";
import {ClusterSymbol} from "./ClusterSymbol";

export class DataViewLayer extends Layer {
    delayedUpdate = true;
    private _service: any;
    private _dynamicLayer: DynamicLayer;
    private _resolutionGroups: any;

    constructor(service) {
        super();
        this._service = service;

        this._dynamicLayer = new SpDynamicLayer(this._service);
        this._dynamicLayer.on('propertyChange', () => this.redraw());

        service.on('dataFilterChange', this._updateDataFilter.bind(this));
        this._updateDataFilter();

        this.redraw = this.redraw.bind(this);
    }

    _updateDataFilter() {
        this._resolutionGroups = [];
        let filter = this._service.dataFilter;

        if (filter) this._fillResolutionGroups(filter);
        this.redraw();
    }

    _fillResolutionGroups(filter) {
        if (filter.childFilters && filter.childFilters.length > 0) {
            filter.childFilters.forEach(x => this._fillResolutionGroups(x));
            return;
        }

        if (filter.symbol && filter.symbol instanceof ClusterSymbol) {
            let layer = new ClusterLayer(this._service.url, this._service.connector.sessionId, filter.symbol);
            layer.opacity = this.opacity;
            layer.aggregationParameters = [{ filters: filter.condition, aggregations: filter.aggregations && filter.aggregations.join(',')}];
            if (filter.symbol.gridSize) layer.clusterSize = filter.symbol.gridSize;
            layer.algorithm = 'adjustedGrid';
            layer.on('propertyChange', () => {
                this.redraw();
            });
            this._resolutionGroups.push({ minResolution: filter.minResolution, maxResolution: filter.maxResolution, layer: layer });
        } else {
            this._resolutionGroups.push({ minResolution: filter.minResolution, maxResolution: filter.maxResolution, layer: this._dynamicLayer });
        }
    }

    getRenders(bbox: Bbox, resolution: number): Render[] {
        if (!this.checkVisibility(resolution)) return [];

        if (this._resolutionGroups.length === 0) return this._dynamicLayer.getRenders(bbox, resolution);

        let renders: Render[] = [];
        this._resolutionGroups.forEach(group => {
            if (group.minResolution > 0 && group.minResolution > resolution || group.maxResolution > 0 && group.maxResolution < resolution) return;

            renders = renders.concat(group.layer.getRenders(bbox, resolution));
        });

        return renders;
    }

    get opacity() { return this._dynamicLayer.opacity; }
    set opacity(opacity) {
        this._dynamicLayer.opacity = opacity;
        this._resolutionGroups.forEach(group => group.layer.opacity = opacity);
        this.fire('propertyChange', {property: 'opacity'});
    }

    forceUpdate() { this._dynamicLayer.forceUpdate(); }

    get updateProhibited() {
        for (let i = 0; i < this._resolutionGroups.length; i++) {
            if (this._resolutionGroups[i].layer.updateProhibited) return true;
        }
        return false;
    }

    get childLayers() {
        return this._resolutionGroups.map(group => group.layer);
    }
}
