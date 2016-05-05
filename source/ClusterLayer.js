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
        delayedUpdate: true
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
            if (!this._display) return [];
            if (this.resolutionLimits[0] >= 0 && resolution < this.resolutionLimits[0] || this.resolutionLimits[1] > 0 && resolution > this.resolutionLimits[1]) return [];

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
                    '&bbox=' +
                        bbox.p[0].x + '%2C' +
                        bbox.p[0].y + '%2C' +
                        bbox.p[1].x + '%2C' +
                        bbox.p[1].y +
                    '&algorithm=' + this.algorithm +
                    '&aggregationParameters=' + '[]' +
                    '&_sb=' + this.sessionId;
        }

        _setFeatures(clusters, crs) {
            var features = [];
            clusters.forEach((cluster) => {
                features.push(new PointF(cluster.Center, {crs: crs, symbol: this._symbol, objectCount: cluster.ObjectCount, aggregation: cluster.Aggregations, bouningPolygon: new Polygon(cluster.BoundingGeometry, {crs: crs} )}));
            });

            this._features = features;
            this.fire('propertyChange', 'features');
        }
    }

    utils.extend(ClusterLayer.prototype, defaults);

    return ClusterLayer;
});

sGis.module('spatialProcessor.ClusterSymbol', [
    'utils',
    'symbol.point',
    'geom.Arc'
], function(utils, pointSymbols, Arc) {

    var symbolDefaults = {
        maxCount: 1024,
        minSize: 24,
        maxSize: 72,
        haloColor: 'rgba(0, 183, 255, 0.3)',
        mainColor: 'rgba(0, 205, 255, 0.78)',
        haloK: 1.5
    };

    class ClusterSymbol extends pointSymbols.Point {
        constructor() {
            super();

            this.strokeColor = '#003d63';
            this.fillColor = 'rgba(0, 183, 255, 0.78)';
        }

        renderFunction(feature, resolution, crs) {
            var points = super.renderFunction(feature, resolution, crs);
            if (feature.objectCount === 1) return points;

            var k = Math.log2(feature.objectCount) / Math.log2(this.maxCount);
            if (k > 1) k = 1;
            var size = this.minSize + (this.maxSize - this.minSize) * k;
            points[0].radius = size / 2;
            points[0].strokeColor = 'transparent';
            points[0].fillColor = this.haloColor;

            points[1] = new Arc(points[0].center, { radius: points[0].radius / this.haloK, fillColor: this.mainColor, strokeColor: 'transparent' });
            return points;
        }
    }

    utils.extend(ClusterSymbol.prototype, symbolDefaults);

    return ClusterSymbol;

});