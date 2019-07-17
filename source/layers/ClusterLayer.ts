import {Layer} from "@evergis/sgis/es/layers/Layer";
import {ajax} from "../utils";
import {Polygon} from "@evergis/sgis/es/features/Polygon";
import {Bbox} from "@evergis/sgis/es/Bbox";
import {Render} from "@evergis/sgis/es/renders/Render";
import {Feature} from "@evergis/sgis/es/features/Feature";
import {StaticVectorImageRender} from "@evergis/sgis/es/renders/StaticVectorImageRender";
import {ClusterSymbol} from "./ClusterSymbol";
import {ClusterFeature} from "./ClusterFeature";

export class ClusterLayer extends Layer {
    _updateRequest: any[];
    _currentBbox: any;
    _symbol: ClusterSymbol;
    _features: any[];
    _serviceUrl: any;
    sessionId = null;
    clusterSize = 100;
    algorithm = 'grid';
    delayedUpdate = true;
    aggregationParameters = [];

    private _xhr: any;

    constructor(serviceUrl, sessionId, symbol = new ClusterSymbol()) {
        super();

        this._serviceUrl = serviceUrl;
        this.sessionId = sessionId;
        this._features = [];
        this._symbol = symbol;
    }

    getRenders(bbox: Bbox, resolution: number): Render[] {
        let features = this._getFeatures(bbox, resolution);
        let renders: Render[] = [];
        features.forEach(feature => {
            renders = renders.concat(feature.render(resolution, bbox.crs));
        });
        renders.forEach(render => (<StaticVectorImageRender>render).opacity = this.opacity);
        return renders;
    }

    private _getFeatures(bbox, resolution): Feature[] {
        if (!this.checkVisibility(resolution)) return [];

        this._update(bbox, resolution);

        var features = [];
        this._features.forEach((feature) => {
            if (!feature.crs.projectionTo(bbox.crs)) return;

            var featureBbox = feature.bbox;
            if (!featureBbox || !bbox.intersects(featureBbox)) return;

            features.push(feature);
        });

        return features;
    }

    _update(bbox, resolution) {
        if (this._currentBbox && bbox.equals(this._currentBbox)) return;

        this.updateProhibited = true;
        if (this._xhr) {
            this._updateRequest = [bbox, resolution];
            return;
        }

        var url = this._getUrl(bbox, resolution);
        this._xhr = ajax({
            url: url,
            type: 'GET',
            success: (response) => {
                try {
                    var clusters = JSON.parse(response);
                    this._setFeatures(clusters, bbox.crs);
                    this._currentBbox = bbox;
                } catch(e) {
                    this._xhr = null;
                    return;
                }

                this.updateProhibited = false;

                if (this._updateRequest) {
                    this._update(this._updateRequest[0], this._updateRequest[1]);
                }

                this._xhr = null;
            },
            error: () => {
                this._xhr = null;
            }
        });

        this._updateRequest = null;
    }

    _getUrl(bbox, resolution) {
        return this._serviceUrl + 'clusters?' +
                'resolution=' + resolution +
                '&clusterSize=' + this.clusterSize +
                '&bbox=' + bbox.coordinates.join('%2C') +
                '&algorithm=' + this.algorithm +
                '&aggregationParameters=' + encodeURIComponent(JSON.stringify(this.aggregationParameters)) +
                (this.sessionId ? '&_sb=' + this.sessionId : '');
    }

    _setFeatures(clusters, crs) {
        let features = [];
        clusters.forEach((cluster) => {
            features.push(new ClusterFeature(cluster.Center, {
                crs,
                symbol: this._symbol,
                objectCount: cluster.ObjectCount,
                aggregations: cluster.Aggregations,
                setNo: cluster.SetNo,
                ids: cluster.Ids,
                boundingPolygon: new Polygon(cluster.BoundingGeometry, {crs: crs} )
            }));
        });

        this._features = features;
        this.fire('propertyChange', { property: 'features' });
    }

    get symbol() { return this._symbol; }
    set symbol(symbol) {
        this._symbol = symbol;
        this._features.forEach((feature) => { feature.symbol = symbol; });
    }

    redraw() {
       delete this._currentBbox;
       this.fire('propertyChange');
    }
}

