sGis.module('spatialProcessor.ClusterLayer', [
    'Point',
    'feature.Point',
    'feature.Polygon',
    'spatialProcessor.ClusterSymbol',
    'Layer',
    'utils'
], function(Point, PointF, Polygon, ClusterSymbol, /** {sGis.Layer} */ Layer, /** {sGis.utils} */ utils) {

    var defaults = {
        sessionId: null,
        clusterSize: 100,
        algorithm: 'grid',
        delayedUpdate: true,
        aggregationParameters: []
    };

    /**
     * @class sGis.spatialProcessor.ClusterLayer
     * @extends sGis.Layer
     */
    class ClusterLayer extends Layer {
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

            if (this._xhr) {
                this._updateRequest = [bbox, resolution];
                return;
            }

            var url = this._getUrl(bbox, resolution);
            this._xhr = utils.ajax({
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
                features.push(new PointF(cluster.Center, {crs: crs, symbol: this._symbol, objectCount: cluster.ObjectCount, aggregations: cluster.Aggregations, setNo: cluster.SetNo, bouningPolygon: new Polygon(cluster.BoundingGeometry, {crs: crs} )}));
            });

            this._features = features;
            this.fire('propertyChange', 'features');
        }

        get symbol() { return this._symbol; }
        set symbol(symbol) {
            this._symbol = symbol;
            this._features.forEach((feature) => { feature.symbol = symbol; });
        }

        redraw() {
           delete this._currentBbox;
           this.fire('propertyChange', 'features');
        }
    }

    utils.extend(ClusterLayer.prototype, defaults);

    return ClusterLayer;
});

sGis.module('spatialProcessor.ClusterSymbol', [
    'utils',
    'symbol.point.Point',
    'render.Arc'
], function(utils, PointSymbol, Arc) {

    class ClusterSymbol extends PointSymbol {
        renderFunction(feature, resolution, crs) {
            let renders = super.renderFunction.call(this, feature, resolution, crs);

            this.classifiers.forEach((classifier, index) => {
                this._applyClassifier(renders, classifier, feature, index);
            });

            return renders;
        }

        _applyClassifier(renders, classifier, feature, index) {
            if (classifier.propertyName === 'clusterSize') {
                this._applySizeClassifier(renders, classifier, feature);
            } else if (classifier.propertyName === 'fillColor' && classifier.values.length > 0 && classifier.values[0].attributeValue !== 'undefined') {
                this._applyChartClassifier(renders, classifier, feature.objectCount, feature.aggregations[index]);
            }
        }

        _applySizeClassifier(renders, classifier, feature) {
            if (!classifier.values || classifier.values.length < 2) return;
            let minSize = classifier.values[0].propertyValue;
            let maxSize = classifier.values[1].propertyValue;
            let maxCount = classifier.values[1].attributeValue;
            renders[0].radius = (minSize + feature.objectCount / maxCount * (maxSize - minSize)) / 2;
        }

        _applyChartClassifier(renders, classifier, totalCount, aggr) {
            if (!aggr) return;
            let startAngle = 0;
            let pies = aggr.filter(x => x.count > 0).map(x => {
                let angle = x.count / totalCount * Math.PI * 2;
                let fillColor = classifier.values.find(val => val.attributeValue === aggr.value).propertyValue;

                let arc = new Arc(renders[0].position, {
                    fillColor: fillColor,
                    strokeColor: this.strokeColor,
                    strokeWidth: this.strokeWidth,
                    radius: this.size / 2,
                    startAngle: startAngle,
                    endAngle: startAngle + angle,
                    isSector: true
                });

                startAngle += angle;
                return arc;
            });

            renders.splice(0, 0, pies);
        }
    }

    Object.assign(ClusterSymbol.prototype, {
        clusterSize: 64,
        classifiers: []
    });



    // var symbolDefaults = {
    //     maxCount: 1024,
    //     minSize: 24,
    //     maxSize: 72,
    //     haloColor: 'rgba(0, 183, 255, 0.3)',
    //     mainColor: 'rgba(0, 205, 255, 0.78)',
    //     haloK: 1.5
    // };
    //
    // class ClusterSymbol extends PointSymbol {
    //     constructor() {
    //         super();
    //
    //         this.strokeColor = '#003d63';
    //         this.fillColor = 'rgba(0, 183, 255, 0.78)';
    //     }
    //
    //     renderFunction(feature, resolution, crs) {
    //         var points = super.renderFunction(feature, resolution, crs);
    //         if (feature.objectCount === 1) return points;
    //
    //         var k = Math.log2(feature.objectCount) / Math.log2(this.maxCount);
    //         if (k > 1) k = 1;
    //         var size = this.minSize + (this.maxSize - this.minSize) * k;
    //         points[0].radius = size / 2;
    //         points[0].strokeColor = 'transparent';
    //         points[0].fillColor = this.haloColor;
    //
    //         points[1] = new Arc(points[0].center, { radius: points[0].radius / this.haloK, fillColor: this.mainColor, strokeColor: 'transparent' });
    //         return points;
    //     }
    // }
    //
    // utils.extend(ClusterSymbol.prototype, symbolDefaults);

    return ClusterSymbol;

});
