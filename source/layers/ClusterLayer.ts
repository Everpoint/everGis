import {Layer} from "sgis/dist/Layer";
import {PointSymbol} from "sgis/dist/symbols/point/Point";
import {VectorLabel} from "sgis/dist/renders/VectorLabel";
import {ajax} from "../utils";
import {PointFeature} from "sgis/dist/features/Point";
import {Polygon} from "sgis/dist/features/Polygon";
import * as symbolSerializer from "sgis/dist/serializers/symbolSerializer";
import {Arc} from "sgis/dist/renders/Arc";

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

    getFeatures(bbox, resolution) {
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
        var features = [];
        clusters.forEach((cluster) => {
            features.push(new PointFeature(cluster.Center, {crs, symbol: this._symbol}, {
                    objectCount: cluster.ObjectCount,
                    aggregations: cluster.Aggregations,
                    setNo: cluster.SetNo,
                    ids: cluster.Ids,
                    boundingPolygon: new Polygon(cluster.BoundingGeometry, {crs: crs} )}
                )
            );
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

export class ClusterSymbol extends PointSymbol {
    size = 50;

    fillColor = 'rgba(0, 183, 255, 1)';
    strokeColor = 'white';
    strokeWidth = 2;

    clusterSize = 10;

    minSize = 50;
    maxSize = 50;
    sizeAggregationIndex = -1;
    sizeAggregationMaxValue = 0;

    pieAggregationIndex = -1;
    _pieGroups = {};

    labelText = null;
    _singleObjectSymbol = null;
    gridSize = 100;

    renderFunction(feature, resolution, crs) {
        if (this.singleObjectSymbol && feature.objectCount === 1) return this.singleObjectSymbol.renderFunction(feature, resolution, crs);

        let renders = super.renderFunction.call(this, feature, resolution, crs);
        this._applySizeClassifier(renders[0], feature);

        if (this.pieAggregationIndex >= 0) {
            let pieChart = this._applyChartClassifier(feature, renders[0].center, renders[0].radius);
            if (pieChart && pieChart.length > 0) {
                renders[0].radius -= this.clusterSize;
                renders = pieChart.concat(renders);
            }
        }

        if (this.labelText) renders.push(this._renderLabel(renders[0].center, feature));

        return renders;
    }

    _renderLabel(position, feature) {
        let text = this.labelText.replace('{__qty}', feature.objectCount || '');
        return new VectorLabel(position, text, {});
    }

    _applySizeClassifier(circleRender, feature) {
        if (feature.objectCount === undefined || !this.minSize || !this.maxSize || !this.sizeAggregationMaxValue) return;

        let minSize = this.minSize;
        let maxSize = this.maxSize;
        let maxCount = this.sizeAggregationMaxValue;
        let value = this.sizeAggregationIndex <= 0 ? feature.objectCount : feature.aggregations[this.sizeAggregationIndex].value;
        let size = Math.min(this.maxSize, (minSize + value / maxCount * (maxSize - minSize)));
        circleRender.radius = size / 2;
    }

    _applyChartClassifier(feature, center, radius) {
        if (!feature.aggregations || !feature.aggregations[this.pieAggregationIndex]) return;
        let aggr = feature.aggregations[this.pieAggregationIndex];
        if (!aggr) return;

        let totalCount = aggr.reduce((sum, item) => sum + item.count, 0);
        if (!totalCount) return;

        let startAngle = -Math.PI / 2;
        let pies = aggr.filter(x => x.count > 0).map(x => {
            let angle = x.count / totalCount * Math.PI * 2;
            let fillColor = this._pieGroups[x.value] || this.fillColor;

            let arc = new Arc(center, {
                fillColor: fillColor,
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                radius: radius,
                startAngle: startAngle,
                endAngle: startAngle + angle,
                isSector: true
            });

            startAngle += angle;
            return arc;
        });

        return pies;
    }

    resetClassification() {
        this.sizeAggregationIndex = -1;
        this.sizeAggregationMaxValue = 1;
        this.pieAggregationIndex = -1;
        this._pieGroups = {};
    }

    addPieGroup(attributeValue, color) {
        this._pieGroups[attributeValue] = color;
    }

    clone() {
        return new ClusterSymbol(this.serialize());
    }

    serialize() {
        return {
            size: this.size,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            clusterSize: this.clusterSize,
            minSize: this.minSize,
            maxSize: this.maxSize,
            sizeAggregationIndex: this.sizeAggregationIndex,
            sizeAggregationMaxValue: this.sizeAggregationMaxValue,
            pieAggregationIndex: this.pieAggregationIndex,
            _pieGroups: this._pieGroups,
            labelText: this.labelText,
            singleObjectSymbol: this.singleObjectSymbol && (this.singleObjectSymbol.serialize && this.singleObjectSymbol.serialize() || symbolSerializer.serialize(this.singleObjectSymbol)),
            gridSize: this.gridSize
        };
    }

    get singleObjectSymbol() { return this._singleObjectSymbol; }
    set singleObjectSymbol(symbol) {
        if (!symbol || symbol instanceof Symbol) {
            this._singleObjectSymbol = symbol;
        } else {
            this._singleObjectSymbol = symbolSerializer.deserialize(symbol);
        }
    }
}

Object.assign(ClusterSymbol.prototype, {

});
